const express = require('express');
const Stripe = require('stripe');
const { randomInt } = require('crypto');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const TIER_PRICES = {
  Pro: Number(process.env.PRICE_PRO || 2999),
  Premium: Number(process.env.PRICE_PREMIUM || 4999),
};
function publicUrl() {
  const base = process.env.APP_URL || (process.env.RAILWAY_PUBLIC_DOMAIN && `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
  if (!base && process.env.NODE_ENV === 'production') throw new Error('Public app URL is not configured');
  return (base || `http://localhost:${process.env.PORT || 3001}`).replace(/\/$/, '');
}

router.post('/checkout', authenticateToken, async (req, res) => {
  const { tier } = req.body;
  if (!['Pro', 'Premium'].includes(tier)) return res.status(400).json({ error: 'Valid tier (Pro or Premium) required' });
  try {
    const userId = req.user.id;
    const { rows } = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    const base = publicUrl();
    const metadata = { app: 'back-to-me', userId: String(userId), tier };
    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Back to Me - ${tier} Plan`, description: `30-day ${tier} program access` },
          unit_amount: TIER_PRICES[tier],
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/cancel`,
      customer_email: rows[0].email,
      client_reference_id: String(userId),
      metadata,
      payment_intent_data: { metadata },
      integration_identifier: `back-to-me-${Array.from({length: 8}, () => String.fromCharCode(97 + randomInt(26))).join('')}`,
    });
    await pool.query(
      `INSERT INTO subscriptions (user_id, tier, stripe_session_id, status)
       VALUES ($1, $2, $3, 'pending') ON CONFLICT (stripe_session_id) DO NOTHING`,
      [userId, tier, session.id]
    );
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[STRIPE] Checkout failed:', err.type || err.code || 'internal_error');
    res.status(500).json({ error: 'Unable to create checkout' });
  }
});

async function processSession(event) {
  const session = event.data.object;
  if (session.metadata?.app !== 'back-to-me') return;
  const userId = Number(session.metadata.userId);
  const tier = session.metadata.tier;
  if (!Number.isSafeInteger(userId) || userId <= 0 || !['Pro', 'Premium'].includes(tier) || session.mode !== 'payment') {
    throw new Error('Invalid checkout metadata');
  }
  if (event.type === 'checkout.session.async_payment_failed') {
    await pool.query(`UPDATE subscriptions SET status = 'failed' WHERE stripe_session_id = $1 AND status = 'pending'`, [session.id]);
    return;
  }
  if (session.payment_status !== 'paid') return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // This insert also handles a webhook arriving before the checkout request saves its session.
    await client.query(`INSERT INTO subscriptions (user_id, tier, stripe_session_id, status)
      VALUES ($1, $2, $3, 'pending') ON CONFLICT (stripe_session_id) DO NOTHING`, [userId, tier, session.id]);
    const { rows } = await client.query('SELECT * FROM subscriptions WHERE stripe_session_id = $1 FOR UPDATE', [session.id]);
    const purchase = rows[0];
    if (purchase.user_id !== userId || purchase.tier !== tier) throw new Error('Checkout does not match purchase');
    if (purchase.status !== 'active') {
      const paymentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
      await client.query(`UPDATE subscriptions SET status = 'active', stripe_subscription_id = $1,
        started_at = NOW(), expires_at = NOW() + INTERVAL '30 days' WHERE id = $2`, [paymentId, purchase.id]);
      await client.query('UPDATE users SET tier = $1 WHERE id = $2', [tier, userId]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function webhookHandler(req, res) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).json({ error: 'Webhook is not configured' });
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }
  try {
    if (['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed'].includes(event.type)) {
      await processSession(event);
    }
    res.json({ received: true });
  } catch (err) {
    console.error('[STRIPE] Fulfillment failed:', err.code || 'internal_error');
    // Return failure so Stripe retries rather than silently losing the purchase.
    res.status(500).json({ error: 'Payment processing failed; retry required' });
  }
}

module.exports = router;
module.exports.webhookHandler = webhookHandler;
module.exports.stripe = stripe;

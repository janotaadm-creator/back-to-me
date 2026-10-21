const express = require('express');
const Stripe = require('stripe');
const { createHash } = require('crypto');
const { plans, planFor } = require('../plans');
const { syncSubscription, recurringEvent } = require('../recurring');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const TIER_PRICES = Object.fromEntries(plans.map(p => [p.id, p.cents]));
router.get('/status', authenticateToken, async (req, res) => {
  if (typeof req.query.session_id !== 'string' || req.query.session_id.length > 255) return res.status(400).json({ error: 'Session required' });
  try {
    const { rows } = await pool.query('SELECT status,tier,expires_at FROM subscriptions WHERE user_id=$1 AND stripe_session_id=$2', [req.user.id, req.query.session_id]);
    if (!rows[0]) return res.status(404).json({ error: 'Purchase not found' });
    res.set('Cache-Control', 'no-store').json(rows[0]);
  } catch { res.status(500).json({ error: 'Unable to check purchase' }); }
});
function publicUrl() {
  const base = process.env.APP_URL || (process.env.RAILWAY_PUBLIC_DOMAIN && `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
  if (!base && process.env.NODE_ENV === 'production') throw new Error('Public app URL is not configured');
  return (base || `http://localhost:${process.env.PORT || 3001}`).replace(/\/$/, '');
}

router.get('/subscription', authenticateToken, async (req,res) => {
  try {
    const rows = (await pool.query('SELECT id,tier,status,expires_at,billing_status,cancel_at_period_end FROM subscriptions WHERE user_id=$1 AND recurring=TRUE ORDER BY created_at DESC', [req.user.id])).rows;
    res.json({ subscriptions: rows });
  } catch { res.status(500).json({ error: 'Unable to load subscription' }); }
});
router.post('/subscription/cancel', authenticateToken, async (req,res) => {
  try {
    const row = (await pool.query('SELECT stripe_subscription_id FROM subscriptions WHERE id=$1 AND user_id=$2 AND recurring=TRUE', [Number.isSafeInteger(req.body.id)?req.body.id:0,req.user.id])).rows[0];
    if (!row) return res.status(404).json({error:'Subscription not found'});
    await stripe.subscriptions.update(row.stripe_subscription_id,{cancel_at_period_end:true});
    await syncSubscription(stripe,row.stripe_subscription_id,req.user.id);
    res.json({success:true});
  } catch { res.status(503).json({error:'Unable to cancel now; please retry'}); }
});
router.post('/checkout', authenticateToken, async (req, res) => {
  const plan = planFor(req.body.tier);
  if (!plan) return res.status(400).json({ error: 'Valid tier required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userId = req.user.id;
    const user = (await client.query('SELECT email FROM users WHERE id=$1 FOR UPDATE',[userId])).rows[0];
    if (!user) { await client.query('ROLLBACK'); return res.status(404).json({error:'User not found'}); }
    const active = (await client.query("SELECT id FROM subscriptions WHERE user_id=$1 AND recurring=TRUE AND billing_status NOT IN ('canceled','incomplete_expired') LIMIT 1",[userId])).rows[0];
    if (active) { await client.query('ROLLBACK'); return res.status(409).json({error:'Manage existing subscription first'}); }
    const pending = (await client.query("SELECT stripe_session_id,tier FROM subscriptions WHERE user_id=$1 AND status='pending' AND recurring=FALSE AND stripe_session_id IS NOT NULL ORDER BY id DESC",[userId])).rows;
    for (const p of pending) {
      const prior = await stripe.checkout.sessions.retrieve(p.stripe_session_id);
      if (prior.status === 'complete') { await client.query('ROLLBACK'); return res.status(409).json({error:'Payment confirmation pending'}); }
      if (prior.status === 'open' && p.tier === plan.id) { await client.query('COMMIT'); return res.json({url:prior.url,sessionId:prior.id}); }
      if (prior.status === 'open') await stripe.checkout.sessions.expire(prior.id);
      await client.query("UPDATE subscriptions SET status='expired' WHERE stripe_session_id=$1",[p.stripe_session_id]);
    }
    const priorId=(await client.query('SELECT COALESCE(MAX(id),0) AS id FROM subscriptions WHERE user_id=$1',[userId])).rows[0].id;
    const idempotencyKey=`btm-monthly-${userId}-${plan.id}-${priorId}-${Math.floor(Date.now()/300000)}`;
    const integrationId=Array.from(createHash('sha256').update(idempotencyKey).digest().subarray(0,8),n=>String.fromCharCode(97+n%26)).join('');
    const base = publicUrl(), metadata = {app:'back-to-me',userId:String(userId),tier:plan.id};
    const session = await stripe.checkout.sessions.create({
      mode:'subscription', customer_email:user.email, client_reference_id:String(userId), metadata,
      subscription_data:{metadata},
      line_items:[{price_data:{currency:'usd',product_data:{name:`Back to Me · ${plan.name}`},unit_amount:plan.cents,recurring:{interval:'month'}},quantity:1}],
      success_url:`${base}/success?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${base}/cancel`,
      integration_identifier:`back-to-me-${integrationId}`,
    },{idempotencyKey});
    await client.query("INSERT INTO subscriptions(user_id,tier,stripe_session_id,status) VALUES($1,$2,$3,'pending') ON CONFLICT(stripe_session_id) DO NOTHING",[userId,plan.id,session.id]);
    await client.query('COMMIT'); res.json({url:session.url,sessionId:session.id});
  } catch(err) { await client.query('ROLLBACK'); console.error('[STRIPE] Checkout failed:',err.type||'internal_error');res.status(503).json({error:'Unable to create checkout'}); }
  finally {client.release();}
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
    if (event.type.startsWith('customer.subscription.') || event.type.startsWith('invoice.') || event.data.object.mode === 'subscription') {
      await recurringEvent(stripe, event);
    } else if (['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed'].includes(event.type)) {
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
module.exports.prices = TIER_PRICES;

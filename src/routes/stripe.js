const express = require('express');
const Stripe = require('stripe');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const TIER_PRICES = {
  'Pro': parseInt(process.env.PRICE_PRO || '2999'), // $29.99
  'Premium': parseInt(process.env.PRICE_PREMIUM || '4999'), // $49.99
};

// POST /api/stripe/checkout - criar sessão checkout
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { tier } = req.body;

    if (!tier || !['Pro', 'Premium'].includes(tier)) {
      return res.status(400).json({ error: 'Valid tier (Pro or Premium) required' });
    }

    // Get user
    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    const userEmail = userResult.rows[0]?.email;

    if (!userEmail) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Back to Me - ${tier} Plan`,
              description: `30-day ${tier} program access`,
            },
            unit_amount: TIER_PRICES[tier],
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'http://localhost:3001/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:3001/cancel',
      customer_email: userEmail,
      metadata: {
        userId: userId.toString(),
        tier: tier,
      },
    });

    // Save session to DB for later verification
    await pool.query(
      `INSERT INTO subscriptions (user_id, tier, stripe_session_id, status)
       VALUES ($1, $2, $3, $4)`,
      [userId, tier, session.id, 'pending']
    );

    res.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    console.error('[STRIPE] Checkout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/stripe/webhook - webhook do Stripe
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[STRIPE] Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle payment_intent.succeeded
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const userId = paymentIntent.metadata?.userId;
    const tier = paymentIntent.metadata?.tier;

    try {
      // Find the pending subscription and activate it
      const subResult = await pool.query(
        `UPDATE subscriptions
         SET status = $1, stripe_subscription_id = $2, started_at = NOW(), expires_at = NOW() + INTERVAL '30 days'
         WHERE stripe_session_id IN (
           SELECT id FROM subscriptions WHERE user_id = $3 AND tier = $4 LIMIT 1
         )
         RETURNING id`,
        ['active', paymentIntent.id, userId, tier]
      );

      // Update user tier
      if (userId && tier) {
        await pool.query('UPDATE users SET tier = $1 WHERE id = $2', [tier, userId]);
      }

      console.log(`[STRIPE] Payment succeeded for user ${userId}, tier ${tier}`);
    } catch (err) {
      console.error('[STRIPE] Error processing payment:', err);
    }
  }

  // Handle payment_intent.payment_failed
  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;
    const userId = paymentIntent.metadata?.userId;

    console.warn(`[STRIPE] Payment failed for user ${userId}`);

    try {
      await pool.query(
        `UPDATE subscriptions SET status = $1 WHERE user_id = $2`,
        ['failed', userId]
      );
    } catch (err) {
      console.error('[STRIPE] Error updating failed subscription:', err);
    }
  }

  res.json({ received: true });
});

module.exports = router;

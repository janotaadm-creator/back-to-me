const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { randomBytes } = require('node:crypto');
const request = require('supertest');
let database, app, pool, stripe, token, userId;
const secret = 'whsec_' + randomBytes(24).toString('hex');
const testPassword = randomBytes(16).toString('hex');
before(async () => {
  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  database = new EmbeddedPostgres({ databaseDir: mkdtempSync(join(tmpdir(), 'back-to-me-test-')), port: 55439,
    user: 'postgres', password: testPassword, persistent: false, postgresFlags: ['-h', '127.0.0.1'], onLog() {}, onError() {} });
  await database.initialise();
  await database.start();
  await database.createDatabase('back_to_me_test');
  process.env.DATABASE_URL = `postgresql://postgres:${testPassword}@127.0.0.1:55439/back_to_me_test`;
  process.env.JWT_SECRET = randomBytes(32).toString('hex');
  process.env.STRIPE_SECRET_KEY = 'sk_test_' + randomBytes(24).toString('hex');
  process.env.STRIPE_WEBHOOK_SECRET = secret;
  process.env.FRONTEND_URL = 'https://frontend.example.com';
  process.env.APP_URL = 'https://api.example.com';
  process.env.NODE_ENV = 'production';
  ({ pool } = require('../src/db'));
  await require('../src/db').initDatabase();
  await require('../src/scripts/seed-cards')();
  app = require('../src/server');
  ({ stripe } = require('../src/routes/stripe'));
});
after(async () => { if (pool) await pool.end(); if (database) await database.stop(); });
function session(id, status = 'paid') { return { id, object: 'checkout.session', mode: 'payment', payment_status: status, payment_intent: 'pi_test_payment', metadata: { app: 'back-to-me', userId: String(userId), tier: 'Pro' } }; }
function webhook(type, data) {
  const payload = JSON.stringify({ id: 'evt_test_' + randomBytes(8).toString('hex'), type, data: { object: data } });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return request(app).post('/api/stripe/webhook').set('Content-Type', 'application/json').set('stripe-signature', signature).send(payload);
}
test('health, complete seed and repeatable startup', async () => {
  await request(app).get('/health').expect(200);
  await require('../src/scripts/seed-cards')();
  assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM cards_metadata')).rows[0].count, 90);
});
test('production CORS allows frontend, not arbitrary origins', async () => {
  const allowed = await request(app).get('/health').set('Origin', process.env.FRONTEND_URL);
  assert.equal(allowed.headers['access-control-allow-origin'], process.env.FRONTEND_URL);
  const denied = await request(app).get('/health').set('Origin', 'https://other.example.com');
  assert.equal(denied.headers['access-control-allow-origin'], undefined);
});
test('signup, login and protected cards work', async () => {
  const signup = await request(app).post('/auth/signup').send({ email: 'test@example.com', password: testPassword }).expect(201);
  token = signup.body.token; userId = signup.body.user.id;
  await request(app).post('/auth/login').send({ email: 'test@example.com', password: testPassword }).expect(200);
  await request(app).get('/api/cards/today').expect(401);
  await request(app).get('/api/cards/today').set('Authorization', `Bearer ${token}`).expect(200);
});
test('checkout uses public returns and binds the purchase to the user', async () => {
  const original = stripe.checkout.sessions.create;
  stripe.checkout.sessions.create = async input => {
    assert.equal(input.success_url, 'https://api.example.com/success?session_id={CHECKOUT_SESSION_ID}');
    assert.equal(input.cancel_url, 'https://api.example.com/cancel');
    assert.equal(input.metadata.userId, String(userId));
    assert.equal(input.payment_method_types, undefined);
    return { id: 'cs_test_checkout', url: 'https://checkout.stripe.com/test' };
  };
  try { await request(app).post('/api/stripe/checkout').set('Authorization', `Bearer ${token}`).send({ tier: 'Pro' }).expect(200); }
  finally { stripe.checkout.sessions.create = original; }
});
test('invalid signature is rejected', async () => {
  await request(app).post('/api/stripe/webhook').send({}).expect(400);
});
test('unpaid completion does not grant access; signed success grants once even concurrently', async () => {
  await webhook('checkout.session.completed', session('cs_test_checkout', 'unpaid')).expect(200);
  assert.equal((await pool.query('SELECT tier FROM users WHERE id=$1', [userId])).rows[0].tier, 'Basico');
  const responses = await Promise.all([webhook('checkout.session.completed', session('cs_test_checkout')), webhook('checkout.session.async_payment_succeeded', session('cs_test_checkout'))]);
  assert.deepEqual(responses.map(r => r.status), [200, 200]);
  let purchase = (await pool.query('SELECT * FROM subscriptions WHERE stripe_session_id=$1', ['cs_test_checkout'])).rows;
  assert.equal(purchase.length, 1); assert.equal(purchase[0].status, 'active');
  const expiry = purchase[0].expires_at.toISOString();
  await webhook('checkout.session.completed', session('cs_test_checkout')).expect(200);
  purchase = (await pool.query('SELECT * FROM subscriptions WHERE stripe_session_id=$1', ['cs_test_checkout'])).rows;
  assert.equal(purchase[0].expires_at.toISOString(), expiry);
  assert.equal((await pool.query('SELECT tier FROM users WHERE id=$1', [userId])).rows[0].tier, 'Pro');
});
test('failed payment only affects its session, never an already active purchase', async () => {
  await pool.query("INSERT INTO subscriptions(user_id,tier,stripe_session_id,status) VALUES($1,'Pro','cs_test_failed','pending')", [userId]);
  await webhook('checkout.session.async_payment_failed', session('cs_test_failed', 'unpaid')).expect(200);
  await webhook('checkout.session.async_payment_failed', session('cs_test_checkout', 'unpaid')).expect(200);
  const rows = (await pool.query('SELECT stripe_session_id,status FROM subscriptions ORDER BY stripe_session_id')).rows;
  assert.equal(rows.find(r=>r.stripe_session_id==='cs_test_failed').status, 'failed');
  assert.equal(rows.find(r=>r.stripe_session_id==='cs_test_checkout').status, 'active');
});
test('database processing failure returns 500 so Stripe retries', async () => {
  const data = session('cs_test_missing_user'); data.metadata.userId = '999999';
  await webhook('checkout.session.completed', data).expect(500);
});
test('return page cannot reflect injected session_id HTML', async () => {
  const result = await request(app).get('/success?session_id=%3Cscript%3Ealert(1)%3C/script%3E').expect(200);
  assert.ok(!result.text.includes('<script>'));
  assert.ok(result.text.includes('https://frontend.example.com'));
});

test('paid cards are not exposed to free users or after access expires', async () => {
  await pool.query("UPDATE subscriptions SET expires_at=NOW()-INTERVAL '1 day' WHERE user_id=$1", [userId]);
  const result = await request(app).get('/api/cards/history').set('Authorization', `Bearer ${token}`).expect(200);
  assert.equal(result.body.total, 30);
  assert.ok(result.body.cards.every(c=>c.tier==='Básico'));
  await request(app).get('/api/community').set('Authorization', `Bearer ${token}`).expect(403);
});

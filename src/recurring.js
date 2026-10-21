const { pool } = require('./db');
const { planFor } = require('./plans');
const idOf = x => typeof x === 'string' ? x : x?.id;
// Serialize reads of Stripe's current state, rather than trusting event arrival order.
async function syncSubscription(stripe, id, expectedUser) {
  if (!/^sub_/.test(id || '')) throw new Error('Subscription required');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [id]);
    const sub = await stripe.subscriptions.retrieve(id, { expand: ['latest_invoice'] });
    if (sub.metadata?.app !== 'back-to-me') { await client.query('COMMIT'); return null; }
    const userId = Number(sub.metadata.userId), plan = planFor(sub.metadata.tier);
    if (!Number.isSafeInteger(userId) || userId <= 0 || !plan || expectedUser && expectedUser !== userId) throw new Error('Invalid subscription owner');
    const item = sub.items?.data?.[0];
    if (sub.items?.data?.length !== 1 || item.price?.unit_amount !== plan.cents || item.price?.currency !== 'usd' || item.price?.recurring?.interval !== 'month' || (item.price.recurring.interval_count || 1) !== 1 || item.quantity !== 1) throw new Error('Subscription price mismatch');
    const invoice = sub.latest_invoice;
    const paidEnd = invoice?.status === 'paid' && ['active', 'past_due'].includes(sub.status)
      ? Math.max(0, ...((invoice.lines?.data || []).filter(l => !l.proration && !l.parent?.subscription_item_details?.proration).map(l => l.period?.end || 0))) : 0;
    const old = (await client.query('SELECT * FROM subscriptions WHERE recurring=TRUE AND stripe_subscription_id=$1 FOR UPDATE', [id])).rows[0];
    if (old && old.user_id !== userId) throw new Error('Owner mismatch');
    let expires = Math.max(old?.expires_at ? new Date(old.expires_at).getTime() : 0, paidEnd * 1000);
    if (['canceled','unpaid','incomplete_expired','paused'].includes(sub.status)) expires = Math.min(expires, Date.now());
    const status = expires > Date.now() ? 'active' : 'pending';
    const expiry = expires ? new Date(expires) : null;
    if (old) await client.query('UPDATE subscriptions SET tier=$1,status=$2,expires_at=$3,billing_status=$4,cancel_at_period_end=$5 WHERE id=$6', [plan.id,status,expiry,sub.status,sub.cancel_at_period_end,old.id]);
    else await client.query(`INSERT INTO subscriptions(user_id,tier,status,expires_at,stripe_subscription_id,recurring,billing_status,cancel_at_period_end)
      VALUES($1,$2,$3,$4,$5,TRUE,$6,$7)`, [userId,plan.id,status,expiry,id,sub.status,sub.cancel_at_period_end]);
    await client.query('COMMIT');
    return { userId, tier: plan.id, status, expires_at: expiry };
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}
async function recurringEvent(stripe, event) {
  const obj = event.data.object;
  let id;
  if (event.type.startsWith('customer.subscription.')) id = obj.id;
  else if (event.type.startsWith('invoice.')) id = idOf(obj.parent?.subscription_details?.subscription || obj.subscription);
  else if (event.type.startsWith('checkout.session.') && obj.mode === 'subscription') {
    if (obj.metadata?.app !== 'back-to-me') return;
    id = idOf(obj.subscription);
  }
  if (!id) return;
  const current = await syncSubscription(stripe,id);
  if (current && obj.object === 'checkout.session') {
    // Associate the locally-created pending checkout with the authoritative subscription row.
    await pool.query('DELETE FROM subscriptions WHERE stripe_session_id=$1 AND recurring=FALSE AND status=$2', [obj.id,'pending']);
    await pool.query('UPDATE subscriptions SET stripe_session_id=COALESCE(stripe_session_id,$1) WHERE recurring=TRUE AND stripe_subscription_id=$2 AND user_id=$3', [obj.id,id,current.userId]);
  }
}
module.exports = { syncSubscription, recurringEvent };

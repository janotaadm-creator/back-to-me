const { pool } = require('./db');

async function getAccessTier(userId) {
  const { rows } = await pool.query(`SELECT tier FROM subscriptions
    WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()
    ORDER BY CASE tier WHEN 'Premium' THEN 2 WHEN 'Pro' THEN 1 ELSE 0 END DESC
    LIMIT 1`, [userId]);
  return rows[0]?.tier || 'Basico';
}
function canAccessCard(userTier, cardTier) {
  return cardTier === 'Básico' || cardTier === 'Basico' ||
    (cardTier === 'Pro' && ['Pro', 'Premium'].includes(userTier)) ||
    (cardTier === 'Premium' && userTier === 'Premium');
}
module.exports = { getAccessTier, canAccessCard };

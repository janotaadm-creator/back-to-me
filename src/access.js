const { pool } = require('./db');

async function getAccessTier(userId) {
  const { rows } = await pool.query(`SELECT tier FROM subscriptions
    WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()
    ORDER BY CASE tier WHEN 'Aprofundar' THEN 6 WHEN 'Premium' THEN 5 WHEN 'MeuEspaco' THEN 4 WHEN 'Pro' THEN 3 WHEN 'Essencial' THEN 2 ELSE 0 END DESC
    LIMIT 1`, [userId]);
  return rows[0]?.tier || 'Basico';
}
function canAccessCard(userTier, cardTier) {
  if (['Essencial', 'MeuEspaco', 'Aprofundar'].includes(userTier)) return true;
  return cardTier === 'Básico' || cardTier === 'Basico' ||
    (cardTier === 'Pro' && ['Pro', 'Premium'].includes(userTier)) ||
    (cardTier === 'Premium' && userTier === 'Premium');
}
module.exports = { getAccessTier, canAccessCard };

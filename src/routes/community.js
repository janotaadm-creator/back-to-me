const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/community - feed da comunidade (Pro/Premium only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check tier
    const userResult = await pool.query('SELECT tier FROM users WHERE id = $1', [userId]);
    const userTier = userResult.rows[0]?.tier;

    if (!['Pro', 'Premium'].includes(userTier)) {
      return res.status(403).json({ error: 'Pro or Premium tier required' });
    }

    // Get community feed (last 20 actions from other Pro/Premium users)
    const feedResult = await pool.query(
      `SELECT ac.user_id, u.email, ac.card_id, c.acao, c.tier,
              ac.completed_at, u.tier as user_tier
       FROM actions_completed ac
       JOIN users u ON ac.user_id = u.id
       JOIN cards_metadata c ON ac.card_id = c.card_id
       WHERE u.tier IN ('Pro', 'Premium')
       AND ac.user_id != $1
       ORDER BY ac.completed_at DESC
       LIMIT 20`,
      [userId]
    );

    res.json({
      feed: feedResult.rows.map(row => ({
        userId: row.user_id,
        userEmail: row.email.split('@')[0], // Privacy: only show handle
        cardId: row.card_id,
        actionRealizada: row.acao,
        timestamp: row.completed_at,
        userTier: row.user_tier,
      })),
    });
  } catch (err) {
    console.error('[COMMUNITY] Error fetching feed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

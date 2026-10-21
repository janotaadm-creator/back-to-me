const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { getAccessTier, canAccessCard } = require('../access');

const router = express.Router();

// POST /api/actions/mark-complete - marca um card como concluído
router.post('/mark-complete', authenticateToken, async (req, res) => {
  let client;
  try {
    const userId = req.user.id;
    const { card_id } = req.body;

    if (!Number.isSafeInteger(card_id) || card_id < 1) {
      return res.status(400).json({ error: 'card_id required' });
    }

    const card = (await pool.query('SELECT tier FROM cards_metadata WHERE card_id=$1', [card_id])).rows[0];
    if (!card) return res.status(404).json({ error: 'Card not found' });
    if (!canAccessCard(await getAccessTier(userId), card.tier)) return res.status(403).json({ error: 'Upgrade required' });
    client = await pool.connect();
    await client.query('BEGIN');
    // Serialize completion writes per user, including retries and concurrent requests.
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
    const existingResult = await client.query(
      'SELECT id FROM actions_completed WHERE user_id = $1 AND card_id = $2',
      [userId, card_id]
    );

    if (existingResult.rows.length > 0) {
      await client.query('COMMIT');
      return res.json({ success: true, alreadyCompleted: true });
    }

    // Insert completion
    const result = await client.query(
      'INSERT INTO actions_completed (user_id, card_id) VALUES ($1, $2) RETURNING id, completed_at',
      [userId, card_id]
    );

    await client.query('COMMIT');
    res.json({
      success: true,
      completion: result.rows[0],
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('[ACTIONS] Error marking complete:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally { if (client) client.release(); }
});

// GET /api/progress - estatísticas de progresso
router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Total cards
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM cards_metadata');
    const totalCards = parseInt(totalResult.rows[0].count);

    // Completed cards
    const completedResult = await pool.query(
      'SELECT COUNT(*) as count FROM actions_completed WHERE user_id = $1',
      [userId]
    );
    const completedCards = parseInt(completedResult.rows[0].count);

    // Completion percentage
    const completionPercentage = totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0;

    // Current streak (consecutive days)
    const streakResult = await pool.query(
      `SELECT COUNT(DISTINCT c.data) as streak
       FROM actions_completed ac
       JOIN cards_metadata c ON ac.card_id = c.card_id
       WHERE ac.user_id = $1
       AND c.data >= CURRENT_DATE - INTERVAL '30 days'`,
      [userId]
    );
    const currentStreak = parseInt(streakResult.rows[0]?.streak || 0);

    res.json({
      totalCards,
      completedCards,
      completionPercentage,
      currentStreak,
      daysRemaining: Math.max(0, totalCards - completedCards),
    });
  } catch (err) {
    console.error('[PROGRESS] Error fetching progress:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

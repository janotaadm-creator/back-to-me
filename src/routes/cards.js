const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const { getAccessTier, canAccessCard } = require('../access');
const router = express.Router();

// GET /api/cards/today - retorna 3 cards de hoje baseado no tier
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Get user tier
    const userTier = await getAccessTier(userId);

    // Get 3 cards for today (any card with matching data)
    const cardsResult = await pool.query(
      `SELECT id, card_id, motivacao, reflexao, acao, tier 
       FROM cards_metadata 
       WHERE data = $1 
       LIMIT 3`,
      [today]
    );

    const cards = cardsResult.rows;

    // Filter by tier accessibility
    const accessibleCards = cards.filter(card => canAccessCard(userTier, card.tier));

    res.json({
      date: today,
      tier: userTier,
      cards: accessibleCards,
    });
  } catch (err) {
    console.error('[CARDS] Error fetching today cards:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/cards/history - retorna histórico com status de conclusão
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all cards from this month
    const cardsResult = await pool.query(
      `SELECT c.id, c.card_id, c.data, c.tema_semana, c.motivacao, c.tier,
              CASE WHEN ac.id IS NOT NULL THEN true ELSE false END as completed
       FROM cards_metadata c
       LEFT JOIN actions_completed ac ON c.card_id = ac.card_id AND ac.user_id = $1
       ORDER BY c.data ASC`,
      [userId]
    );

    const userTier = await getAccessTier(userId);
    const cards = cardsResult.rows.filter(card => canAccessCard(userTier, card.tier));
    res.json({ total: cards.length, cards });
  } catch (err) {
    console.error('[CARDS] Error fetching history:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

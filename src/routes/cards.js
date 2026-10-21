const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const { getAccessTier, canAccessCard } = require('../access');
const router = express.Router();

// GET /api/cards/today - retorna 3 cards de hoje baseado no tier
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const { rows: users } = await pool.query('SELECT created_at FROM users WHERE id=$1', [userId]);
    if (!users[0]) return res.status(401).json({ error: 'User not found' });
    const elapsedDays = Math.max(0, Math.floor((Date.now() - new Date(users[0].created_at).getTime()) / 86400000));
    const dayNumber = Math.min(30, elapsedDays + 1);

    // Get user tier
    const userTier = await getAccessTier(userId);

    // Get 3 cards for today (any card with matching data)
    const cardsResult = await pool.query(
      `SELECT id, card_id, dia_do_mes, tema_semana, motivacao, reflexao, acao, tier,
       EXISTS(SELECT 1 FROM actions_completed ac WHERE ac.user_id=$2 AND ac.card_id=cards_metadata.card_id) AS completed
       FROM cards_metadata 
       WHERE dia_do_mes = $1 ORDER BY card_do_dia
       LIMIT 3`,
      [dayNumber, userId]
    );

    const cards = cardsResult.rows;

    // Filter by tier accessibility
    const accessibleCards = cards.filter(card => canAccessCard(userTier, card.tier));

    res.json({
      date: today,
      tier: userTier,
      dayNumber,
      programEnded: elapsedDays >= 30,
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
      `SELECT c.id, c.card_id, c.data, c.dia_do_mes, c.tema_semana, c.motivacao, c.reflexao, c.acao, c.tier,
              EXISTS(SELECT 1 FROM actions_completed ac WHERE ac.user_id=$1 AND ac.card_id=c.card_id) AS completed
       FROM cards_metadata c
       ORDER BY c.dia_do_mes, c.card_do_dia`,
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

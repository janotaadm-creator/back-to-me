const { pool } = require('../db');
const fs = require('fs');
const path = require('path');

async function seedCards() {
  try {
    console.log('[SEED] Starting card seed...');

    // Read JSON file
    const jsonPath = path.join(__dirname, '../../back-to-me-30dias.json');
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    const cards = jsonData.cards;
    console.log(`[SEED] Found ${cards.length} cards to load`);

    // Insert all cards
    for (const card of cards) {
      await pool.query(
        `INSERT INTO cards_metadata 
         (card_id, data, dia_do_mes, semana, tema_semana, progressao_semana, card_do_dia, 
          motivacao, reflexao, acao, tier, publicado, data_criacao)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (card_id) DO NOTHING`,
        [
          card.id,
          card.data,
          card.dia_do_mes,
          card.semana,
          card.tema_semana,
          card.progressao_semana,
          card.card_do_dia,
          card.motivacao,
          card.reflexao,
          card.acao,
          card.tier === 'Básico' ? 'Básico' : card.tier,
          card.publicado || false,
          new Date(card.data_criacao),
        ]
      );
    }

    console.log(`[SEED] Successfully seeded ${cards.length} cards`);
  } catch (err) {
    console.error('[SEED] Error seeding cards:', err);
    throw err;
  }
}

// Run if called directly
if (require.main === module) {
  seedCards().then(() => {
    console.log('[SEED] Done');
    process.exit(0);
  }).catch((err) => {
    console.error('[SEED] Failed:', err);
    process.exit(1);
  });
}

module.exports = seedCards;

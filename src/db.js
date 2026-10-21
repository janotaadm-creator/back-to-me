const { Pool } = require('pg');
require('dotenv').config();

// Connection pool para PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/back_to_me',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Função para rodar migrations na startup
async function initDatabase() {
  const client = await pool.connect();
  try {
    
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        tier VARCHAR(50) DEFAULT 'Basico',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Subscriptions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        tier VARCHAR(50),
        status VARCHAR(50) DEFAULT 'active',
        stripe_session_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        started_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_session_unique ON subscriptions (stripe_session_id)');

    // Cards metadata table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cards_metadata (
        id SERIAL PRIMARY KEY,
        card_id INTEGER UNIQUE NOT NULL,
        data DATE,
        dia_do_mes INTEGER,
        semana INTEGER,
        tema_semana VARCHAR(255),
        progressao_semana VARCHAR(255),
        card_do_dia INTEGER,
        motivacao TEXT,
        reflexao TEXT,
        acao TEXT,
        tier VARCHAR(50),
        publicado BOOLEAN DEFAULT FALSE,
        data_criacao TIMESTAMP
      );
    `);

    // Actions completed table
    await client.query(`
      CREATE TABLE IF NOT EXISTS actions_completed (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        card_id INTEGER,
        completed_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS recurring BOOLEAN DEFAULT FALSE;
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_status TEXT;
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;
      CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_recurring_unique ON subscriptions(stripe_subscription_id) WHERE recurring = TRUE;
      CREATE TABLE IF NOT EXISTS experience_state (user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        goal TEXT, completed TEXT[] DEFAULT '{}', reminder BOOLEAN DEFAULT FALSE, updated_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS journal_entries (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(120) NOT NULL, content TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS product_events (id BIGSERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        event TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());`);
    console.log('[DB] Tables initialized successfully');
  } catch (err) {
    console.error('[DB] Error initializing database:', err);
    throw err;
  } finally { client.release(); }
}

module.exports = { pool, initDatabase };

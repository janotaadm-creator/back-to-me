const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDatabase } = require('./db');
const seedCards = require('./scripts/seed-cards');

// Routes
const authRoutes = require('./routes/auth');
const cardsRoutes = require('./routes/cards');
const actionsRoutes = require('./routes/actions');
const communityRoutes = require('./routes/community');
const stripeRoutes = require('./routes/stripe');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true,
}));

// Important: stripe webhook must be raw buffer BEFORE body parser
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeRoutes);

// Then apply JSON parser for everything else
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/actions', actionsRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/stripe', stripeRoutes);

// Success/cancel pages (basic placeholders)
app.get('/success', (req, res) => {
  res.send(`
    <html>
      <body style="font-family: Arial; text-align: center; margin-top: 100px;">
        <h1>✓ Payment Successful!</h1>
        <p>Your subscription is now active.</p>
        <p>Session ID: ${req.query.session_id}</p>
        <a href="http://localhost:3000">Back to app</a>
      </body>
    </html>
  `);
});

app.get('/cancel', (req, res) => {
  res.send(`
    <html>
      <body style="font-family: Arial; text-align: center; margin-top: 100px;">
        <h1>Payment Cancelled</h1>
        <p>Your subscription was not completed.</p>
        <a href="http://localhost:3000">Back to app</a>
      </body>
    </html>
  `);
});

// Start server
async function startServer() {
  try {
    console.log('[SERVER] Initializing database...');
    await initDatabase();

    console.log('[SERVER] Seeding cards...');
    await seedCards();

    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════╗
║         Back to Me API Server                  ║
║  Running on port ${PORT}                          ║
║  http://localhost:${PORT}                         ║
║                                                ║
║  Endpoints:                                    ║
║  POST   /auth/signup                           ║
║  POST   /auth/login                            ║
║  GET    /api/cards/today                       ║
║  GET    /api/cards/history                     ║
║  GET    /api/progress                          ║
║  POST   /api/actions/mark-complete             ║
║  GET    /api/community                         ║
║  POST   /api/stripe/checkout                   ║
║  POST   /api/stripe/webhook                    ║
║                                                ║
║  Docs: http://localhost:${PORT}/README.md      ║
╚════════════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('[SERVER] Failed to start:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app;

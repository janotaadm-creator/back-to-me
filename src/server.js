const express = require('express');
const cors = require('cors');
const path = require('path');
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
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
const frontendOrigin = new URL(frontendUrl).origin;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? [frontendOrigin] : [frontendOrigin, 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true,
}));

// Important: stripe webhook must be raw buffer BEFORE body parser
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeRoutes.webhookHandler);

// Then apply JSON parser for everything else
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'same-origin');
  res.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  if (req.headers.authorization) res.set('Cache-Control', 'no-store');
  next();
});
app.get('/api/config', (req, res) => res.json({
  testMode: !/^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY || ''),
  prices: stripeRoutes.prices,
  currency: 'USD',
}));

// Health check
app.get('/health', async (req, res) => {
  try {
    await require('./db').pool.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/actions', actionsRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/stripe', stripeRoutes);

const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir, { index: 'index.html', maxAge: 0 }));
// Returning from Checkout does not itself confirm payment. The app checks the signed webhook result.
app.get(['/app', '/success', '/cancel'], (req, res) => res.sendFile(path.join(publicDir, 'app.html')));

// Start server
async function startServer() {
  try {
    console.log('[SERVER] Initializing database...');
    await initDatabase();

    console.log('[SERVER] Seeding cards...');
    await seedCards();

    return app.listen(PORT, '0.0.0.0', () => {
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

if (require.main === module) {
  startServer();
}
module.exports = app;
module.exports.startServer = startServer;

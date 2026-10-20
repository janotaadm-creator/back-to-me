# Back to Me API — Quick Reference

## Start
```bash
cd /root/.openclaw/workspace-icaro/back-to-me
npm start
# Runs on http://localhost:3001
```

## Test Endpoints

### 1. Signup (get token)
```bash
curl -X POST http://localhost:3001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```
Returns: `{"token":"...", "user":{"id":1,"email":"user@example.com","tier":"Basico"}}`

### 2. Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### 3. Get Cards Today
```bash
TOKEN="your-jwt-token"
curl -X GET http://localhost:3001/api/cards/today \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Mark Card Complete
```bash
curl -X POST http://localhost:3001/api/actions/mark-complete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"card_id":1}'
```

### 5. Get Progress
```bash
curl -X GET http://localhost:3001/api/progress \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Get Community Feed (Pro/Premium only)
```bash
curl -X GET http://localhost:3001/api/community \
  -H "Authorization: Bearer $TOKEN"
```

### 7. Stripe Checkout
```bash
curl -X POST http://localhost:3001/api/stripe/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tier":"Pro"}'
```

## Files Overview

| File | Purpose |
|------|---------|
| `src/server.js` | Main Express app |
| `src/db.js` | PostgreSQL setup + migrations |
| `src/routes/auth.js` | Signup, Login |
| `src/routes/cards.js` | Today, History |
| `src/routes/actions.js` | Mark-complete, Progress |
| `src/routes/community.js` | Community feed |
| `src/routes/stripe.js` | Checkout, Webhook |
| `src/middleware/auth.js` | JWT validation |
| `src/scripts/seed-cards.js` | Load 90 cards |
| `back-to-me-30dias.json` | Card data (90 cards) |
| `.env` | Configuration |
| `README.md` | Full API docs |
| `SETUP-VERIFICATION.md` | Detailed setup guide |
| `DELIVERY.md` | Delivery summary |
| `test-api.sh` | Curl test script |

## Environment Variables

```
DATABASE_URL=postgresql://user:password@localhost:5432/back_to_me
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PORT=3001
```

## Tier System

| Tier | Cards | Community | Price |
|------|-------|-----------|-------|
| Básico | 3/day (basic only) | ✗ | Free |
| Pro | 3/day (basic+pro) | ✓ | $29.99 |
| Premium | All | ✓ | $49.99 |

## Database Tables

```sql
users (id, email, password_hash, tier, created_at)
subscriptions (id, user_id, tier, status, stripe_session_id, ...)
cards_metadata (card_id, data, motivacao, reflexao, acao, tier, ...)
actions_completed (id, user_id, card_id, completed_at)
```

## Security

- ✓ JWT (24h expiry)
- ✓ Bcrypt password hashing
- ✓ Stripe webhook signature validation
- ✓ Tier-based access control
- ✓ SQL injection prevention
- ✓ CORS enabled

## Troubleshooting

**Connection refused**: Start PostgreSQL or Docker
```bash
docker run -d -e POSTGRES_PASSWORD=password -p 5432:5432 postgres:15
```

**Port 3001 in use**: Change PORT in .env or kill process
```bash
lsof -i :3001 | kill -9 PID
```

**No cards seeding**: Check database connection + JSON path in seed-cards.js

**JWT invalid**: Make sure JWT_SECRET in .env is same as during signup

## Postman/CLI Testing

Use `test-api.sh` for full test suite:
```bash
chmod +x test-api.sh
./test-api.sh
```

Or run manual curl requests using examples above.

---

Ready to test! Start with `npm start` and use the curl examples. 🚀

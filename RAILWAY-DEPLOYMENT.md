# Back to Me Backend — Railway Deployment Guide

> **Status**: ✅ Ready for deployment to Railway  
> **Last updated**: 2026-10-20  
> **Backend version**: 1.0.0 with Express + PostgreSQL

## Quick Start (< 5 minutes)

### Option 1: Deploy via GitHub (Recommended)
1. **Push to GitHub** (if not already done):
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/back-to-me.git
   git branch -M main
   git push -u origin main
   ```

2. **Create Railway Project**:
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select this repository
   - Railway auto-detects Dockerfile and deploys

3. **Add PostgreSQL**:
   - In Railway dashboard, click "+ Add service" → "Database" → "PostgreSQL"
   - Railway auto-populates `DATABASE_URL`

4. **Configure Environment Variables**:
   ```
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=<generate strong random key>
   STRIPE_SECRET_KEY=sk_test_YOUR_KEY
   STRIPE_PUBLIC_KEY=pk_test_YOUR_KEY
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_KEY
   FRONTEND_URL=https://your-domain.com
   ```

### Option 2: Deploy via Railway CLI
```bash
npm install -g @railway/cli
railway login
railway init  # Follow prompts
railway up
```

---

## What's Deployed

| Component | Details |
|-----------|---------|
| **Runtime** | Node.js 18+ |
| **Framework** | Express 4.18 |
| **Database** | PostgreSQL 15 (Railway template) |
| **Auth** | JWT + bcryptjs |
| **Payments** | Stripe integration |
| **Port** | 3001 |
| **Health Check** | `GET /health` → `{"status":"ok", "timestamp":"..."}` |

---

## Environment Variables (Production)

Set these in Railway dashboard → Variables:

```bash
# Required
DATABASE_URL=<URL privada fornecida pelo PostgreSQL do Railway>
JWT_SECRET=<use: openssl rand -base64 32>
NODE_ENV=production
PORT=3001

# Stripe (replace with your live keys)
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
STRIPE_PUBLIC_KEY=pk_live_YOUR_LIVE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_KEY

# Frontend integration
FRONTEND_URL=https://your-landing-page.com
PRICE_PRO=2999  # cents
PRICE_PREMIUM=4999  # cents
```

---

## API Endpoints (Test After Deployment)

### Health Check (Required)
```bash
curl -i https://back-to-me-xxx.railway.app/health
# Expected: 200 OK
# {"status":"ok","timestamp":"2026-10-20T..."}
```

### Authentication
```bash
# Sign up
POST /auth/signup
{"email":"user@example.com","password":"...","name":"User"}

# Login
POST /auth/login
{"email":"user@example.com","password":"..."}
```

### Cards & Progress
```bash
# Today's card
GET /api/cards/today

# Card history
GET /api/cards/history

# Progress tracking
GET /api/progress
```

### Stripe Payments
```bash
# Create checkout session
POST /api/stripe/checkout
{"priceId":"price_pro","successUrl":"...","cancelUrl":"..."}
```

---

## Stripe Webhook Setup (CRITICAL)

After deployment, set up Stripe webhook to handle payments:

### 1. Get Your Webhook URL
From Railway dashboard:
- App name: `back-to-me`
- Domain: `https://back-to-me-YOUR_PROJECT_ID.railway.app`
- **Webhook endpoint**: `https://back-to-me-YOUR_PROJECT_ID.railway.app/api/stripe/webhook`

### 2. Create Webhook in Stripe Dashboard

**Test Mode** (Development):
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. **URL**: `https://back-to-me-YOUR_ID.railway.app/api/stripe/webhook`
4. **Events to send**:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
5. Click "Add endpoint"
6. Copy the **Signing secret** (starts with `whsec_`)
7. Set as `STRIPE_WEBHOOK_SECRET` in Railway

**Live Mode** (Production):
- Repeat same steps in [Live webhooks](https://dashboard.stripe.com/webhooks)
- Use `sk_live_*` keys for STRIPE_SECRET_KEY
- Use `whsec_live_*` for webhook secret

### 3. Test Webhook
```bash
# From your terminal
curl -X POST https://back-to-me-YOUR_ID.railway.app/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=123456,v1=abc123" \
  -d '{"type":"checkout.session.completed","data":{"object":{"id":"cs_test"}}}'
```

### 4. Verify in Logs
Railway dashboard → Logs tab:
```
[STRIPE] Webhook received: checkout.session.completed
[STRIPE] Processing payment for user ...
```

---

## Monitoring & Troubleshooting

### View Logs
```bash
# Via Railway CLI
railway logs -f

# Or in dashboard: Logs tab
```

### Common Issues

| Issue | Solution |
|-------|----------|
| `DATABASE_URL not set` | Add PostgreSQL service in Railway, check Variables |
| `Port 3001 already in use` | Railway auto-assigns port via env var |
| `Stripe webhook 401` | Verify `STRIPE_WEBHOOK_SECRET` is correct |
| `CORS errors` | Update `FRONTEND_URL` in env vars |
| `Health check timeout` | Check database connection, logs for init errors |

---

## Deployment Checklist

- [ ] Git repository initialized
- [ ] Dockerfile present and tested
- [ ] `.env` configured with valid keys
- [ ] PostgreSQL service added to Railway
- [ ] All env vars set in Railway dashboard
- [ ] Health check passes: `GET /health → 200`
- [ ] Stripe webhook endpoint created
- [ ] Webhook signing secret configured
- [ ] Landing page ready to connect (store URL)

---

## Next Steps

1. ✅ **Deploy backend** (this guide)
2. 🔗 **Connect landing page**: Add backend URL to frontend `.env`
3. 💳 **Test payment flow**: Create checkout session, complete payment
4. 📊 **Monitor**: Set up alerts for failed payments/errors
5. 🚀 **Go live**: Switch Stripe to live mode, update frontend to production URL

---

## Support Links

- [Railway Docs](https://docs.railway.app)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Express.js API](https://expressjs.com/en/api.html)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

---

**Backend**: Express + PostgreSQL + Stripe  
**Deployed**: Railway  
**Status**: Production-ready ✅

## Landing e entrada do app (21/10/2026)

A raiz `/` apresenta a landing romântica escolhida por Guilherme: coração, rosa e vinho, título “Abra espaço para você, de novo”. Referência visual e foto: `landing-v6-claude` do projeto original. O texto apresenta o app atual, sem reaproveitar a oferta antiga de nove aulas/kit.

`/app?mode=signup` abre cadastro; `/app?mode=login` abre login. `/success` e `/cancel` continuam servindo a interface do app; a confirmação assinada do Stripe continua sendo necessária. Após confirmação, a URL passa a `/app`. Pagamentos permanecem em sandbox.

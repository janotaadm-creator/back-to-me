# Back to Me Backend — Deployment Ready ✅

**Date**: 2026-10-20  
**Status**: Ready for Railway deployment  
**Time to deploy**: < 10 minutes  

---

## 📍 What's Ready

```
Backend: /root/.openclaw/workspace-icaro/back-to-me
├── ✅ Express.js + PostgreSQL
├── ✅ Dockerfile (Node 18 Alpine)
├── ✅ Health check endpoint (/health)
├── ✅ Stripe integration ready
├── ✅ JWT authentication
├── ✅ Git repository initialized
├── ✅ All dependencies installed
└── ✅ Validation tests passing
```

---

## 🚀 Fast Deployment Path (< 10 min)

### Step 1: Connect to GitHub (2 min)
```bash
cd /root/.openclaw/workspace-icaro/back-to-me

# Add your GitHub repo
git remote add origin https://github.com/senlux/back-to-me.git
git branch -M main
git push -u origin main
```

### Step 2: Create Railway Project (3 min)
1. Visit [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select the `back-to-me` repository
4. Railway auto-detects `Dockerfile` and starts deployment
5. Wait for green status

### Step 3: Add PostgreSQL (2 min)
1. In Railway dashboard, click **"+ Add service"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway auto-populates `DATABASE_URL` env var
4. Service starts automatically

### Step 4: Set Environment Variables (2 min)
In Railway dashboard → "Variables" tab, add:

```
NODE_ENV=production
PORT=3001
JWT_SECRET=<run: openssl rand -base64 32>
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_KEY
STRIPE_PUBLIC_KEY=pk_test_YOUR_STRIPE_KEY
STRIPE_WEBHOOK_SECRET=whsec_test_YOUR_WEBHOOK_KEY
FRONTEND_URL=https://your-landing-page.com
```

### Step 5: Test Health Check (1 min)
```bash
# Get your Railway app URL from dashboard
curl https://back-to-me-YOUR_ID.railway.app/health

# Expected response:
# {"status":"ok","timestamp":"2026-10-20T..."}
```

✅ **Backend live!**

---

## 🎯 API Endpoints Available

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| `GET` | `/health` | Health check | None |
| `POST` | `/auth/signup` | Register user | None |
| `POST` | `/auth/login` | Login user | None |
| `GET` | `/api/cards/today` | Today's card | JWT |
| `GET` | `/api/cards/history` | Card history | JWT |
| `GET` | `/api/progress` | User progress | JWT |
| `POST` | `/api/stripe/checkout` | Create payment session | JWT |
| `POST` | `/api/stripe/webhook` | Stripe webhook | Stripe signature |

---

## 🔗 Stripe Webhook Setup (Critical)

After deployment, you **MUST** set up the webhook for payments to work.

### Create Webhook in Stripe Dashboard

**Location**: [Stripe Webhooks (Test)](https://dashboard.stripe.com/test/webhooks)

1. Click **"Add endpoint"**
2. Paste your Railway URL: `https://back-to-me-YOUR_ID.railway.app/api/stripe/webhook`
3. Select events:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
4. Click **"Add endpoint"**
5. Copy **Signing secret** (starts with `whsec_`)
6. In Railway dashboard, set env var: `STRIPE_WEBHOOK_SECRET=whsec_...`
7. Restart app (Railway will auto-restart)

### Verify Webhook
```bash
# Use the test script
bash /root/.openclaw/workspace-icaro/back-to-me/test-webhook.sh \
  https://back-to-me-YOUR_ID.railway.app
```

---

## 📊 Deployment Checklist

- [ ] GitHub repo created and linked
- [ ] Code pushed to `main` branch
- [ ] Railway project created
- [ ] PostgreSQL service added
- [ ] All env vars set in Railway dashboard
- [ ] Health check returns 200 OK
- [ ] Stripe webhook endpoint created
- [ ] `STRIPE_WEBHOOK_SECRET` set in Railway
- [ ] Test payment flow works
- [ ] Frontend URL points to deployed backend

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Railway build config |
| `railway.json` | Railway deployment settings |
| `RAILWAY-DEPLOYMENT.md` | Complete deployment guide |
| `deploy-railway.sh` | One-command setup |
| `validate-deployment.sh` | Validation tests |
| `test-webhook.sh` | Webhook verification |
| `.env.example` | Environment variables reference |

---

## 🔗 How to Connect to Landing Page

Once backend is live:

1. **Get your Railway URL**:
   - From Railway dashboard: `https://back-to-me-YOUR_ID.railway.app`

2. **Update landing page `.env`**:
   ```bash
   REACT_APP_API_URL=https://back-to-me-YOUR_ID.railway.app
   ```

3. **Test endpoints**:
   ```bash
   curl https://back-to-me-YOUR_ID.railway.app/health
   ```

4. **Configure CORS**:
   - Update `FRONTEND_URL` env var in Railway
   - Should match your landing page domain

---

## 🆘 Troubleshooting

### Health check fails
```bash
# Check logs
railway logs -f

# Verify PostgreSQL is running
# Check STRIPE_SECRET_KEY is set (can be test key)
```

### Webhook not triggering
1. Verify endpoint URL in Stripe Dashboard
2. Check `STRIPE_WEBHOOK_SECRET` matches Stripe
3. Review logs: `railway logs -f`
4. Test with: `test-webhook.sh`

### CORS errors
- Update `FRONTEND_URL` env var
- Restart app in Railway dashboard

---

## 📞 Next Steps

1. **Deploy** (follow 5 steps above)
2. **Test** (run health check + webhook test)
3. **Connect** landing page (set REACT_APP_API_URL)
4. **Go live** (switch Stripe to live mode, update keys)

---

## 📚 Documentation

- **Deployment**: `RAILWAY-DEPLOYMENT.md` (full guide)
- **Backend API**: `README.md` (endpoints reference)
- **Stripe setup**: See "Stripe Webhook Setup" section above
- **Environment**: `.env.example` (all required vars)

---

**Backend Status**: ✅ Production-ready  
**Deployment Time**: < 10 minutes  
**Test URL**: `https://back-to-me-YOUR_ID.railway.app/health`  

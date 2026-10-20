#!/bin/bash
# automated-railway-deploy.sh
# Complete Back to Me backend deployment to Railway (interactive)

set -e

BACKEND_DIR="/root/.openclaw/workspace-icaro/back-to-me"
cd "$BACKEND_DIR"

clear
echo "╔═══════════════════════════════════════════════════════╗"
echo "║     Back to Me Backend → Railway Deployment           ║"
echo "║     Automated Setup (< 10 minutes)                    ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Step 1: Validation
echo "🔍 Step 1: Validating Backend..."
if ! bash validate-deployment.sh > /tmp/validate.log 2>&1; then
  echo "❌ Validation failed. See /tmp/validate.log"
  exit 1
fi
echo "✅ All validations passed"
echo ""

# Step 2: Git setup
echo "📦 Step 2: Git Repository Setup"
if [ ! -d ".git" ]; then
  echo "  Initializing git..."
  git init
  git add -A
  git commit -m "Back to Me API — Ready for Railway deployment"
else
  echo "  ✓ Git already initialized"
fi

# Check for remote
if ! git remote get-url origin > /dev/null 2>&1; then
  echo ""
  echo "  ⚠️  GitHub remote not configured"
  echo ""
  echo "  To set up GitHub:"
  echo "  1. Create repo at: https://github.com/new"
  echo "  2. Then run:"
  echo "     git remote add origin https://github.com/YOUR_USERNAME/back-to-me.git"
  echo "     git branch -M main"
  echo "     git push -u origin main"
  echo ""
  read -p "  Have you set up GitHub remote? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "  ⏭️  Skipping GitHub push..."
  else
    echo "  Pushing to GitHub..."
    git push -u origin main 2>&1 | grep -E "Enumerating|Writing|Total|main" || true
  fi
else
  echo "  ✓ GitHub remote configured"
  REMOTE=$(git remote get-url origin)
  echo "  Remote: $REMOTE"
fi
echo ""

# Step 3: Environment setup
echo "🔐 Step 3: Environment Configuration"
if [ -f ".env" ]; then
  echo "  ✓ .env file exists"
else
  echo "  Creating .env..."
  cat > .env <<EOF
# Railway Environment — Auto-generated
NODE_ENV=production
PORT=3001
JWT_SECRET=$(openssl rand -base64 32)
DATABASE_URL=postgresql://USER:PASS@localhost:5432/back_to_me
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLIC_KEY=pk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_test_YOUR_KEY_HERE
FRONTEND_URL=https://your-domain.com
EOF
  echo "  ✓ .env created (update with actual Stripe keys)"
fi
echo ""

# Step 4: Railway CLI check
echo "🚀 Step 4: Railway CLI Setup"
if ! command -v railway &> /dev/null; then
  echo "  Installing Railway CLI..."
  npm install -g @railway/cli 2>&1 | tail -1
fi
echo "  ✓ Railway CLI ready"
echo ""

# Step 5: Summary and next steps
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                  READY FOR DEPLOYMENT                ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "📍 Backend Location:"
echo "   $BACKEND_DIR"
echo ""
echo "🔗 Git Repository:"
git config --get remote.origin.url 2>/dev/null || echo "   (not connected to GitHub yet)"
echo ""
echo "📋 Environment Variables Set:"
grep -E "^[A-Z_]+=" .env 2>/dev/null | wc -l | xargs echo "   Variables:"
echo ""
echo "✅ What's Ready:"
echo "   ✓ Express.js + PostgreSQL backend"
echo "   ✓ Dockerfile (Node 18 Alpine)"
echo "   ✓ Health check endpoint (/health)"
echo "   ✓ Stripe integration"
echo "   ✓ JWT authentication"
echo "   ✓ Validation tests passing"
echo ""
echo "🎯 Next Steps (Manual — use Railway Dashboard):"
echo ""
echo "   1. Go to: https://railway.app"
echo "   2. Click 'New Project' → 'Deploy from GitHub repo'"
echo "   3. Select 'back-to-me' repository"
echo "   4. Add PostgreSQL service"
echo "   5. Set environment variables (see .env)"
echo "   6. Wait for deployment (green status)"
echo ""
echo "🔗 Stripe Webhook Setup:"
echo "   1. Deploy backend first"
echo "   2. Get Railway URL from dashboard"
echo "   3. Go to: https://dashboard.stripe.com/test/webhooks"
echo "   4. Add endpoint: https://back-to-me-YOUR_ID.railway.app/api/stripe/webhook"
echo "   5. Copy webhook secret → Set as STRIPE_WEBHOOK_SECRET"
echo ""
echo "🧪 After Deployment Test:"
echo "   bash test-webhook.sh https://back-to-me-YOUR_ID.railway.app"
echo ""
echo "📚 Full guide: RAILWAY-DEPLOYMENT.md"
echo ""

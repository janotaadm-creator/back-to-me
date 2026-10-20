#!/bin/bash
# Railway Deploy Script — Back to Me Backend

set -e

BACKEND_DIR="/root/.openclaw/workspace-icaro/back-to-me"
PROJECT_NAME="back-to-me"

cd "$BACKEND_DIR"

echo "🚀 Starting Railway Deployment..."
echo "📦 Backend: $BACKEND_DIR"

# Step 1: Ensure Dockerfile exists
if [ ! -f "Dockerfile" ]; then
  echo "❌ Dockerfile not found!"
  exit 1
fi
echo "✓ Dockerfile found"

# Step 2: Check git is initialized
if [ ! -d ".git" ]; then
  git init
  git add -A
  git commit -m "Initial commit"
fi
echo "✓ Git repository ready"

# Step 3: Create .env for Railway deployment
cat > .env.railway <<EOF
# Auto-generated for Railway — update with actual keys
NODE_ENV=production
PORT=3001
JWT_SECRET=$(openssl rand -base64 32)
DATABASE_URL=postgresql://user:pass@localhost:5432/back_to_me
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLIC_KEY=pk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_KEY_HERE
FRONTEND_URL=https://back-to-me.example.com
EOF
echo "✓ Railway env file created (.env.railway)"

# Step 4: Show next steps
echo ""
echo "✅ Backend Prepared for Railway!"
echo ""
echo "NEXT STEPS:"
echo "1. Go to https://railway.app and log in"
echo "2. Click 'New Project' → 'Deploy from GitHub repo'"
echo "3. OR: Use 'railway init' then 'railway up' (requires auth token)"
echo "4. Add PostgreSQL service from template"
echo "5. Set env vars:"
echo "   - DATABASE_URL: Use Railway PostgreSQL connection string"
echo "   - JWT_SECRET: Update with strong secret"
echo "   - STRIPE_*: Add your Stripe API keys"
echo ""
echo "📍 Git repo: $BACKEND_DIR/.git"
echo "🐳 Dockerfile: $BACKEND_DIR/Dockerfile"
echo "📝 Config: $BACKEND_DIR/railway.json"
echo ""

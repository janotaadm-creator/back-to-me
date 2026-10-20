#!/bin/bash
# validate-deployment.sh — Ensures backend is ready for Railway

set -e

BACKEND_DIR="/root/.openclaw/workspace-icaro/back-to-me"
cd "$BACKEND_DIR"

echo "🔍 Validating Back to Me Backend for Railway Deployment..."
echo ""

# Check 1: Dockerfile
echo "✓ Check 1: Dockerfile"
if [ ! -f "Dockerfile" ]; then
  echo "  ❌ Dockerfile missing"
  exit 1
fi
echo "  ✓ Dockerfile exists"

# Check 2: package.json
echo "✓ Check 2: Dependencies"
if ! grep -q '"express"' package.json; then
  echo "  ❌ Express not in package.json"
  exit 1
fi
echo "  ✓ Express configured"

# Check 3: Server entry point
echo "✓ Check 3: Server entry point"
if [ ! -f "src/server.js" ]; then
  echo "  ❌ src/server.js missing"
  exit 1
fi
echo "  ✓ src/server.js found"

# Check 4: Health endpoint
echo "✓ Check 4: Health check endpoint"
if ! grep -q "'/health'" src/server.js; then
  echo "  ❌ /health endpoint not found"
  exit 1
fi
echo "  ✓ /health endpoint configured"

# Check 5: Environment variables
echo "✓ Check 5: Environment file"
if [ ! -f ".env.example" ]; then
  echo "  ❌ .env.example missing"
  exit 1
fi
echo "  ✓ .env.example exists"

# Check 6: Git repository
echo "✓ Check 6: Git repository"
if [ ! -d ".git" ]; then
  echo "  ❌ Git not initialized"
  exit 1
fi
echo "  ✓ Git repository ready"

# Check 7: node_modules
echo "✓ Check 7: Dependencies installed"
if [ ! -d "node_modules" ]; then
  echo "  ❌ Dependencies not installed"
  exit 1
fi
echo "  ✓ node_modules present"

echo ""
echo "✅ All checks passed! Backend is ready for Railway deployment."
echo ""
echo "DEPLOYMENT SUMMARY:"
echo "────────────────────────────────────"
echo "Project Name:       back-to-me"
echo "Runtime:            Node.js 18+"
echo "Port:               3001"
echo "Database:           PostgreSQL (Railway)"
echo "Entry Point:        npm start (src/server.js)"
echo "Health Check:       GET /health"
echo ""

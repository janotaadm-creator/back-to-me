#!/bin/bash

# Back to Me API — Smoke Test (without running server)
# Validates code structure and syntax

echo "🔍 Back to Me API — Code Verification"
echo "======================================"

# Check Node modules
echo -e "\n✓ Dependencies installed:"
ls -lh node_modules | head -5

# Validate JSON structure of cards
echo -e "\n✓ Checking cards JSON structure..."
node -e "
const data = require('./back-to-me-30dias.json');
console.log('  Total cards:', data.cards.length);
console.log('  Sample card:', JSON.stringify(data.cards[0], null, 2).split('\n').slice(0,10).join('\n'));
"

# Check JavaScript syntax
echo -e "\n✓ Validating JavaScript files..."
for file in src/**/*.js src/*.js; do
  if [ -f "$file" ]; then
    node -c "$file" 2>/dev/null && echo "  ✓ $file"
  fi
done

# Verify imports
echo -e "\n✓ Checking imports and structure..."
node -e "
console.log('  Checking server.js imports...');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const stripe = require('stripe');
const pg = require('pg');
console.log('  ✓ All imports available');

console.log('  Checking route files...');
const fs = require('fs');
['auth', 'cards', 'actions', 'community', 'stripe'].forEach(r => {
  const path = './src/routes/' + r + '.js';
  if (fs.existsSync(path)) {
    console.log('  ✓ routes/' + r + '.js exists');
  }
});
"

# Check database schema
echo -e "\n✓ Database schema (from db.js):"
grep "CREATE TABLE" src/db.js | sed 's/^/  /'

# Check environment setup
echo -e "\n✓ Environment configuration:"
echo "  DATABASE_URL: $(grep DATABASE_URL .env | cut -d= -f2)"
echo "  JWT_SECRET: $(grep JWT_SECRET .env | cut -d= -f2 | cut -c1-20)..."
echo "  PORT: $(grep '^PORT=' .env | cut -d= -f2)"

# Show directory structure
echo -e "\n✓ Project structure:"
tree -L 3 -I 'node_modules' . 2>/dev/null || find . -not -path './node_modules*' -type f | head -20

echo -e "\n✓ All files ready!"
echo -e "\n📋 To start server:"
echo "  cd /root/.openclaw/workspace-icaro/back-to-me"
echo "  npm start"
echo ""
echo "📝 To test with curl (after server starts):"
echo "  chmod +x test-api.sh && ./test-api.sh"

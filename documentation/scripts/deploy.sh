#!/bin/bash

# LMS SLNCity Deployment Script
# This script automates the deployment process

set -e  # Exit on error

echo "🚀 Starting LMS SLNCity Deployment..."
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}❌ Please do not run this script as root${NC}"
   exit 1
fi

# Check if .env files exist
if [ ! -f "server/.env" ]; then
    echo -e "${RED}❌ server/.env file not found!${NC}"
    echo "Please copy server/.env.example to server/.env and configure it"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found for frontend${NC}"
    echo "Copying .env.example to .env..."
    cp .env.example .env
fi

# Validate JWT_SECRET
JWT_SECRET=$(grep JWT_SECRET server/.env | cut -d '=' -f2)
if [ "$JWT_SECRET" == "CHANGE_THIS_TO_64_CHAR_RANDOM_STRING" ] || [ -z "$JWT_SECRET" ]; then
    echo -e "${RED}❌ JWT_SECRET not configured in server/.env${NC}"
    echo "Generate a secret with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
    exit 1
fi

echo -e "${GREEN}✅ Environment files validated${NC}"

# Pull latest code
echo ""
echo "📥 Pulling latest code from Git..."
git pull origin main

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd server
npm install --production

# Build backend
echo ""
echo "🔨 Building backend..."
npm run build

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd ..
npm install

# Build frontend
echo ""
echo "🔨 Building frontend..."
npm run build

# Restart PM2
echo ""
echo "🔄 Restarting application with PM2..."
pm2 restart ecosystem.config.js

# Check status
echo ""
echo "📊 Application Status:"
pm2 status

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "📝 Next steps:"
echo "  1. Check logs: pm2 logs lms-backend"
echo "  2. Monitor status: pm2 monit"
echo "  3. Test application: curl https://yourdomain.com/health"
echo ""


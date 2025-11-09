#!/bin/bash

# LMS SLNCity - Server Startup Script
# Starts PostgreSQL, Backend, and Frontend

PROJECT_ROOT="/Users/ramgopal/LMS-SLNCity-V1"
BACKEND_DIR="$PROJECT_ROOT/server"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Starting LMS SLNCity Servers...${NC}"
echo ""

# Kill any existing processes
echo -e "${YELLOW}Cleaning up old processes...${NC}"
pkill -f "node dist/index.js" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
sleep 2

# Start PostgreSQL
echo -e "${YELLOW}Starting PostgreSQL...${NC}"
cd "$PROJECT_ROOT"
docker compose up -d postgres 2>&1 | tail -3
sleep 5

# Verify database is running
if docker ps | grep -q "lms-slncity-postgres"; then
    echo -e "${GREEN}✅ PostgreSQL is running${NC}"
else
    echo -e "${RED}❌ PostgreSQL failed to start${NC}"
    exit 1
fi
echo ""

# Start Backend
echo -e "${YELLOW}Starting Backend Server...${NC}"
cd "$BACKEND_DIR"
nohup node dist/index.js > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
sleep 2

# Start Frontend
echo -e "${YELLOW}Starting Frontend Server...${NC}"
cd "$PROJECT_ROOT"
nohup npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
sleep 3

echo ""
echo -e "${GREEN}✅ All servers started!${NC}"
echo ""
echo -e "${YELLOW}📊 Access:${NC}"
echo -e "  Backend:  ${GREEN}http://localhost:5001${NC}"
echo -e "  Frontend: ${GREEN}http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}📝 Logs:${NC}"
echo -e "  Backend:  tail -f /tmp/backend.log"
echo -e "  Frontend: tail -f /tmp/frontend.log"
echo ""
echo -e "${YELLOW}🛑 To stop servers:${NC}"
echo -e "  kill $BACKEND_PID $FRONTEND_PID"
echo ""


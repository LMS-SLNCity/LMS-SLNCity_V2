#!/bin/bash

# ============================================
# LOCAL DEVELOPMENT SETUP SCRIPT
# ============================================
# This script sets up the complete LMS system for local development
# Run this script from the project root directory

set -e  # Exit on any error

echo "============================================"
echo "🚀 LMS Local Development Setup"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Step 1: Checking prerequisites...${NC}"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version)${NC}"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm --version)${NC}"

# Check for Docker/Podman
if command -v podman &> /dev/null; then
    CONTAINER_CMD="podman"
    COMPOSE_CMD="podman-compose"
    echo -e "${GREEN}✅ Podman found${NC}"
elif command -v docker &> /dev/null; then
    CONTAINER_CMD="docker"
    COMPOSE_CMD="docker-compose"
    echo -e "${GREEN}✅ Docker found${NC}"
else
    echo -e "${RED}❌ Neither Docker nor Podman is installed. Please install one of them.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📋 Step 2: Installing dependencies...${NC}"
echo ""

# Install frontend dependencies
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
npm install

# Install backend dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
cd server
npm install
cd ..

echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

echo -e "${BLUE}📋 Step 3: Setting up PostgreSQL database...${NC}"
echo ""

# Check if container is already running
if $CONTAINER_CMD ps | grep -q lms-postgres; then
    echo -e "${YELLOW}⚠️  PostgreSQL container is already running${NC}"
    read -p "Do you want to recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Stopping and removing existing container...${NC}"
        $CONTAINER_CMD stop lms-postgres || true
        $CONTAINER_CMD rm lms-postgres || true
    else
        echo -e "${YELLOW}Using existing container${NC}"
    fi
fi

# Start PostgreSQL container if not running
if ! $CONTAINER_CMD ps | grep -q lms-postgres; then
    echo -e "${YELLOW}Starting PostgreSQL container...${NC}"
    
    # Check if using docker-compose or podman-compose
    if [ -f "docker-compose.yml" ]; then
        $COMPOSE_CMD up -d
    else
        # Fallback to direct container run
        $CONTAINER_CMD run -d \
            --name lms-postgres \
            -e POSTGRES_USER=lms_user \
            -e POSTGRES_PASSWORD=lms_password \
            -e POSTGRES_DB=lms_slncity \
            -p 5432:5432 \
            postgres:16-alpine
    fi
    
    echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
    sleep 5
fi

echo -e "${GREEN}✅ PostgreSQL container is running${NC}"
echo ""

echo -e "${BLUE}📋 Step 4: Initializing database...${NC}"
echo ""

# Initialize database schema
echo -e "${YELLOW}Creating database schema...${NC}"
$CONTAINER_CMD exec -i lms-postgres psql -U lms_user -d lms_slncity < server/db/init.sql

# Seed development data
echo -e "${YELLOW}Seeding development data...${NC}"
$CONTAINER_CMD exec -i lms-postgres psql -U lms_user -d lms_slncity < server/db/seed-development.sql

# Run migrations
echo -e "${YELLOW}Running database migrations...${NC}"
$CONTAINER_CMD exec -i lms-postgres psql -U lms_user -d lms_slncity < server/db/migrations/002_audit_retention_policies.sql
$CONTAINER_CMD exec -i lms-postgres psql -U lms_user -d lms_slncity < server/db/migrations/007_add_sample_type_to_templates.sql

echo -e "${GREEN}✅ Database initialized${NC}"
echo ""

echo "============================================"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "============================================"
echo ""
echo -e "${BLUE}🔑 LOGIN CREDENTIALS:${NC}"
echo ""
echo "Staff Users (password: 'password'):"
echo "  • sudo / password       → Full system access"
echo "  • admin / password      → Administrative access"
echo "  • reception / password  → Patient registration"
echo "  • phlebotomy / password → Sample collection"
echo "  • lab / password        → Result entry"
echo "  • approver / password   → Result approval"
echo ""
echo "B2B Clients (password: 'client'):"
echo "  • City Diagnostic Center / client"
echo "  • Apollo Diagnostics / client"
echo "  • Max Healthcare / client"
echo ""
echo "============================================"
echo -e "${BLUE}🚀 TO START THE APPLICATION:${NC}"
echo "============================================"
echo ""
echo "1. Start Backend (in one terminal):"
echo "   cd server"
echo "   npm run dev"
echo ""
echo "2. Start Frontend (in another terminal):"
echo "   npm run dev"
echo ""
echo "3. Open browser:"
echo "   http://localhost:3000"
echo ""
echo "============================================"
echo -e "${YELLOW}📝 NOTES:${NC}"
echo "============================================"
echo ""
echo "• Backend runs on: http://localhost:5000"
echo "• Frontend runs on: http://localhost:3000"
echo "• Database runs on: localhost:5432"
echo ""
echo "• To stop PostgreSQL: $COMPOSE_CMD down"
echo "• To view logs: $CONTAINER_CMD logs lms-postgres"
echo ""
echo "============================================"


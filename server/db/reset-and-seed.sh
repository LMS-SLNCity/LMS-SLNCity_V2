#!/bin/bash
set -e

echo "============================================"
echo "🔄 RESETTING DATABASE WITH CLEAN SEED DATA"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database connection details
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="lms_slncity"
DB_USER="lms_user"
export PGPASSWORD="lms_password"

echo ""
echo "${YELLOW}⚠️  WARNING: This will DELETE ALL DATA in the database!${NC}"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

echo ""
echo "Step 1: Checking database connection..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    echo "${GREEN}✅ Database connection successful${NC}"
else
    echo "${RED}❌ Cannot connect to database${NC}"
    echo "Make sure PostgreSQL is running and credentials are correct"
    exit 1
fi

echo ""
echo "Step 2: Running clean seed script..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$(dirname "$0")/clean-seed.sql"

if [ $? -eq 0 ]; then
    echo ""
    echo "${GREEN}============================================${NC}"
    echo "${GREEN}✅ DATABASE RESET AND SEEDED SUCCESSFULLY!${NC}"
    echo "${GREEN}============================================${NC}"
    echo ""
    echo "📋 Login Credentials:"
    echo "   Staff Users:"
    echo "   - sudo / Password123"
    echo "   - admin / Password123"
    echo "   - reception / Password123"
    echo ""
    echo "   B2B Clients:"
    echo "   - City Diagnostic Center / Client123"
    echo "   - Apollo Diagnostics / Client123"
    echo "   - Max Healthcare / Client123"
    echo ""
    echo "💰 Client Balances:"
    echo "   - City Diagnostic Center: ₹625.00 (pending)"
    echo "   - Apollo Diagnostics: ₹0.00 (fully paid)"
    echo "   - Max Healthcare: ₹240.00 (pending)"
    echo ""
else
    echo ""
    echo "${RED}❌ Error occurred during seeding${NC}"
    exit 1
fi


#!/bin/bash
# Quick Start Script for Development Environment
# This script starts the database and backend server with all test data

set -e

echo "=========================================="
echo "🚀 Starting LMS Development Environment"
echo "=========================================="

# Step 1: Start PostgreSQL with development data
echo ""
echo "Step 1: Starting PostgreSQL database..."
podman-compose -f docker-compose.dev.yml up -d

echo "Waiting for database to be ready..."
sleep 10

# Check if database is healthy
if podman exec lms-postgres-dev pg_isready -U lms_user -d lms_slncity > /dev/null 2>&1; then
    echo "✅ Database is ready!"
else
    echo "❌ Database failed to start. Check logs with: podman logs lms-postgres-dev"
    exit 1
fi

# Step 2: Load development seed data
echo ""
echo "Step 2: Loading development seed data..."
podman exec -i lms-postgres-dev psql -U lms_user -d lms_slncity < server/db/seed-development.sql > /dev/null 2>&1
echo "✅ Seed data loaded!"

# Step 3: Verify data
echo ""
echo "Step 3: Verifying database..."
COUNTS=$(podman exec lms-postgres-dev psql -U lms_user -d lms_slncity -t -c "
SELECT 
    (SELECT COUNT(*) FROM users) as users,
    (SELECT COUNT(*) FROM clients) as clients,
    (SELECT COUNT(*) FROM patients) as patients,
    (SELECT COUNT(*) FROM visits) as visits;
")
echo "✅ Database verified: $COUNTS"

# Step 4: Start backend server
echo ""
echo "Step 4: Starting backend server..."
echo "Run this command in a new terminal:"
echo ""
echo "  cd server && nvm use 18 && npm run dev"
echo ""

echo "=========================================="
echo "✅ Development environment is ready!"
echo "=========================================="
echo ""
echo "📝 Default Credentials:"
echo ""
echo "  Staff Users (Password: Password123):"
echo "    - sudo / Password123"
echo "    - admin / Password123"
echo "    - reception / Password123"
echo "    - phlebo / Password123"
echo "    - labtech / Password123"
echo "    - approver / Password123"
echo ""
echo "  B2B Clients (Password: Client123):"
echo "    - Client ID: 1 / Client123 (City Diagnostic Center)"
echo "    - Client ID: 2 / Client123 (Apollo Diagnostics)"
echo "    - Client ID: 3 / Client123 (Max Healthcare)"
echo ""
echo "🔗 URLs:"
echo "  - Backend API: http://localhost:5001"
echo "  - Health Check: http://localhost:5001/health"
echo "  - Database: localhost:5433"
echo ""
echo "📊 Sample Data:"
echo "  - 6 staff users"
echo "  - 5 test templates"
echo "  - 5 B2B clients"
echo "  - 5 sample patients"
echo "  - 3 sample visits"
echo "  - 2 ledger entries"
echo ""
echo "🛑 To stop:"
echo "  podman-compose -f docker-compose.dev.yml down"
echo ""
echo "=========================================="


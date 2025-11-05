#!/bin/bash
# Development Database Setup Script
# This script sets up the database with ALL test data for development

set -e

echo "=========================================="
echo "Setting up DEVELOPMENT database..."
echo "=========================================="

# Database connection details
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"
DB_USER="${DB_USER:-lms_user}"
DB_PASSWORD="${DB_PASSWORD:-lms_password}"
DB_NAME="${DB_NAME:-lms_slncity}"

# Check if running in Docker
if [ -f /.dockerenv ]; then
    echo "Running inside Docker container"
    PSQL_CMD="psql -U $DB_USER -d $DB_NAME"
else
    echo "Running on host machine"
    export PGPASSWORD="$DB_PASSWORD"
    PSQL_CMD="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
fi

echo ""
echo "Step 1: Clearing existing data..."
$PSQL_CMD <<EOF
TRUNCATE TABLE 
    audit_logs,
    patient_report_access_logs,
    visit_tests,
    visits,
    ledger_entries,
    patients,
    referral_doctors,
    signatories,
    branches,
    b2b_client_logins,
    client_prices,
    clients,
    test_templates,
    users
CASCADE;

-- Reset sequences
ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS test_templates_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS clients_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS patients_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS visits_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS visit_code_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS ledger_entries_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS branches_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS signatories_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS referral_doctors_id_seq RESTART WITH 1;

SELECT 'All data cleared successfully' AS status;
EOF

echo ""
echo "Step 2: Loading development seed data..."
if [ -f /.dockerenv ]; then
    psql -U $DB_USER -d $DB_NAME -f /docker-entrypoint-initdb.d/seed-development.sql
else
    $PSQL_CMD -f "$(dirname "$0")/seed-development.sql"
fi

echo ""
echo "=========================================="
echo "✅ DEVELOPMENT database setup complete!"
echo "=========================================="
echo ""
echo "📝 Development Credentials:"
echo "   Staff Users (Password: Password123):"
echo "   - sudo / Password123 (SUDO role)"
echo "   - admin / Password123 (ADMIN role)"
echo "   - reception / Password123 (RECEPTION role)"
echo "   - phlebo / Password123 (PHLEBOTOMY role)"
echo "   - labtech / Password123 (LAB role)"
echo "   - approver / Password123 (APPROVER role)"
echo ""
echo "   B2B Clients (Password: Client123):"
echo "   - Client ID: 1 (City Diagnostic Center)"
echo "   - Client ID: 2 (Apollo Diagnostics)"
echo "   - Client ID: 3 (Max Healthcare)"
echo "   - Client ID: 4 (Fortis Hospital)"
echo "   - Client ID: 5 (Medanta Clinic)"
echo ""
echo "📊 Sample Data:"
echo "   - 6 staff users"
echo "   - 5 test templates"
echo "   - 5 B2B clients"
echo "   - 5 sample patients"
echo "   - 3 sample visits"
echo "   - 2 ledger entries"
echo ""
echo "=========================================="


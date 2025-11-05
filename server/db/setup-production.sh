#!/bin/bash
# Production Database Setup Script
# This script sets up the database with ONLY essential data for production

set -e

echo "=========================================="
echo "⚠️  PRODUCTION DATABASE SETUP"
echo "=========================================="
echo ""
echo "This will set up a PRODUCTION database with:"
echo "  - Essential schema only"
echo "  - 2 default users (sudo, admin)"
echo "  - 3 sample test templates"
echo "  - NO test data"
echo "  - NO sample visits"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Setup cancelled."
    exit 0
fi

# Database connection details
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
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
echo "Step 2: Loading production seed data..."
if [ -f /.dockerenv ]; then
    psql -U $DB_USER -d $DB_NAME -f /docker-entrypoint-initdb.d/seed-production.sql
else
    $PSQL_CMD -f "$(dirname "$0")/seed-production.sql"
fi

echo ""
echo "=========================================="
echo "✅ PRODUCTION database setup complete!"
echo "=========================================="
echo ""
echo "⚠️  IMPORTANT SECURITY NOTES:"
echo "=========================================="
echo ""
echo "1. DEFAULT PASSWORDS:"
echo "   All users have password: ChangeMe@123"
echo "   🔴 CHANGE THESE IMMEDIATELY!"
echo ""
echo "2. DEFAULT USERS:"
echo "   - sudo / ChangeMe@123 (SUDO role)"
echo "   - admin / ChangeMe@123 (ADMIN role)"
echo ""
echo "3. NEXT STEPS:"
echo "   ✓ Change all default passwords"
echo "   ✓ Add your actual test templates"
echo "   ✓ Add your branch information"
echo "   ✓ Add your signatory information"
echo "   ✓ Set up B2B clients"
echo "   ✓ Configure SSL certificates"
echo "   ✓ Set up firewall rules"
echo "   ✓ Configure backup schedule"
echo "   ✓ Set up monitoring"
echo ""
echo "4. TO CHANGE PASSWORDS:"
echo "   Use the admin panel or run:"
echo "   UPDATE users SET password_hash = crypt('NewPassword', gen_salt('bf'));"
echo ""
echo "=========================================="


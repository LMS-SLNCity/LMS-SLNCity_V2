#!/bin/bash
# Production Database Setup Script
# ⚠️ WARNING: This script DELETES ALL DATA and resets the database
# 🛡️ ONLY use this for INITIAL setup - NEVER on a running production system with real data

set -e

echo "=========================================="
echo "🚨 CRITICAL WARNING - PRODUCTION DATABASE SETUP"
echo "=========================================="
echo ""
echo "⚠️  THIS SCRIPT WILL DELETE ALL EXISTING DATA!"
echo ""
echo "This script is ONLY for:"
echo "  ✓ Initial production setup (first time)"
echo "  ✓ Setting up a new empty production database"
echo ""
echo "❌ NEVER run this if you have:"
echo "  ✗ Real patient data"
echo "  ✗ Real visit records"
echo "  ✗ Real test results"
echo "  ✗ Any production data you want to keep"
echo ""
echo "This will:"
echo "  - DELETE ALL existing data (TRUNCATE all tables)"
echo "  - Reset all sequences to 1"
echo "  - Load only 2 default users (sudo, admin)"
echo "  - Load 3 sample test templates"
echo "  - Load NO test data or sample visits"
echo ""
echo "=========================================="
echo ""

# Check if this is truly a fresh installation
read -p "Is this a FRESH installation with NO production data? (yes/no): " fresh_install

if [ "$fresh_install" != "yes" ]; then
    echo ""
    echo "❌ Setup cancelled."
    echo ""
    echo "If you need to update an existing production database:"
    echo "  1. Create a backup first: ~/backup-database.sh"
    echo "  2. Use migration scripts instead of this setup script"
    echo "  3. Never run TRUNCATE on production data"
    echo ""
    exit 0
fi

echo ""
read -p "Type 'DELETE ALL DATA' to confirm (case-sensitive): " confirm

if [ "$confirm" != "DELETE ALL DATA" ]; then
    echo "❌ Confirmation failed. Setup cancelled."
    exit 0
fi

echo ""
read -p "Final confirmation - Type 'I UNDERSTAND' to proceed: " final_confirm

if [ "$final_confirm" != "I UNDERSTAND" ]; then
    echo "❌ Final confirmation failed. Setup cancelled."
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
echo "=========================================="
echo "⚠️  CREATING BACKUP BEFORE CLEARING DATA..."
echo "=========================================="

# Create backup before clearing (if data exists)
BACKUP_DIR=~/backups
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/BEFORE_SETUP_${DATE}.sql"

if [ -f /.dockerenv ]; then
    pg_dump -U $DB_USER $DB_NAME > $BACKUP_FILE 2>/dev/null || echo "No existing data to backup"
else
    PGPASSWORD="$DB_PASSWORD" pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME > $BACKUP_FILE 2>/dev/null || echo "No existing data to backup"
fi

if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    gzip $BACKUP_FILE
    echo "✅ Backup created: ${BACKUP_FILE}.gz"
else
    rm -f $BACKUP_FILE
    echo "ℹ️  No existing data to backup (fresh installation)"
fi

echo ""
echo "=========================================="
echo "⚠️  Step 1: Clearing existing data..."
echo "=========================================="
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


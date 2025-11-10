#!/bin/bash
# Migration Runner Script
# Runs all database migrations in sequence

set -e

echo "=========================================="
echo "🔄 Running Database Migrations"
echo "=========================================="

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
    MIGRATIONS_DIR="/docker-entrypoint-initdb.d/migrations"
else
    echo "Running on host machine"
    export PGPASSWORD="$DB_PASSWORD"
    PSQL_CMD="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
    MIGRATIONS_DIR="$(dirname "$0")/migrations"
fi

# Create migrations tracking table if it doesn't exist
echo "Creating migrations tracking table..."
$PSQL_CMD <<EOF
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF

# List of migrations in order
MIGRATIONS=(
    "001_enhance_audit_logs.sql"
    "002_audit_retention_policies.sql"
    "006_add_user_permissions.sql"
    "007_add_sample_type_to_templates.sql"
    "008_add_units_management.sql"
)

# Run each migration
for migration in "${MIGRATIONS[@]}"; do
    # Check if migration has already been applied
    APPLIED=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM schema_migrations WHERE migration_name = '$migration';")
    
    if [ "$APPLIED" -gt 0 ]; then
        echo "⏭️  Skipping $migration (already applied)"
    else
        echo "▶️  Running $migration..."
        if [ -f "$MIGRATIONS_DIR/$migration" ]; then
            $PSQL_CMD -f "$MIGRATIONS_DIR/$migration"
            $PSQL_CMD -c "INSERT INTO schema_migrations (migration_name) VALUES ('$migration');"
            echo "✅ $migration completed"
        else
            echo "⚠️  Warning: $migration not found, skipping"
        fi
    fi
done

echo ""
echo "=========================================="
echo "✅ All migrations completed!"
echo "=========================================="


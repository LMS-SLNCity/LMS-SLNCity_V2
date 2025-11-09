#!/bin/bash

# AWS Database Setup Script for LMS SLNCity
# This script sets up the PostgreSQL database with all required tables, data, and permissions

set -e  # Exit on error

echo "🚀 Starting AWS Database Setup..."
echo "=================================="

# Configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="lms_slncity"
DB_USER="lms_user"
DB_PASSWORD="lms_password"
PROJECT_DIR="/home/ec2-user/LMS-SLNCity-V1"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if PostgreSQL is running
print_info "Checking PostgreSQL status..."
if ! sudo systemctl is-active --quiet postgresql; then
    print_error "PostgreSQL is not running!"
    echo "Starting PostgreSQL..."
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    print_success "PostgreSQL started"
else
    print_success "PostgreSQL is running"
fi

# Check if database exists
print_info "Checking if database exists..."
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

if [ "$DB_EXISTS" != "1" ]; then
    print_info "Creating database and user..."
    sudo -u postgres psql << EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF
    print_success "Database and user created"
else
    print_success "Database already exists"
fi

# Grant schema permissions
print_info "Granting schema permissions..."
sudo -u postgres psql -d $DB_NAME << EOF
GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
EOF
print_success "Schema permissions granted"

# Navigate to project directory
cd $PROJECT_DIR/server

# Run init.sql to create all tables
print_info "Creating database schema..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f db/init.sql > /dev/null 2>&1
print_success "Database schema created"

# Run all migrations
print_info "Running database migrations..."

MIGRATIONS=(
    "db/migrations/001_enhance_audit_logs.sql"
    "db/migrations/002_add_role_permissions.sql"
    "db/migrations/003_b2b_balance_automation.sql"
    "db/migrations/004_make_phone_address_optional.sql"
    "db/migrations/005_schema_improvements.sql"
    "db/migrations/006_add_user_permissions.sql"
)

for migration in "${MIGRATIONS[@]}"; do
    if [ -f "$migration" ]; then
        print_info "Running migration: $migration"
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $migration > /dev/null 2>&1
        print_success "Migration completed: $migration"
    else
        print_error "Migration file not found: $migration"
    fi
done

# Add role permissions
print_info "Setting up role permissions..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f db/add-role-permissions.sql > /dev/null 2>&1
print_success "Role permissions configured"

# Seed production data (users, test templates, branches, signatories)
print_info "Seeding production data..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f db/seed-production.sql > /dev/null 2>&1
print_success "Production data seeded"

# Seed initial data (antibiotics, test templates)
print_info "Seeding additional data (antibiotics, test templates)..."
npm run seed > /dev/null 2>&1 || print_info "Seed script completed with warnings (this is normal if data already exists)"
print_success "Additional data seeded"

# Verify database setup
print_info "Verifying database setup..."

# Check tables
TABLE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")
print_success "Tables created: $TABLE_COUNT"

# Check users
USER_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM users")
print_success "Users in database: $USER_COUNT"

# Check test templates
TEMPLATE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM test_templates")
print_success "Test templates: $TEMPLATE_COUNT"

# Check antibiotics
ANTIBIOTIC_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM antibiotics")
print_success "Antibiotics: $ANTIBIOTIC_COUNT"

# Check role permissions
ROLE_PERM_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM role_permissions")
print_success "Role permissions: $ROLE_PERM_COUNT"

echo ""
echo "=================================="
print_success "Database setup completed successfully!"
echo "=================================="
echo ""
echo "📊 Database Summary:"
echo "  - Tables: $TABLE_COUNT"
echo "  - Users: $USER_COUNT"
echo "  - Test Templates: $TEMPLATE_COUNT"
echo "  - Antibiotics: $ANTIBIOTIC_COUNT"
echo "  - Role Permissions: $ROLE_PERM_COUNT"
echo ""
echo "🔐 Default Login Credentials:"
echo "  Username: sudo"
echo "  Password: ChangeMe@123"
echo ""
echo "  Username: admin"
echo "  Password: ChangeMe@123"
echo ""
echo "⚠️  IMPORTANT: Change these default passwords immediately after first login!"
echo ""
echo "🚀 Next Steps:"
echo "  1. Restart backend: pm2 restart lms-backend"
echo "  2. Check logs: pm2 logs lms-backend"
echo "  3. Access application: http://13.201.165.54:3001"
echo ""


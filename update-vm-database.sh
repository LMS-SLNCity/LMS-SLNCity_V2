#!/bin/bash

# Update VM Database Schema Script
# This script updates the database schema to match local development

set -e  # Exit on any error

echo "=========================================="
echo "VM Database Schema Update"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if Docker is running
if ! docker compose ps | grep -q "postgres"; then
    print_error "PostgreSQL container is not running!"
    echo "Please start the services first:"
    echo "  docker compose up -d"
    exit 1
fi
print_success "PostgreSQL container is running"

echo ""
print_info "This script will update your database schema to include:"
echo "  - Sample rejection feature (result_rejections table)"
echo "  - Rejection tracking in visit_tests"
echo "  - Enhanced audit logs"
echo "  - Patient edit requests"
echo "  - Patient codes"
echo "  - Units table"
echo "  - Performance indexes"
echo ""

# Ask for confirmation
read -p "Do you want to proceed with the database update? (y/n): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    print_warning "Database update cancelled."
    exit 0
fi

echo ""
print_info "Creating database backup..."

# Create backup
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
docker compose exec -T postgres pg_dump -U lms_user lms_slncity > "$BACKUP_FILE"

if [ -f "$BACKUP_FILE" ]; then
    print_success "Database backup created: $BACKUP_FILE"
else
    print_error "Failed to create backup!"
    exit 1
fi

echo ""
print_info "Applying schema updates..."

# Apply the schema update
docker compose exec -T postgres psql -U lms_user -d lms_slncity < server/db/update-schema-to-latest.sql

if [ $? -eq 0 ]; then
    print_success "Schema update applied successfully!"
else
    print_error "Schema update failed!"
    echo ""
    print_warning "You can restore the backup with:"
    echo "  docker compose exec -T postgres psql -U lms_user -d lms_slncity < $BACKUP_FILE"
    exit 1
fi

echo ""
print_info "Verifying database schema..."

# Verify key tables exist
TABLES_TO_CHECK=(
    "result_rejections"
    "patient_edit_requests"
    "units"
    "waivers"
)

ALL_TABLES_EXIST=true

for table in "${TABLES_TO_CHECK[@]}"; do
    if docker compose exec -T postgres psql -U lms_user -d lms_slncity -c "\dt $table" | grep -q "$table"; then
        print_success "Table '$table' exists"
    else
        print_error "Table '$table' not found!"
        ALL_TABLES_EXIST=false
    fi
done

# Verify columns exist
echo ""
print_info "Verifying visit_tests columns..."

if docker compose exec -T postgres psql -U lms_user -d lms_slncity -c "\d visit_tests" | grep -q "rejection_count"; then
    print_success "Column 'rejection_count' exists in visit_tests"
else
    print_error "Column 'rejection_count' not found in visit_tests!"
    ALL_TABLES_EXIST=false
fi

if docker compose exec -T postgres psql -U lms_user -d lms_slncity -c "\d visit_tests" | grep -q "last_rejection_at"; then
    print_success "Column 'last_rejection_at' exists in visit_tests"
else
    print_error "Column 'last_rejection_at' not found in visit_tests!"
    ALL_TABLES_EXIST=false
fi

echo ""
print_info "Verifying patients columns..."

if docker compose exec -T postgres psql -U lms_user -d lms_slncity -c "\d patients" | grep -q "patient_code"; then
    print_success "Column 'patient_code' exists in patients"
else
    print_error "Column 'patient_code' not found in patients!"
    ALL_TABLES_EXIST=false
fi

echo ""
if [ "$ALL_TABLES_EXIST" = true ]; then
    print_success "All schema updates verified successfully!"
else
    print_error "Some schema updates failed verification!"
    echo ""
    print_warning "You can restore the backup with:"
    echo "  docker compose exec -T postgres psql -U lms_user -d lms_slncity < $BACKUP_FILE"
    exit 1
fi

echo ""
print_info "Restarting backend to apply changes..."
docker compose restart backend

sleep 3

if docker compose ps backend | grep -q "Up"; then
    print_success "Backend restarted successfully"
else
    print_error "Backend failed to restart!"
    echo "Check logs with: docker compose logs backend"
    exit 1
fi

echo ""
echo "=========================================="
print_success "Database Update Complete!"
echo "=========================================="
echo ""
echo "✅ Schema updated successfully"
echo "✅ Backup saved: $BACKUP_FILE"
echo "✅ Backend restarted"
echo ""
echo "New Features Available:"
echo "  ✅ Sample rejection (visible in Lab Queue)"
echo "  ✅ Referral doctor management"
echo "  ✅ Patient codes"
echo "  ✅ Enhanced audit logging"
echo "  ✅ Patient edit requests"
echo ""
echo "Test the application:"
echo "  1. Open http://YOUR_VM_IP:3000"
echo "  2. Login as lab user: lab / lab123"
echo "  3. Check if 'Reject Sample' button is visible"
echo "  4. Try adding a referral doctor"
echo ""
print_info "Backup file location: $(pwd)/$BACKUP_FILE"
print_warning "Keep this backup file safe!"
echo ""


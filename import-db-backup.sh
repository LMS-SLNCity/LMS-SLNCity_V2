#!/bin/bash

# Script to import database backup on VM
# Run this on the VM

set -e

echo "=========================================="
echo "Import Database Backup"
echo "=========================================="
echo ""

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "❌ Error: No backup file specified"
    echo ""
    echo "Usage: $0 <backup-file.sql>"
    echo ""
    echo "Available backups:"
    ls -lh *.sql 2>/dev/null || echo "  No backup files found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "📦 Backup file: $BACKUP_FILE"
echo "   Size: $(du -h "$BACKUP_FILE" | cut -f1)"
echo ""

# Check if docker is running
if ! docker compose ps postgres | grep -q "running"; then
    echo "⚠️  PostgreSQL container is not running"
    echo "   Starting PostgreSQL..."
    docker compose up -d postgres
    echo "   Waiting for PostgreSQL to be ready..."
    sleep 10
fi

echo "✓ PostgreSQL container is running"
echo ""

# Confirm before proceeding
read -p "⚠️  This will REPLACE all data in the database. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Import cancelled"
    exit 1
fi

echo ""
echo "🔄 Importing database..."
echo "   This may take a few minutes..."
echo ""

# Stop backend and frontend to avoid connection issues
echo "   Stopping backend and frontend..."
docker compose stop backend frontend

# Import database
docker compose exec -T postgres psql -U lms_user -d lms_slncity < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Database imported successfully!"
    echo ""
    
    # Verify import
    echo "🔍 Verifying import..."
    echo ""
    
    # Count users
    USERS=$(docker compose exec -T postgres psql -U lms_user -d lms_slncity -t -c "SELECT COUNT(*) FROM users;" | tr -d ' \n\r')
    echo "   Users: $USERS"
    
    # Count visits
    VISITS=$(docker compose exec -T postgres psql -U lms_user -d lms_slncity -t -c "SELECT COUNT(*) FROM visits;" | tr -d ' \n\r')
    echo "   Visits: $VISITS"
    
    # Count test templates
    TESTS=$(docker compose exec -T postgres psql -U lms_user -d lms_slncity -t -c "SELECT COUNT(*) FROM test_templates;" | tr -d ' \n\r')
    echo "   Test Templates: $TESTS"
    
    echo ""
    echo "   Restarting services..."
    docker compose up -d
    
    echo ""
    echo "=========================================="
    echo "✓ Import Complete!"
    echo "=========================================="
    echo ""
    echo "Your local database is now running on the VM!"
    echo ""
    echo "Access the application at:"
    echo "  🌐 http://13.201.165.54:3000"
    echo ""
    echo "Login with your local credentials"
    echo ""
else
    echo ""
    echo "❌ Error: Database import failed"
    echo ""
    echo "Restarting services..."
    docker compose up -d
    exit 1
fi


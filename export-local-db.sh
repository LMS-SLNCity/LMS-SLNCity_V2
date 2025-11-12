#!/bin/bash

# Script to export local database for VM deployment
# Run this on your LOCAL machine

set -e

echo "=========================================="
echo "Export Local Database"
echo "=========================================="
echo ""

# Check if docker is running
if ! docker compose ps postgres | grep -q "running"; then
    echo "❌ Error: PostgreSQL container is not running"
    echo "Start it with: docker compose up -d postgres"
    exit 1
fi

echo "✓ PostgreSQL container is running"
echo ""

# Create backup directory
BACKUP_DIR="db-backup"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/lms_local_backup_$TIMESTAMP.sql"

echo "📦 Exporting database..."
echo "   Output: $BACKUP_FILE"
echo ""

# Export database
docker compose exec -T postgres pg_dump -U lms_user -d lms_slncity --clean --if-exists > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✓ Database exported successfully!"
    echo ""
    
    # Get file size
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "📊 Backup Details:"
    echo "   File: $BACKUP_FILE"
    echo "   Size: $SIZE"
    echo ""
    
    # Count tables
    TABLES=$(grep -c "CREATE TABLE" "$BACKUP_FILE" || echo "0")
    echo "   Tables: $TABLES"
    echo ""
    
    echo "=========================================="
    echo "✓ Export Complete!"
    echo "=========================================="
    echo ""
    echo "Next Steps:"
    echo ""
    echo "1. Copy backup to VM:"
    echo "   scp $BACKUP_FILE ec2-user@13.201.165.54:~/LMS-SLNCity-V1/"
    echo ""
    echo "2. On VM, run:"
    echo "   cd ~/LMS-SLNCity-V1"
    echo "   ./import-db-backup.sh $(basename $BACKUP_FILE)"
    echo ""
else
    echo "❌ Error: Database export failed"
    exit 1
fi


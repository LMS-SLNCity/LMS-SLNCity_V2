#!/bin/bash
#
# Complete Application Snapshot Script
# Creates a full backup of the entire LMS application including:
# - Database
# - Docker volumes
# - Application code
# - Configuration files (.env)
# - Uploaded files (signatures, etc.)
#
# Usage: ./complete-app-snapshot.sh
#

set -e  # Exit on error

# Configuration
SNAPSHOT_DIR="/home/ec2-user/app-snapshots"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SNAPSHOT_NAME="lms_snapshot_$TIMESTAMP"
SNAPSHOT_PATH="$SNAPSHOT_DIR/$SNAPSHOT_NAME"
APP_DIR="/home/ec2-user/LMS-SLNCity-V1"
RETENTION_DAYS=30

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}LMS Complete Application Snapshot${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Timestamp: $(date)"
echo -e "Snapshot: $SNAPSHOT_NAME"
echo ""

# Create snapshot directory
mkdir -p "$SNAPSHOT_PATH"
echo -e "${YELLOW}[1/7]${NC} Created snapshot directory: $SNAPSHOT_PATH"

# 1. Database Backup
echo -e "${YELLOW}[2/7]${NC} Backing up PostgreSQL database..."
cd "$APP_DIR"
docker compose exec -T postgres pg_dump -U lms_user lms_slncity --clean --if-exists | gzip > "$SNAPSHOT_PATH/database.sql.gz"
DB_SIZE=$(du -h "$SNAPSHOT_PATH/database.sql.gz" | cut -f1)
echo -e "${GREEN}✓${NC} Database backup complete ($DB_SIZE)"

# 2. Docker Volume Backup (postgres_data)
echo -e "${YELLOW}[3/7]${NC} Backing up Docker volumes..."
docker run --rm \
  -v lms-slncity-v1_postgres_data:/data:ro \
  -v "$SNAPSHOT_PATH":/backup \
  alpine tar czf /backup/postgres_data.tar.gz -C /data .
VOL_SIZE=$(du -h "$SNAPSHOT_PATH/postgres_data.tar.gz" | cut -f1)
echo -e "${GREEN}✓${NC} Docker volume backup complete ($VOL_SIZE)"

# 3. Application Code Backup
echo -e "${YELLOW}[4/7]${NC} Backing up application code..."
tar czf "$SNAPSHOT_PATH/application_code.tar.gz" \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.git' \
  -C "$APP_DIR" .
CODE_SIZE=$(du -h "$SNAPSHOT_PATH/application_code.tar.gz" | cut -f1)
echo -e "${GREEN}✓${NC} Application code backup complete ($CODE_SIZE)"

# 4. Configuration Files Backup
echo -e "${YELLOW}[5/7]${NC} Backing up configuration files..."
if [ -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env" "$SNAPSHOT_PATH/env_backup"
  echo -e "${GREEN}✓${NC} .env file backed up"
else
  echo -e "${RED}⚠${NC} Warning: .env file not found"
fi

if [ -f "$APP_DIR/docker-compose.yml" ]; then
  cp "$APP_DIR/docker-compose.yml" "$SNAPSHOT_PATH/docker-compose.yml"
  echo -e "${GREEN}✓${NC} docker-compose.yml backed up"
fi

# 5. Docker Images List
echo -e "${YELLOW}[6/7]${NC} Saving Docker images list..."
docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "lms|postgres" > "$SNAPSHOT_PATH/docker_images.txt" || true
echo -e "${GREEN}✓${NC} Docker images list saved"

# 6. Create Snapshot Metadata
echo -e "${YELLOW}[7/7]${NC} Creating snapshot metadata..."
cat > "$SNAPSHOT_PATH/SNAPSHOT_INFO.txt" << EOF
LMS Application Snapshot
========================
Snapshot Name: $SNAPSHOT_NAME
Created: $(date)
Hostname: $(hostname)
User: $(whoami)

Components Backed Up:
- Database: lms_slncity (PostgreSQL 17)
- Docker Volume: postgres_data
- Application Code: /home/ec2-user/LMS-SLNCity-V1
- Configuration: .env, docker-compose.yml
- Docker Images: Listed in docker_images.txt

Snapshot Contents:
$(ls -lh "$SNAPSHOT_PATH")

Total Snapshot Size: $(du -sh "$SNAPSHOT_PATH" | cut -f1)
EOF

echo -e "${GREEN}✓${NC} Metadata created"

# 7. Create Restore Script
cat > "$SNAPSHOT_PATH/RESTORE.sh" << 'RESTORE_SCRIPT_EOF'
#!/bin/bash
# Restore script for this snapshot
# WARNING: This will REPLACE your current application!

set -e

SNAPSHOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="/home/ec2-user/LMS-SLNCity-V1"

echo "========================================="
echo "LMS Application Restore"
echo "========================================="
echo "This will restore from snapshot:"
echo "$SNAPSHOT_DIR"
echo ""
echo "WARNING: This will STOP and REPLACE your current application!"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled."
  exit 1
fi

echo ""
echo "[1/6] Stopping Docker containers..."
cd "$APP_DIR"
docker compose down

echo "[2/6] Restoring application code..."
cd "$APP_DIR"
rm -rf *
tar xzf "$SNAPSHOT_DIR/application_code.tar.gz" -C "$APP_DIR"

echo "[3/6] Restoring configuration files..."
if [ -f "$SNAPSHOT_DIR/env_backup" ]; then
  cp "$SNAPSHOT_DIR/env_backup" "$APP_DIR/.env"
fi

echo "[4/6] Restoring Docker volume..."
docker volume rm lms-slncity-v1_postgres_data || true
docker volume create lms-slncity-v1_postgres_data
docker run --rm \
  -v lms-slncity-v1_postgres_data:/data \
  -v "$SNAPSHOT_DIR":/backup \
  alpine tar xzf /backup/postgres_data.tar.gz -C /data

echo "[5/6] Starting Docker containers..."
cd "$APP_DIR"
docker compose up -d

echo "[6/6] Waiting for database to be ready..."
sleep 10

echo ""
echo "✓ Restore complete!"
echo "Application should be running at:"
echo "  Frontend: http://$(hostname -I | awk '{print $1}'):3000"
echo "  Backend:  http://$(hostname -I | awk '{print $1}'):5002"
RESTORE_SCRIPT_EOF

chmod +x "$SNAPSHOT_PATH/RESTORE.sh"
echo -e "${GREEN}✓${NC} Restore script created"

# Compress entire snapshot
echo ""
echo -e "${YELLOW}Compressing snapshot...${NC}"
cd "$SNAPSHOT_DIR"
tar czf "${SNAPSHOT_NAME}.tar.gz" "$SNAPSHOT_NAME"
FINAL_SIZE=$(du -h "${SNAPSHOT_NAME}.tar.gz" | cut -f1)
rm -rf "$SNAPSHOT_NAME"

echo -e "${GREEN}✓${NC} Snapshot compressed: ${SNAPSHOT_NAME}.tar.gz ($FINAL_SIZE)"

# Cleanup old snapshots
echo ""
echo -e "${YELLOW}Cleaning up old snapshots (keeping last $RETENTION_DAYS days)...${NC}"
find "$SNAPSHOT_DIR" -name "lms_snapshot_*.tar.gz" -mtime +$RETENTION_DAYS -delete
REMAINING=$(ls -1 "$SNAPSHOT_DIR"/lms_snapshot_*.tar.gz 2>/dev/null | wc -l)
echo -e "${GREEN}✓${NC} Cleanup complete. $REMAINING snapshots remaining."

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Snapshot Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Snapshot file: ${SNAPSHOT_DIR}/${SNAPSHOT_NAME}.tar.gz"
echo -e "Size: $FINAL_SIZE"
echo ""
echo -e "To restore from this snapshot:"
echo -e "  1. Extract: tar xzf ${SNAPSHOT_NAME}.tar.gz"
echo -e "  2. Run: cd ${SNAPSHOT_NAME} && sudo ./RESTORE.sh"
echo ""


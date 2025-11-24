#!/bin/bash
#
# Setup Automated Application Snapshots
# This script:
# 1. Checks existing cron jobs
# 2. Sets up automated daily snapshots
# 3. Verifies backup directories
#
# Usage: ./setup-automated-snapshots.sh
#

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}LMS Automated Snapshot Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check existing cron jobs
echo -e "${YELLOW}[1/5] Checking existing cron jobs...${NC}"
echo ""
if crontab -l 2>/dev/null | grep -q "backup\|snapshot"; then
  echo -e "${GREEN}✓${NC} Found existing backup/snapshot cron jobs:"
  echo ""
  crontab -l 2>/dev/null | grep -E "backup|snapshot" | while read line; do
    echo -e "  ${BLUE}→${NC} $line"
  done
else
  echo -e "${YELLOW}⚠${NC} No existing backup/snapshot cron jobs found"
fi
echo ""

# Check backup directories
echo -e "${YELLOW}[2/5] Checking backup directories...${NC}"
echo ""

# Database backups
if [ -d "/home/ec2-user/db-backups" ]; then
  DB_BACKUP_COUNT=$(ls -1 /home/ec2-user/db-backups/*.sql.gz 2>/dev/null | wc -l)
  if [ $DB_BACKUP_COUNT -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Database backup directory exists: /home/ec2-user/db-backups"
    echo -e "  Found $DB_BACKUP_COUNT database backup(s)"
    echo -e "  Latest backups:"
    ls -lht /home/ec2-user/db-backups/*.sql.gz 2>/dev/null | head -3 | while read line; do
      echo -e "    $line"
    done
  else
    echo -e "${YELLOW}⚠${NC} Database backup directory exists but is empty"
  fi
else
  echo -e "${RED}✗${NC} Database backup directory not found"
  echo -e "  Creating: /home/ec2-user/db-backups"
  mkdir -p /home/ec2-user/db-backups
fi
echo ""

# Application snapshots
if [ -d "/home/ec2-user/app-snapshots" ]; then
  SNAPSHOT_COUNT=$(ls -1 /home/ec2-user/app-snapshots/lms_snapshot_*.tar.gz 2>/dev/null | wc -l)
  if [ $SNAPSHOT_COUNT -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Application snapshot directory exists: /home/ec2-user/app-snapshots"
    echo -e "  Found $SNAPSHOT_COUNT snapshot(s)"
    echo -e "  Latest snapshots:"
    ls -lht /home/ec2-user/app-snapshots/lms_snapshot_*.tar.gz 2>/dev/null | head -3 | while read line; do
      echo -e "    $line"
    done
  else
    echo -e "${YELLOW}⚠${NC} Application snapshot directory exists but is empty"
  fi
else
  echo -e "${YELLOW}⚠${NC} Application snapshot directory not found"
  echo -e "  Creating: /home/ec2-user/app-snapshots"
  mkdir -p /home/ec2-user/app-snapshots
fi
echo ""

# Check for backup scripts
echo -e "${YELLOW}[3/5] Checking for backup scripts...${NC}"
echo ""
SCRIPTS_FOUND=0
for script in /home/ec2-user/*.sh /home/ec2-user/LMS-SLNCity-V1/*.sh; do
  if [ -f "$script" ] && grep -q "backup\|snapshot" "$script" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Found: $script"
    SCRIPTS_FOUND=$((SCRIPTS_FOUND + 1))
  fi
done

if [ $SCRIPTS_FOUND -eq 0 ]; then
  echo -e "${YELLOW}⚠${NC} No backup scripts found"
fi
echo ""

# Setup automated snapshot cron job
echo -e "${YELLOW}[4/5] Setting up automated daily snapshots...${NC}"
echo ""

SNAPSHOT_SCRIPT="/home/ec2-user/complete-app-snapshot.sh"

if [ ! -f "$SNAPSHOT_SCRIPT" ]; then
  echo -e "${RED}✗${NC} Snapshot script not found: $SNAPSHOT_SCRIPT"
  echo -e "  Please upload complete-app-snapshot.sh to /home/ec2-user/"
  exit 1
fi

# Make script executable
chmod +x "$SNAPSHOT_SCRIPT"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "complete-app-snapshot.sh"; then
  echo -e "${GREEN}✓${NC} Automated snapshot cron job already exists"
else
  echo -e "${YELLOW}→${NC} Adding automated snapshot cron job..."
  
  # Backup existing crontab
  crontab -l 2>/dev/null > /tmp/crontab.backup || true
  
  # Add new cron job (daily at 2 AM)
  (crontab -l 2>/dev/null; echo "0 2 * * * /home/ec2-user/complete-app-snapshot.sh >> /home/ec2-user/snapshot.log 2>&1") | crontab -
  
  echo -e "${GREEN}✓${NC} Automated snapshot cron job added"
  echo -e "  Schedule: Daily at 2:00 AM"
  echo -e "  Log file: /home/ec2-user/snapshot.log"
fi
echo ""

# Display current crontab
echo -e "${YELLOW}[5/5] Current cron jobs:${NC}"
echo ""
crontab -l 2>/dev/null | while read line; do
  if [[ $line == \#* ]]; then
    echo -e "  ${BLUE}$line${NC}"
  else
    echo -e "  ${GREEN}→${NC} $line"
  fi
done
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Setup Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}✓${NC} Automated snapshots configured"
echo -e "${GREEN}✓${NC} Snapshots will run daily at 2:00 AM"
echo -e "${GREEN}✓${NC} Snapshots will be stored in: /home/ec2-user/app-snapshots/"
echo -e "${GREEN}✓${NC} Old snapshots will be deleted after 30 days"
echo ""
echo -e "To manually create a snapshot now:"
echo -e "  ${YELLOW}sudo /home/ec2-user/complete-app-snapshot.sh${NC}"
echo ""
echo -e "To view snapshot logs:"
echo -e "  ${YELLOW}tail -f /home/ec2-user/snapshot.log${NC}"
echo ""


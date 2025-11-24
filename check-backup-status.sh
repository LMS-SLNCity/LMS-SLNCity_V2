#!/bin/bash
#
# Check Backup Status
# Quick script to verify backup and snapshot status
#
# Usage: ./check-backup-status.sh
#

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}LMS Backup & Snapshot Status${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Checked: $(date)"
echo ""

# 1. Check Cron Jobs
echo -e "${YELLOW}1. Cron Jobs:${NC}"
if crontab -l 2>/dev/null | grep -E "backup|snapshot" > /dev/null; then
  crontab -l 2>/dev/null | grep -E "backup|snapshot" | while read line; do
    echo -e "  ${GREEN}✓${NC} $line"
  done
else
  echo -e "  ${RED}✗${NC} No backup/snapshot cron jobs found"
fi
echo ""

# 2. Database Backups
echo -e "${YELLOW}2. Database Backups:${NC}"
if [ -d "/home/ec2-user/db-backups" ]; then
  COUNT=$(ls -1 /home/ec2-user/db-backups/*.sql.gz 2>/dev/null | wc -l)
  if [ $COUNT -gt 0 ]; then
    echo -e "  ${GREEN}✓${NC} Found $COUNT database backup(s)"
    echo -e "  ${BLUE}Latest:${NC}"
    ls -lht /home/ec2-user/db-backups/*.sql.gz 2>/dev/null | head -1 | awk '{print "    " $6, $7, $8, $9, "(" $5 ")"}'
  else
    echo -e "  ${YELLOW}⚠${NC} Directory exists but no backups found"
  fi
else
  echo -e "  ${RED}✗${NC} Backup directory not found"
fi
echo ""

# 3. Application Snapshots
echo -e "${YELLOW}3. Application Snapshots:${NC}"
if [ -d "/home/ec2-user/app-snapshots" ]; then
  COUNT=$(ls -1 /home/ec2-user/app-snapshots/lms_snapshot_*.tar.gz 2>/dev/null | wc -l)
  if [ $COUNT -gt 0 ]; then
    echo -e "  ${GREEN}✓${NC} Found $COUNT application snapshot(s)"
    echo -e "  ${BLUE}Latest:${NC}"
    ls -lht /home/ec2-user/app-snapshots/lms_snapshot_*.tar.gz 2>/dev/null | head -1 | awk '{print "    " $6, $7, $8, $9, "(" $5 ")"}'
  else
    echo -e "  ${YELLOW}⚠${NC} Directory exists but no snapshots found"
  fi
else
  echo -e "  ${RED}✗${NC} Snapshot directory not found"
fi
echo ""

# 4. Docker Status
echo -e "${YELLOW}4. Docker Containers:${NC}"
cd /home/ec2-user/LMS-SLNCity-V1 2>/dev/null || cd /home/ec2-user/LMS-SLNCity_V2 2>/dev/null || true
if docker compose ps 2>/dev/null | grep -q "Up"; then
  docker compose ps 2>/dev/null | grep "Up" | while read line; do
    echo -e "  ${GREEN}✓${NC} $(echo $line | awk '{print $1}')"
  done
else
  echo -e "  ${YELLOW}⚠${NC} No running containers found"
fi
echo ""

# 5. Disk Space
echo -e "${YELLOW}5. Disk Space:${NC}"
df -h / | tail -1 | awk '{print "  Total: " $2 ", Used: " $3 " (" $5 "), Available: " $4}'
echo ""

# 6. Recent Logs
echo -e "${YELLOW}6. Recent Backup Logs:${NC}"
if [ -f "/home/ec2-user/snapshot.log" ]; then
  echo -e "  ${BLUE}Last 5 lines from snapshot.log:${NC}"
  tail -5 /home/ec2-user/snapshot.log 2>/dev/null | while read line; do
    echo -e "    $line"
  done
else
  echo -e "  ${YELLOW}⚠${NC} No snapshot log file found"
fi
echo ""

echo -e "${BLUE}========================================${NC}"


# 🚀 Automated Backup Setup - Implementation Guide

**Objective**: Set up automated daily backups to prevent data loss  
**Time Required**: 15 minutes  
**Server**: AWS EC2 (13.201.165.54)

---

## 📋 Prerequisites

- SSH access to production server
- Docker and Docker Compose running
- LMS application deployed at `/home/ec2-user/LMS-SLNCity-V1`

---

## 🛠️ Step-by-Step Implementation

### **Step 1: Connect to Production Server**

```bash
# From your local machine
ssh ec2-user@13.201.165.54
# OR
ssh sudo@13.201.165.54
```

---

### **Step 2: Create Backup Directory**

```bash
cd /home/ec2-user
mkdir -p db-backups
chmod 755 db-backups
```

---

### **Step 3: Create Automated Backup Script**

```bash
cd /home/ec2-user/LMS-SLNCity-V1
nano backup-database.sh
```

**Paste this content**:

```bash
#!/bin/bash
set -e

# Configuration
BACKUP_DIR="/home/ec2-user/db-backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE=$(date +%Y-%m-%d)
BACKUP_FILE="$BACKUP_DIR/lms_backup_$TIMESTAMP.sql"
LOG_FILE="/home/ec2-user/backup.log"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Log start
echo "=========================================" >> "$LOG_FILE"
echo "Backup started: $(date)" >> "$LOG_FILE"

# Navigate to application directory
cd /home/ec2-user/LMS-SLNCity-V1

# Create backup
echo "📦 Creating database backup..." | tee -a "$LOG_FILE"
if docker compose exec -T postgres pg_dump -U lms_user lms_slncity --clean --if-exists > "$BACKUP_FILE" 2>> "$LOG_FILE"; then
    echo "✅ Database dump successful" | tee -a "$LOG_FILE"
else
    echo "❌ Database dump failed!" | tee -a "$LOG_FILE"
    exit 1
fi

# Compress backup
echo "🗜️  Compressing backup..." | tee -a "$LOG_FILE"
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Verify backup exists and has content
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    SIZE_BYTES=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE")
    
    if [ "$SIZE_BYTES" -gt 10240 ]; then  # At least 10KB
        echo "✅ Backup created: $BACKUP_FILE ($SIZE)" | tee -a "$LOG_FILE"
    else
        echo "⚠️  Warning: Backup file seems too small ($SIZE)" | tee -a "$LOG_FILE"
        exit 1
    fi
else
    echo "❌ Backup file not found!" | tee -a "$LOG_FILE"
    exit 1
fi

# Create a "latest" symlink for easy access
ln -sf "$BACKUP_FILE" "$BACKUP_DIR/lms_backup_latest.sql.gz"

# Delete old backups (keep last 30 days)
echo "🗑️  Cleaning up old backups..." | tee -a "$LOG_FILE"
find "$BACKUP_DIR" -name "lms_backup_*.sql.gz" -mtime +$RETENTION_DAYS -type f -delete

# Count remaining backups
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/lms_backup_*.sql.gz 2>/dev/null | wc -l)
echo "📊 Total backups: $BACKUP_COUNT" | tee -a "$LOG_FILE"

# List recent backups
echo "📁 Recent backups:" | tee -a "$LOG_FILE"
ls -lht "$BACKUP_DIR"/lms_backup_*.sql.gz | head -5 | tee -a "$LOG_FILE"

echo "Backup completed: $(date)" >> "$LOG_FILE"
echo "=========================================" >> "$LOG_FILE"
echo ""
```

**Save and exit**: `Ctrl+X`, then `Y`, then `Enter`

---

### **Step 4: Make Script Executable**

```bash
chmod +x backup-database.sh
```

---

### **Step 5: Test Backup Script**

```bash
# Run backup manually to test
./backup-database.sh

# Check if backup was created
ls -lh /home/ec2-user/db-backups/

# Verify backup content
gunzip -c /home/ec2-user/db-backups/lms_backup_latest.sql.gz | head -20
```

**Expected Output**:
```
✅ Database dump successful
🗜️  Compressing backup...
✅ Backup created: /home/ec2-user/db-backups/lms_backup_20251123_143022.sql.gz (245K)
📊 Total backups: 1
```

---

### **Step 6: Setup Automated Daily Backups (Cron)**

```bash
# Edit crontab
crontab -e
```

**Add these lines** (press `i` to insert):

```bash
# Daily database backup at 2:00 AM
0 2 * * * /home/ec2-user/LMS-SLNCity-V1/backup-database.sh

# Weekly backup verification at 3:00 AM on Sundays
0 3 * * 0 /home/ec2-user/LMS-SLNCity-V1/verify-backup.sh
```

**Save and exit**: Press `Esc`, then type `:wq`, then `Enter`

---

### **Step 7: Create Backup Verification Script**

```bash
cd /home/ec2-user/LMS-SLNCity-V1
nano verify-backup.sh
```

**Paste this content**:

```bash
#!/bin/bash
set -e

BACKUP_DIR="/home/ec2-user/db-backups"
LOG_FILE="/home/ec2-user/backup-verify.log"

echo "=========================================" >> "$LOG_FILE"
echo "Backup verification started: $(date)" >> "$LOG_FILE"

# Find latest backup
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/lms_backup_*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ No backups found!" | tee -a "$LOG_FILE"
    exit 1
fi

echo "🔍 Verifying: $LATEST_BACKUP" | tee -a "$LOG_FILE"

# Check if file is valid gzip
if gzip -t "$LATEST_BACKUP" 2>/dev/null; then
    echo "✅ Backup file is valid gzip" | tee -a "$LOG_FILE"
else
    echo "❌ Backup file is corrupted!" | tee -a "$LOG_FILE"
    exit 1
fi

# Check file size (should be > 100KB)
SIZE_BYTES=$(stat -c%s "$LATEST_BACKUP" 2>/dev/null || stat -f%z "$LATEST_BACKUP")
SIZE_MB=$(echo "scale=2; $SIZE_BYTES / 1048576" | bc)

if [ "$SIZE_BYTES" -gt 102400 ]; then
    echo "✅ Backup size is reasonable: ${SIZE_MB}MB" | tee -a "$LOG_FILE"
else
    echo "⚠️  Warning: Backup file seems too small: ${SIZE_MB}MB" | tee -a "$LOG_FILE"
fi

# Check backup age (should be < 25 hours old)
BACKUP_AGE_HOURS=$(( ($(date +%s) - $(stat -c%Y "$LATEST_BACKUP" 2>/dev/null || stat -f%m "$LATEST_BACKUP")) / 3600 ))

if [ "$BACKUP_AGE_HOURS" -lt 25 ]; then
    echo "✅ Backup is current (${BACKUP_AGE_HOURS} hours old)" | tee -a "$LOG_FILE"
else
    echo "⚠️  Warning: Backup is old (${BACKUP_AGE_HOURS} hours old)" | tee -a "$LOG_FILE"
fi

echo "Verification completed: $(date)" >> "$LOG_FILE"
echo "=========================================" >> "$LOG_FILE"
echo ""
```

**Save and exit**: `Ctrl+X`, then `Y`, then `Enter`

```bash
chmod +x verify-backup.sh
```

---

### **Step 8: Verify Cron Job is Active**

```bash
# List cron jobs
crontab -l

# Check cron service is running
sudo systemctl status cron || sudo systemctl status crond
```

---

## 🧪 Testing the Setup

### **Test 1: Manual Backup**

```bash
cd /home/ec2-user/LMS-SLNCity-V1
./backup-database.sh
```

### **Test 2: Verify Backup**

```bash
./verify-backup.sh
```

### **Test 3: Restore Backup (to test database)**

```bash
# Create test database
docker compose exec postgres psql -U lms_user -c "CREATE DATABASE lms_test;"

# Restore backup
gunzip -c /home/ec2-user/db-backups/lms_backup_latest.sql.gz | \
  docker compose exec -T postgres psql -U lms_user -d lms_test

# Verify restoration
docker compose exec postgres psql -U lms_user -d lms_test -c "
  SELECT 
    (SELECT COUNT(*) FROM users) as users,
    (SELECT COUNT(*) FROM visits) as visits,
    (SELECT COUNT(*) FROM patients) as patients;
"

# Clean up test database
docker compose exec postgres psql -U lms_user -c "DROP DATABASE lms_test;"
```

---

## 📊 Monitoring Backups

### **Check Backup Logs**

```bash
# View backup log
tail -50 /home/ec2-user/backup.log

# View verification log
tail -50 /home/ec2-user/backup-verify.log
```

### **List All Backups**

```bash
ls -lht /home/ec2-user/db-backups/
```

### **Check Disk Space**

```bash
df -h /home/ec2-user/db-backups/
```

---

## 🚨 Disaster Recovery - How to Restore

### **Scenario: Need to restore from backup**

```bash
# 1. Stop services
cd /home/ec2-user/LMS-SLNCity-V1
docker compose stop backend frontend

# 2. List available backups
ls -lht /home/ec2-user/db-backups/

# 3. Restore from specific backup
gunzip -c /home/ec2-user/db-backups/lms_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose exec -T postgres psql -U lms_user -d lms_slncity

# 4. Verify restoration
docker compose exec postgres psql -U lms_user -d lms_slncity -c "SELECT COUNT(*) FROM visits;"

# 5. Restart services
docker compose up -d
```

---

## ✅ Success Checklist

- [ ] Backup script created and executable
- [ ] Verification script created and executable
- [ ] Cron jobs configured (daily backup at 2 AM)
- [ ] Manual backup test successful
- [ ] Backup verification test successful
- [ ] Restore test successful
- [ ] Backup logs accessible

---

## 📞 Next Steps

1. **Monitor backups for 7 days** to ensure cron jobs run successfully
2. **Test restoration monthly** to verify backups are usable
3. **Consider cloud backup** (AWS S3) for off-site storage
4. **Set up alerts** for backup failures

---

**🎉 Your data is now protected with automated daily backups!**


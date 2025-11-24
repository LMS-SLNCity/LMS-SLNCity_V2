# 💾 LMS SLNCity - Data Integrity & Backup Strategy

**Last Updated**: 2025-11-23  
**Priority**: 🔴 CRITICAL - Never Lose Data Again  
**Status**: Production-Ready Framework

---

## 📋 Table of Contents

1. [Current Backup Mechanisms](#current-backup-mechanisms)
2. [Automated Backup System](#automated-backup-system)
3. [Database Integrity Measures](#database-integrity-measures)
4. [Disaster Recovery Plan](#disaster-recovery-plan)
5. [Monitoring & Alerts](#monitoring--alerts)
6. [Testing & Verification](#testing--verification)

---

## ✅ Current Backup Mechanisms

### **Existing Backup Scripts**

#### 1. **Manual Database Export** (`export-local-db.sh`)
```bash
# Export local database to file
./export-local-db.sh

# Output: db-backup/lms_local_backup_YYYYMMDD_HHMMSS.sql
# Includes: --clean --if-exists flags for safe restore
```

#### 2. **Database Import** (`import-db-backup.sh`)
```bash
# Import backup to production
./import-db-backup.sh backup_file.sql

# Features:
# - Stops backend/frontend to avoid connection issues
# - Requires confirmation before proceeding
# - Verifies import with table counts
```

#### 3. **Schema Update with Backup** (`update-vm-database.sh`)
```bash
# Automatically creates backup before schema changes
# Backup file: backup_YYYYMMDD_HHMMSS.sql
# Provides rollback instructions if update fails
```

### **Docker Volume Persistence**

```yaml
# docker-compose.yml
volumes:
  postgres_data:  # Persistent storage for PostgreSQL data
```

**Location**: Docker volume `postgres_data` stores all database files
**Persistence**: Data survives container restarts
**Risk**: Data lost if volume is deleted (`docker compose down -v`)

---

## 🤖 Automated Backup System

### **CRITICAL: Implement Automated Daily Backups**

Create automated backup script for production server:

#### **Step 1: Create Automated Backup Script**

```bash
# On production server: /home/ec2-user/LMS-SLNCity-V1/backup-database.sh
#!/bin/bash
set -e

# Configuration
BACKUP_DIR="/home/ec2-user/db-backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/lms_backup_$TIMESTAMP.sql"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
echo "📦 Creating database backup..."
docker compose exec -T postgres pg_dump -U lms_user lms_slncity --clean --if-exists > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup created: $BACKUP_FILE ($SIZE)"
else
    echo "❌ Backup failed!"
    exit 1
fi

# Delete old backups (keep last 30 days)
find "$BACKUP_DIR" -name "lms_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "🗑️  Cleaned up backups older than $RETENTION_DAYS days"

# Count remaining backups
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/lms_backup_*.sql.gz 2>/dev/null | wc -l)
echo "📊 Total backups: $BACKUP_COUNT"
```

#### **Step 2: Make Script Executable**

```bash
chmod +x /home/ec2-user/LMS-SLNCity-V1/backup-database.sh
```

#### **Step 3: Setup Cron Job for Daily Backups**

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/ec2-user/LMS-SLNCity-V1/backup-database.sh >> /home/ec2-user/backup.log 2>&1

# Add weekly backup verification at 3 AM on Sundays
0 3 * * 0 /home/ec2-user/LMS-SLNCity-V1/verify-backup.sh >> /home/ec2-user/backup-verify.log 2>&1
```

#### **Step 4: Create Backup Verification Script**

```bash
# /home/ec2-user/LMS-SLNCity-V1/verify-backup.sh
#!/bin/bash
set -e

BACKUP_DIR="/home/ec2-user/db-backups"
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/lms_backup_*.sql.gz | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ No backups found!"
    exit 1
fi

echo "🔍 Verifying latest backup: $LATEST_BACKUP"

# Check if file is valid gzip
if gzip -t "$LATEST_BACKUP" 2>/dev/null; then
    echo "✅ Backup file is valid"
else
    echo "❌ Backup file is corrupted!"
    exit 1
fi

# Check file size (should be > 100KB)
SIZE_BYTES=$(stat -f%z "$LATEST_BACKUP" 2>/dev/null || stat -c%s "$LATEST_BACKUP")
if [ "$SIZE_BYTES" -gt 102400 ]; then
    echo "✅ Backup size is reasonable: $(du -h "$LATEST_BACKUP" | cut -f1)"
else
    echo "⚠️  Warning: Backup file seems too small!"
fi
```

---

## 🛡️ Database Integrity Measures

### **1. Transaction Management**

**Current Implementation**: ✅ Already using transactions in critical operations

```typescript
// Example from server/src/db/seed.ts
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // ... database operations ...
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

**Best Practice**: Always wrap multi-step operations in transactions

### **2. Foreign Key Constraints**

**Status**: ✅ Implemented in schema

```sql
-- Example: visit_tests table
FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE
FOREIGN KEY (template_id) REFERENCES test_templates(id)
```

**Protection**: Prevents orphaned records and maintains referential integrity

### **3. Data Validation**

**Current Implementation**:
- ✅ NOT NULL constraints on critical fields
- ✅ UNIQUE constraints (usernames, patient codes, visit codes)
- ✅ CHECK constraints for data validity
- ✅ Default values for timestamps

### **4. Audit Trail**

**Status**: ✅ Comprehensive audit logging

```sql
-- audit_logs table tracks:
- All user actions
- Data changes (old_value, new_value)
- IP addresses and user agents
- Timestamps
- Resource tracking
```

**Retention**: Permanent retention for critical operations

---

## 🚨 Disaster Recovery Plan

### **Scenario 1: Accidental Data Deletion**

**Recovery Steps**:

```bash
# 1. Stop services immediately
cd /home/ec2-user/LMS-SLNCity-V1
docker compose stop backend frontend

# 2. Find latest backup
ls -lht /home/ec2-user/db-backups/

# 3. Restore from backup
gunzip -c /home/ec2-user/db-backups/lms_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose exec -T postgres psql -U lms_user -d lms_slncity

# 4. Verify restoration
docker compose exec postgres psql -U lms_user -d lms_slncity -c "SELECT COUNT(*) FROM visits;"

# 5. Restart services
docker compose up -d
```

**Recovery Time Objective (RTO)**: < 15 minutes  
**Recovery Point Objective (RPO)**: < 24 hours (daily backups)

### **Scenario 2: Database Corruption**

**Recovery Steps**:

```bash
# 1. Check PostgreSQL logs
docker compose logs postgres | tail -100

# 2. Attempt database repair
docker compose exec postgres pg_resetwal /var/lib/postgresql/data

# 3. If repair fails, restore from backup (see Scenario 1)
```

### **Scenario 3: Server Failure**

**Recovery Steps**:

```bash
# 1. Launch new EC2 instance
# 2. Install Docker and Docker Compose
# 3. Clone repository
git clone https://github.com/LMS-SLNCity/LMS-SLNCity_V2.git
cd LMS-SLNCity_V2

# 4. Copy backup from old server or S3
scp old-server:/home/ec2-user/db-backups/latest.sql.gz .

# 5. Start services
docker compose up -d postgres

# 6. Restore database
gunzip -c latest.sql.gz | docker compose exec -T postgres psql -U lms_user -d lms_slncity

# 7. Start all services
docker compose up -d
```

**Recovery Time Objective (RTO)**: < 2 hours  
**Recovery Point Objective (RPO)**: < 24 hours

---

## 📊 Monitoring & Alerts

### **1. Backup Monitoring**

Create monitoring script:

```bash
# /home/ec2-user/LMS-SLNCity-V1/check-backup-health.sh
#!/bin/bash

BACKUP_DIR="/home/ec2-user/db-backups"
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/lms_backup_*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "CRITICAL: No backups found!"
    exit 2
fi

# Check if latest backup is less than 25 hours old
BACKUP_AGE=$(find "$LATEST_BACKUP" -mtime +1 | wc -l)
if [ "$BACKUP_AGE" -gt 0 ]; then
    echo "WARNING: Latest backup is older than 24 hours!"
    exit 1
fi

echo "OK: Backup is current"
exit 0
```

### **2. Database Health Checks**

```bash
# Add to cron: Check database health every hour
0 * * * * docker compose exec -T postgres pg_isready -U lms_user -d lms_slncity || echo "Database down!" | mail -s "LMS Database Alert" admin@example.com
```

### **3. Disk Space Monitoring**

```bash
# Add to cron: Check disk space daily
0 6 * * * df -h | grep -E '(9[0-9]|100)%' && echo "Disk space critical!" | mail -s "LMS Disk Alert" admin@example.com
```

---

## ✅ Testing & Verification

### **Monthly Backup Restoration Test**

```bash
# Test backup restoration in isolated environment
# Run this on the 1st of every month

# 1. Create test database
docker compose exec postgres psql -U lms_user -c "CREATE DATABASE lms_test;"

# 2. Restore latest backup to test database
gunzip -c /home/ec2-user/db-backups/lms_backup_latest.sql.gz | \
  docker compose exec -T postgres psql -U lms_user -d lms_test

# 3. Verify data integrity
docker compose exec postgres psql -U lms_user -d lms_test -c "
  SELECT 
    (SELECT COUNT(*) FROM users) as users,
    (SELECT COUNT(*) FROM visits) as visits,
    (SELECT COUNT(*) FROM patients) as patients;
"

# 4. Clean up
docker compose exec postgres psql -U lms_user -c "DROP DATABASE lms_test;"
```

---

**Next Steps**: See [AUTOMATED-BACKUP-SETUP.md](./AUTOMATED-BACKUP-SETUP.md) for implementation guide


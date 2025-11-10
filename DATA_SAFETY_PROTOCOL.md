# 🛡️ DATA SAFETY PROTOCOL - CRITICAL

## ⚠️ PRODUCTION DATA PROTECTION

**CRITICAL RULE**: Production data must NEVER be deleted under any circumstances.

---

## 🚨 DANGER ZONES - NEVER RUN IN PRODUCTION

### ❌ FORBIDDEN COMMANDS

```bash
# ❌ NEVER RUN THESE IN PRODUCTION ❌

# Database destruction
TRUNCATE TABLE ...;
DROP TABLE ...;
DROP DATABASE ...;
DELETE FROM ... WHERE 1=1;

# Container destruction with data loss
docker-compose down -v  # -v flag deletes volumes!
docker volume rm ...
docker volume prune

# Setup scripts that clear data
./server/db/setup-development.sh  # Clears all data!
./server/db/setup-production.sh   # Clears all data!

# SQL scripts that truncate
psql ... -f clean-seed.sql        # Clears all data!
```

### ⚠️ DANGEROUS COMMANDS - USE WITH EXTREME CAUTION

```bash
# These can cause data loss if misused
docker-compose down              # OK, but never add -v flag
docker system prune -a           # Removes unused images (OK)
docker volume prune              # ❌ NEVER USE - Deletes volumes!

# Database operations
UPDATE users SET ...;            # Always use WHERE clause!
DELETE FROM ...;                 # Always use WHERE clause!
```

---

## ✅ SAFE OPERATIONS

### Safe Container Management
```bash
# Restart services (SAFE - data preserved)
docker-compose -f docker-compose.prod.yml restart

# Stop services (SAFE - data preserved)
docker-compose -f docker-compose.prod.yml stop

# Start services (SAFE)
docker-compose -f docker-compose.prod.yml start

# Rebuild without data loss (SAFE)
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🔒 MULTI-LAYER PROTECTION SYSTEM

### Layer 1: Docker Volume Persistence
- Database data stored in named Docker volume `postgres_data`
- Volume persists even if containers are removed
- Volume is NEVER deleted unless explicitly removed with `-v` flag

### Layer 2: Automated Backups
- Daily backups at 2 AM (cron job)
- Backups stored in `~/backups/`
- Last 7 days of backups retained
- Compressed with gzip

### Layer 3: Manual Backup Before Changes
- ALWAYS backup before any major change
- ALWAYS backup before updates
- ALWAYS backup before migrations

### Layer 4: Off-Site Backups
- Copy backups to S3 or external storage
- Protects against server failure

---

## 📋 MANDATORY PROCEDURES

### Before ANY Production Change

```bash
# 1. ALWAYS CREATE BACKUP FIRST
~/backup-database.sh

# 2. Verify backup exists
ls -lh ~/backups/ | tail -1

# 3. Document what you're about to do
echo "$(date): About to [describe change]" >> ~/change-log.txt

# 4. Now proceed with change
```

### After ANY Production Change

```bash
# 1. Verify data integrity
docker exec -it lms-postgres psql -U lms_user -d lms_slncity -c "SELECT COUNT(*) FROM users;"
docker exec -it lms-postgres psql -U lms_user -d lms_slncity -c "SELECT COUNT(*) FROM visits;"

# 2. Check application logs
docker-compose -f docker-compose.prod.yml logs --tail=50

# 3. Document completion
echo "$(date): Change completed successfully" >> ~/change-log.txt
```

---

## 💾 BACKUP STRATEGY

### Automated Daily Backups

```bash
# Runs daily at 2 AM
0 2 * * * ~/backup-database.sh >> ~/backup.log 2>&1
```

### Manual Backup (Before Changes)

```bash
# Create immediate backup
~/backup-database.sh

# Verify backup
ls -lh ~/backups/ | tail -1
```

### Before Major Updates

```bash
# Create special backup with descriptive name
DATE=$(date +%Y%m%d_%H%M%S)
docker exec lms-postgres pg_dump -U lms_user lms_slncity > ~/backups/BEFORE_UPDATE_${DATE}.sql
gzip ~/backups/BEFORE_UPDATE_${DATE}.sql
```

---

## 🔄 SAFE UPDATE PROCEDURE

```bash
# 1. BACKUP FIRST!
~/backup-database.sh

# 2. Pull latest code
cd ~/LMS-SLNCity-V1
git pull origin main

# 3. Stop services (data preserved in volume)
docker-compose -f docker-compose.prod.yml down

# 4. Rebuild images
docker-compose -f docker-compose.prod.yml build --no-cache

# 5. Start services
docker-compose -f docker-compose.prod.yml up -d

# 6. Verify data integrity
docker exec -it lms-postgres psql -U lms_user -d lms_slncity -c "SELECT COUNT(*) FROM users;"
docker exec -it lms-postgres psql -U lms_user -d lms_slncity -c "SELECT COUNT(*) FROM visits;"

# 7. Test application
curl http://localhost:5002/health
```

---

## 🚨 EMERGENCY RECOVERY

### Restore from Backup

```bash
# 1. List available backups
ls -lh ~/backups/

# 2. Stop all services
docker-compose -f docker-compose.prod.yml down

# 3. Start only database
docker-compose -f docker-compose.prod.yml up -d postgres
sleep 10

# 4. Restore backup (replace YYYYMMDD_HHMMSS with actual date)
gunzip -c ~/backups/lms_backup_YYYYMMDD_HHMMSS.sql.gz | docker exec -i lms-postgres psql -U lms_user -d lms_slncity

# 5. Verify restoration
docker exec -it lms-postgres psql -U lms_user -d lms_slncity -c "SELECT COUNT(*) FROM users;"

# 6. Start all services
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🎯 KEY PRINCIPLES

1. **BACKUP BEFORE EVERYTHING** - No exceptions
2. **NEVER USE `-v` FLAG** - When stopping containers
3. **NEVER RUN TRUNCATE/DROP** - In production
4. **ALWAYS USE WHERE CLAUSE** - In UPDATE/DELETE
5. **TEST BACKUPS REGULARLY** - Restore to test environment
6. **DOCUMENT ALL CHANGES** - Keep change log

---

## ✅ PRODUCTION DATA IS SACRED

**Remember**: 
- Patient data is irreplaceable
- Visit records are legal documents
- Test results are medical records
- Financial data is audit-critical

**ALWAYS BACKUP. NEVER DELETE. PROTECT DATA AT ALL COSTS.**

---

**Last Updated**: 2025-11-10  
**Version**: 1.0  
**Status**: 🛡️ CRITICAL - READ BEFORE ANY PRODUCTION OPERATION


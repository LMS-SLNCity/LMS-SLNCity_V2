# Complete Application Snapshot & Backup Guide

## 🎯 Overview

You mentioned that a **cron job is already setup for database backups**, but you need a **complete application snapshot** so you can restore the entire application if it fails.

This guide provides:
1. Scripts to check existing database backup cron job
2. Complete application snapshot system (database + code + volumes + config)
3. Automated snapshot scheduling
4. Restore procedures

---

## 📋 Step 1: Upload Scripts to VM

Upload these 3 scripts to your VM at `/home/ec2-user/`:

1. `complete-app-snapshot.sh` - Creates full application snapshots
2. `setup-automated-snapshots.sh` - Sets up automated daily snapshots
3. `check-backup-status.sh` - Checks backup/snapshot status

**Upload command (from your local machine):**
```bash
scp complete-app-snapshot.sh setup-automated-snapshots.sh check-backup-status.sh ec2-user@13.201.165.54:/home/ec2-user/
```

---

## 📋 Step 2: Check Existing Backup Status

SSH into your VM and check the current backup status:

```bash
ssh ec2-user@13.201.165.54
cd /home/ec2-user
chmod +x *.sh
./check-backup-status.sh
```

This will show you:
- ✓ Existing cron jobs (including your database backup cron)
- ✓ Database backups in `/home/ec2-user/db-backups/`
- ✓ Application snapshots (if any)
- ✓ Docker container status
- ✓ Disk space usage

---

## 📋 Step 3: Create Your First Complete Snapshot

Run the complete application snapshot script manually to test it:

```bash
sudo ./complete-app-snapshot.sh
```

**What this backs up:**
1. ✅ **Database** - PostgreSQL dump (compressed)
2. ✅ **Docker Volumes** - `postgres_data` volume
3. ✅ **Application Code** - All source code (excluding node_modules, dist, .git)
4. ✅ **Configuration** - `.env` file, `docker-compose.yml`
5. ✅ **Docker Images** - List of current images
6. ✅ **Metadata** - Snapshot info and restore script

**Output:**
- Snapshot file: `/home/ec2-user/app-snapshots/lms_snapshot_YYYYMMDD_HHMMSS.tar.gz`
- Size: Typically 50-200 MB (compressed)

---

## 📋 Step 4: Setup Automated Daily Snapshots

Run the setup script to configure automated daily snapshots:

```bash
sudo ./setup-automated-snapshots.sh
```

**What this does:**
- ✓ Checks existing cron jobs (shows your database backup cron)
- ✓ Creates `/home/ec2-user/app-snapshots/` directory
- ✓ Adds new cron job for daily snapshots at 2:00 AM
- ✓ Keeps snapshots for 30 days (auto-cleanup)
- ✓ Logs to `/home/ec2-user/snapshot.log`

**Cron Schedule:**
```
0 2 * * * /home/ec2-user/complete-app-snapshot.sh >> /home/ec2-user/snapshot.log 2>&1
```

---

## 📋 Step 5: Verify Automated Snapshots

Check that the cron job is running:

```bash
# View cron jobs
crontab -l

# Check snapshot log (after first run)
tail -f /home/ec2-user/snapshot.log

# List snapshots
ls -lht /home/ec2-user/app-snapshots/
```

---

## 🔄 How to Restore from Snapshot

If your application fails and you need to restore from a snapshot:

### **Option 1: Automatic Restore (Recommended)**

```bash
# 1. Extract the snapshot
cd /home/ec2-user/app-snapshots
tar xzf lms_snapshot_YYYYMMDD_HHMMSS.tar.gz

# 2. Run the restore script
cd lms_snapshot_YYYYMMDD_HHMMSS
sudo ./RESTORE.sh
```

The restore script will:
1. Stop Docker containers
2. Restore application code
3. Restore configuration files
4. Restore Docker volume
5. Start Docker containers
6. Wait for database to be ready

### **Option 2: Manual Restore**

```bash
# 1. Stop containers
cd /home/ec2-user/LMS-SLNCity-V1
docker compose down

# 2. Extract snapshot
cd /home/ec2-user/app-snapshots
tar xzf lms_snapshot_YYYYMMDD_HHMMSS.tar.gz
cd lms_snapshot_YYYYMMDD_HHMMSS

# 3. Restore code
cd /home/ec2-user/LMS-SLNCity-V1
rm -rf *
tar xzf /home/ec2-user/app-snapshots/lms_snapshot_YYYYMMDD_HHMMSS/application_code.tar.gz

# 4. Restore .env
cp /home/ec2-user/app-snapshots/lms_snapshot_YYYYMMDD_HHMMSS/env_backup .env

# 5. Restore Docker volume
docker volume rm lms-slncity-v1_postgres_data
docker volume create lms-slncity-v1_postgres_data
docker run --rm \
  -v lms-slncity-v1_postgres_data:/data \
  -v /home/ec2-user/app-snapshots/lms_snapshot_YYYYMMDD_HHMMSS:/backup \
  alpine tar xzf /backup/postgres_data.tar.gz -C /data

# 6. Start containers
docker compose up -d
```

---

## 📊 Monitoring & Maintenance

### **Check Backup Status Anytime**
```bash
./check-backup-status.sh
```

### **View Snapshot Logs**
```bash
tail -100 /home/ec2-user/snapshot.log
```

### **Manual Snapshot**
```bash
sudo ./complete-app-snapshot.sh
```

### **List All Snapshots**
```bash
ls -lht /home/ec2-user/app-snapshots/
```

### **Disk Space**
```bash
df -h /
du -sh /home/ec2-user/app-snapshots/
```

---

## 🔍 What's the Difference?

| Feature | Database Backup (Existing Cron) | Complete Application Snapshot (New) |
|---------|--------------------------------|-------------------------------------|
| **What's Backed Up** | Database only | Database + Code + Volumes + Config |
| **Restore Time** | Fast (database only) | Medium (full application) |
| **Use Case** | Data recovery | Complete disaster recovery |
| **File Size** | Small (~10-50 MB) | Medium (~50-200 MB) |
| **Frequency** | Daily (your existing cron) | Daily (new cron at 2 AM) |
| **Location** | `/home/ec2-user/db-backups/` | `/home/ec2-user/app-snapshots/` |

**Recommendation:** Keep both! 
- Database backups for quick data recovery
- Application snapshots for complete disaster recovery

---

## ✅ Summary

After completing these steps, you will have:

1. ✅ **Existing database backup cron** - Continues running
2. ✅ **New application snapshot cron** - Runs daily at 2 AM
3. ✅ **30-day retention** - Old snapshots auto-deleted
4. ✅ **Complete disaster recovery** - Can restore entire application
5. ✅ **Automated & tested** - No manual intervention needed

**You will NEVER lose data again!** 🎉

---

## 🆘 Troubleshooting

### **Snapshot script fails**
```bash
# Check logs
tail -100 /home/ec2-user/snapshot.log

# Check disk space
df -h /

# Check Docker
docker ps
docker volume ls
```

### **Cron job not running**
```bash
# Check cron service
sudo systemctl status cron

# Check cron logs
sudo tail -100 /var/log/syslog | grep CRON
```

### **Restore fails**
```bash
# Check snapshot integrity
tar tzf lms_snapshot_YYYYMMDD_HHMMSS.tar.gz | head

# Check Docker
docker ps -a
docker volume ls
```

---

## 📞 Need Help?

Run the status check script to get current state:
```bash
./check-backup-status.sh
```

This shows everything you need to diagnose issues.


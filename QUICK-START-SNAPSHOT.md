# Quick Start: Complete Application Snapshot

## 🚀 5-Minute Setup

You mentioned: **"a cron is setup for db but i want a snapshot of whole application so that i can start that if this application fails with a snapshot"**

Here's your solution in 5 simple steps:

---

## Step 1: Upload Scripts (1 minute)

From your local machine:

```bash
cd /Users/ramgopal/siva/LMS-SLNCity_V2

scp complete-app-snapshot.sh setup-automated-snapshots.sh check-backup-status.sh ec2-user@13.201.165.54:/home/ec2-user/
```

---

## Step 2: SSH to VM (1 minute)

```bash
ssh ec2-user@13.201.165.54
cd /home/ec2-user
chmod +x *.sh
```

---

## Step 3: Check Current Status (1 minute)

```bash
./check-backup-status.sh
```

This shows:
- Your existing database backup cron job ✓
- Current backups
- Docker status
- Disk space

---

## Step 4: Setup Automated Snapshots (1 minute)

```bash
sudo ./setup-automated-snapshots.sh
```

This will:
- Create `/home/ec2-user/app-snapshots/` directory
- Add cron job for daily snapshots at 2 AM
- Keep snapshots for 30 days

---

## Step 5: Test It (1 minute)

```bash
sudo ./complete-app-snapshot.sh
```

This creates your first complete application snapshot!

---

## ✅ Done!

You now have:

1. **Database backups** (your existing cron) → `/home/ec2-user/db-backups/`
2. **Application snapshots** (new cron) → `/home/ec2-user/app-snapshots/`

---

## 🔄 To Restore Application

If your application fails:

```bash
cd /home/ec2-user/app-snapshots
tar xzf lms_snapshot_YYYYMMDD_HHMMSS.tar.gz
cd lms_snapshot_YYYYMMDD_HHMMSS
sudo ./RESTORE.sh
```

**That's it!** Your entire application will be restored.

---

## 📊 What Gets Backed Up?

| Component | Included |
|-----------|----------|
| Database | ✅ |
| Application Code | ✅ |
| Docker Volumes | ✅ |
| Configuration (.env) | ✅ |
| Docker Images List | ✅ |

---

## 🎯 Key Differences

**Database Backup (Existing):**
- Backs up: Database only
- Use for: Quick data recovery
- Location: `/home/ec2-user/db-backups/`

**Application Snapshot (New):**
- Backs up: Everything (database + code + volumes + config)
- Use for: Complete disaster recovery
- Location: `/home/ec2-user/app-snapshots/`

**Keep both!** They serve different purposes.

---

## 📞 Commands You'll Use

```bash
# Check status anytime
./check-backup-status.sh

# Manual snapshot
sudo ./complete-app-snapshot.sh

# View logs
tail -f /home/ec2-user/snapshot.log

# List snapshots
ls -lht /home/ec2-user/app-snapshots/

# View cron jobs
crontab -l
```

---

## 🛡️ You're Protected!

After setup:
- ✅ Automated daily snapshots at 2 AM
- ✅ 30-day retention (auto-cleanup)
- ✅ Complete disaster recovery capability
- ✅ One-command restore

**You will NEVER lose data again!** 🎉

---

For detailed instructions, see: `APPLICATION-SNAPSHOT-GUIDE.md`


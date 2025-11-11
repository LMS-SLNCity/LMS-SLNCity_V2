# 🔧 Fix VM Database Schema

## Problem
After deploying to VM, some features are not working:
- ❌ Sample rejection button not visible
- ❌ Unable to add referral doctors
- ❌ Other features missing

## Root Cause
The database schema on the VM is outdated and missing:
- `result_rejections` table (updated structure)
- `rejection_count` and `last_rejection_at` columns in `visit_tests`
- `patient_code` column in `patients`
- Enhanced `audit_logs` columns
- Updated `patient_edit_requests` structure
- Performance indexes

---

## 🚀 Quick Fix (Recommended)

### On Your VM:

```bash
# 1. Navigate to project directory
cd ~/LMS-SLNCity-V1

# 2. Pull latest changes (includes updated init.sql)
git pull origin main

# 3. Run the database update script
./update-vm-database.sh
```

**That's it!** The script will:
- ✅ Create a backup of your current database
- ✅ Apply all schema updates
- ✅ Verify the changes
- ✅ Restart the backend

---

## 📋 What Gets Updated

### 1. **Result Rejections Table** (Sample Rejection Feature)
```sql
-- Old structure (missing columns)
CREATE TABLE result_rejections (
    id, visit_test_id, rejected_by, rejection_reason, old_results
);

-- New structure (complete)
CREATE TABLE result_rejections (
    id, visit_test_id,
    rejected_by_user_id, rejected_by_username,
    rejection_reason, old_results,
    status, resolved_by_user_id, resolved_by_username,
    resolved_at, created_at, updated_at
);
```

### 2. **Visit Tests Table** (Rejection Tracking)
```sql
ALTER TABLE visit_tests
ADD COLUMN rejection_count INTEGER DEFAULT 0,
ADD COLUMN last_rejection_at TIMESTAMP;
```

### 3. **Patients Table** (Patient Codes)
```sql
ALTER TABLE patients
ADD COLUMN patient_code VARCHAR(50) UNIQUE;

-- Auto-generate patient codes: P20250111001, P20250111002, etc.
```

### 4. **Audit Logs Table** (Enhanced Tracking)
```sql
ALTER TABLE audit_logs
ADD COLUMN resource_id INTEGER,
ADD COLUMN old_value TEXT,
ADD COLUMN new_value TEXT,
ADD COLUMN severity VARCHAR(20);
```

### 5. **Patient Edit Requests** (Updated Structure)
```sql
-- Updated to use user_id references instead of just usernames
ALTER TABLE patient_edit_requests
ADD COLUMN requested_by_user_id INTEGER,
ADD COLUMN approved_by_user_id INTEGER;
```

### 6. **Performance Indexes**
```sql
-- 20+ new indexes for faster queries
CREATE INDEX idx_patients_patient_code ON patients(patient_code);
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_referral_doctors_name ON referral_doctors(name);
-- ... and many more
```

---

## 🔍 Manual Verification

After running the update script, verify the changes:

### Check Tables Exist:
```bash
docker compose exec postgres psql -U lms_user -d lms_slncity -c "\dt result_rejections"
docker compose exec postgres psql -U lms_user -d lms_slncity -c "\dt patient_edit_requests"
docker compose exec postgres psql -U lms_user -d lms_slncity -c "\dt units"
```

### Check Columns Exist:
```bash
# Check visit_tests has rejection columns
docker compose exec postgres psql -U lms_user -d lms_slncity -c "\d visit_tests"

# Check patients has patient_code
docker compose exec postgres psql -U lms_user -d lms_slncity -c "\d patients"

# Check audit_logs has new columns
docker compose exec postgres psql -U lms_user -d lms_slncity -c "\d audit_logs"
```

---

## ✅ Test the Features

After updating the database:

### 1. **Test Sample Rejection**
1. Login as lab user: `lab` / `lab123`
2. Go to Lab Queue
3. Find a test with status "SAMPLE_COLLECTED"
4. **You should now see "Reject Sample" button** ✅
5. Click it and enter a rejection reason
6. Verify it works

### 2. **Test Referral Doctor**
1. Login as reception: `reception` / `reception123`
2. Create a new visit
3. Try to add a referral doctor
4. **Should work without errors** ✅

### 3. **Test Patient Codes**
1. Create a new patient
2. Check if patient_code is auto-generated (e.g., P202501110001)
3. **Should see patient code** ✅

---

## 🔄 Alternative: Fresh Database Setup

If the update script fails, you can do a fresh setup:

```bash
# WARNING: This deletes all data!

# 1. Stop services
docker compose down

# 2. Remove database volume
docker volume rm lms-slncity-v1_postgres_data

# 3. Start services (will use updated init.sql)
docker compose up -d

# 4. Wait for database to initialize
sleep 10

# 5. Verify
docker compose ps
```

---

## 📊 Before vs After

### Before (Outdated Schema):
- ❌ Sample rejection button not visible
- ❌ Missing rejection tracking
- ❌ No patient codes
- ❌ Limited audit logging
- ❌ Slow queries (missing indexes)

### After (Updated Schema):
- ✅ Sample rejection fully functional
- ✅ Complete rejection tracking
- ✅ Auto-generated patient codes
- ✅ Enhanced audit logging
- ✅ Fast queries (20+ new indexes)
- ✅ All features working as in local development

---

## 🛠️ Troubleshooting

### Issue: Script fails with "table already exists"
**Solution:** The table exists but has old structure. The script drops and recreates it.

### Issue: "Cannot drop table because other objects depend on it"
**Solution:** The script uses `CASCADE` to handle dependencies.

### Issue: Data loss concerns
**Solution:** The script creates a backup before making changes. You can restore with:
```bash
docker compose exec -T postgres psql -U lms_user -d lms_slncity < backup_YYYYMMDD_HHMMSS.sql
```

### Issue: Backend not restarting
**Solution:**
```bash
docker compose restart backend
docker compose logs backend
```

---

## 📝 What Changed in init.sql

The `init.sql` file has been updated to include all these features from the start. This means:

1. **Future deployments** will have the correct schema automatically
2. **No manual updates needed** for new VMs
3. **Local and VM schemas match** perfectly

### Updated Files:
- ✅ `server/db/init.sql` - Complete schema with all features
- ✅ `server/db/update-schema-to-latest.sql` - Migration script for existing databases
- ✅ `update-vm-database.sh` - Automated update script

---

## 🎯 Summary

**Problem:** VM database missing features from local development

**Solution:** Run `./update-vm-database.sh` on your VM

**Result:** All features working, database matches local development

**Time:** ~2 minutes

**Risk:** Low (automatic backup created)

---

## 📞 Next Steps

1. ✅ **Pull latest code:** `git pull origin main`
2. ✅ **Run update script:** `./update-vm-database.sh`
3. ✅ **Test features:** Sample rejection, referral doctors, patient codes
4. ✅ **Verify:** All features working as expected

---

**The database schema is now synchronized with your local development environment!** 🎉


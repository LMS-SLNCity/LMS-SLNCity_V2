# Local Testing Guide

## ✅ Database Setup Complete!

The database has been successfully initialized with:
- ✅ 6 users with easy passwords
- ✅ 7 test templates with sample types
- ✅ 5 B2B clients
- ✅ Sample patients and visits
- ✅ All migrations applied

---

## 🚀 Start the Application

### Terminal 1: Start Backend
```bash
cd /Users/ramgopal/LMS-SLNCity-V1/server
npm run dev
```

**Expected output:**
```
🚀 Server running on http://localhost:5002
📊 Health check: http://localhost:5002/health
```

### Terminal 2: Start Frontend
```bash
cd /Users/ramgopal/LMS-SLNCity-V1
npm run dev
```

**Expected output:**
```
VITE ready in XXX ms
➜  Local:   http://localhost:3000/
```

---

## 🧪 Test with cURL

### 1. Health Check
```bash
# Backend runs on PORT from server/.env (5002 - avoiding macOS Control Center on 5000)
curl http://localhost:5002/health
```

**Expected:**
```json
{"status":"ok","timestamp":"2025-11-10T..."}
```

### 2. Login Test
```bash
curl -X POST http://localhost:5002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"sudo","password":"password"}'
```

**Expected:**
```json
{
  "token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user":{
    "id":1,
    "username":"sudo",
    "role":"SUDO"
  },
  "permissions":[...]
}
```

### 3. Get Test Templates
```bash
# First, save the token from login response
TOKEN="<paste_token_here>"

curl http://localhost:5002/api/test-templates \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:**
```json
[
  {
    "id":1,
    "code":"CBC",
    "name":"Complete Blood Count",
    "sampleType":"WB EDTA",
    ...
  },
  ...
]
```

---

## 🔑 Login Credentials

### Staff Users (password: "password")
| Username   | Password | Role        | Purpose                |
|------------|----------|-------------|------------------------|
| sudo       | password | SUDO        | Full system access     |
| admin      | password | ADMIN       | Administrative access  |
| reception  | password | RECEPTION   | Patient registration   |
| phlebotomy | password | PHLEBOTOMY  | Sample collection      |
| lab        | password | LAB         | Result entry           |
| approver   | password | APPROVER    | Result approval        |

### B2B Clients (password: "client")
| Client Name              | Password |
|--------------------------|----------|
| City Diagnostic Center   | client   |
| Apollo Diagnostics       | client   |
| Max Healthcare           | client   |
| Fortis Hospital          | client   |
| Medanta Clinic           | client   |

---

## ✅ Feature Testing Checklist

### 1. Basic Login & Navigation
- [ ] Login as `sudo` / `password`
- [ ] Dashboard loads without errors
- [ ] No console errors
- [ ] All menu items visible

### 2. Test Template with Sample Type
- [ ] Login as `admin` / `password`
- [ ] Go to Test Templates
- [ ] Create new template
- [ ] Set default sample type (e.g., "WB EDTA")
- [ ] Save successfully
- [ ] Verify sample type is saved

### 3. Patient Registration
- [ ] Login as `reception` / `password`
- [ ] Create new patient visit
- [ ] Select tests
- [ ] Complete registration
- [ ] Verify visit created

### 4. Sample Collection with Sample Type
- [ ] Login as `phlebotomy` / `password`
- [ ] Go to Phlebotomy Queue
- [ ] Click "Collect Sample" on a pending test
- [ ] **Verify**: Modal shows "Recommended Sample Type" banner
- [ ] **Verify**: Sample type dropdown is pre-filled
- [ ] Can change sample type if needed
- [ ] Confirm collection
- [ ] Verify status changes to "SAMPLE_COLLECTED"

### 5. B2B Sample Rejection
- [ ] Login as B2B client: `City Diagnostic Center` / `client`
- [ ] Request new visit
- [ ] Logout
- [ ] Login as `phlebotomy` / `password`
- [ ] Go to Phlebotomy Queue → Collected Samples tab
- [ ] **Verify**: B2B sample has blue background
- [ ] **Verify**: "(B2B)" badge visible
- [ ] Click "Reject Sample" button
- [ ] Enter rejection reason
- [ ] Confirm rejection
- [ ] **Verify**: Sample goes back to PENDING status

### 6. Lab Sample Rejection
- [ ] Login as `lab` / `password`
- [ ] Go to Lab Queue
- [ ] Find a collected sample
- [ ] Click "Reject Sample"
- [ ] Enter rejection reason
- [ ] Confirm rejection
- [ ] **Verify**: Sample goes back to PENDING status

### 7. Result Entry
- [ ] Login as `lab` / `password`
- [ ] Enter test results
- [ ] Submit for approval
- [ ] Verify status changes to "AWAITING_APPROVAL"

### 8. Result Approval
- [ ] Login as `approver` / `password`
- [ ] Go to Approval Queue
- [ ] Review results
- [ ] **Verify**: For Culture tests, antibiotic sensitivity table shows
- [ ] Approve results
- [ ] Verify status changes to "APPROVED"

### 9. Report Printing
- [ ] Login as any role with print permission
- [ ] Go to completed visit
- [ ] Click "Print Report"
- [ ] **Verify**: Report shows sample type
- [ ] **Verify**: All data displays correctly
- [ ] **Verify**: No localhost URLs in report

### 10. B2B Client Features
- [ ] Login as B2B client
- [ ] Request new visit
- [ ] View ledger
- [ ] **Verify**: Only sees own data
- [ ] Print report
- [ ] **Verify**: Report works correctly

---

## 🐛 Common Issues

### Backend won't start
```bash
# Check if port 5002 is in use
lsof -i :5002

# Kill the process
kill -9 <PID>

# Try again
cd /Users/ramgopal/LMS-SLNCity-V1/server
npm run dev
```

### Database connection error
```bash
# Check if PostgreSQL container is running
podman ps

# If not running, start it
podman start lms-postgres

# Check logs
podman logs lms-postgres
```

### Frontend can't connect to backend
```bash
# Verify .env file
cat /Users/ramgopal/LMS-SLNCity-V1/.env

# Should show:
# VITE_API_URL=http://localhost:5002
```

---

## 📊 Database Verification

### Check users
```bash
podman exec -i lms-postgres psql -U lms_user -d lms_slncity -c "SELECT username, role FROM users;"
```

### Check test templates with sample types
```bash
podman exec -i lms-postgres psql -U lms_user -d lms_slncity -c "SELECT code, name, sample_type FROM test_templates;"
```

### Check B2B clients
```bash
podman exec -i lms-postgres psql -U lms_user -d lms_slncity -c "SELECT id, name, type FROM clients;"
```

---

## ✅ Success Criteria

Before deploying to AWS, ALL of these must pass:

- [ ] All logins work (staff + B2B clients)
- [ ] No console errors
- [ ] Sample type shows in templates
- [ ] Sample type pre-fills during collection
- [ ] B2B samples show with blue background
- [ ] B2B sample rejection works
- [ ] Lab sample rejection works
- [ ] Complete workflow works (registration → collection → results → approval → print)
- [ ] Reports print correctly with sample type
- [ ] No localhost URLs anywhere
- [ ] B2B clients see only their own data

---

## 🚀 After Local Testing Passes

Follow **DEPLOYMENT-CHECKLIST.md** to deploy to AWS.

**NEVER deploy without completing all tests above!**


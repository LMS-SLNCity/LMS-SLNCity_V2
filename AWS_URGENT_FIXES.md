# AWS Urgent Fixes - Deployment Issues

## 🐛 Issues Fixed

### 1. **Visits Not Showing** ✅
**Root Cause:** `VisitsManagement.tsx` was using hardcoded `localhost:5001` instead of environment variable.

**Fix Applied:**
- Added `API_BASE_URL` from environment variable
- Updated fetch call to use `${API_BASE_URL}/visits`
- Added better error logging and handling
- Fixed auth token retrieval (checks both sessionStorage and localStorage)

### 2. **Hardcoded URLs Throughout Application** ⚠️
**Root Cause:** Multiple components have hardcoded `localhost:5001` URLs.

**Fix Applied:**
- Created centralized `config/api.ts` file
- Fixed `VisitsManagement.tsx`
- Fixed `CreateVisitFormNew.tsx`

**Still Need Manual Fix:** (See list below)

### 3. **Responsive Design for Edge Browser** 📱
**Status:** Needs implementation

---

## 🚀 Deployment Steps on AWS

### **Step 1: Pull Latest Code**

```bash
# SSH into AWS
ssh -i your-key.pem ec2-user@13.201.165.54

# Navigate to project
cd /home/ec2-user/LMS-SLNCity-V1

# Pull latest changes
git pull origin main
```

### **Step 2: Verify Environment Variables**

```bash
# Check frontend .env
cat .env
# Should show: VITE_API_URL=http://13.201.165.54:5001

# Check backend .env
cat server/.env
# Should show: FRONTEND_URL=http://13.201.165.54:3001
```

### **Step 3: Rebuild Frontend**

```bash
# Install dependencies (if needed)
npm install

# Build frontend (this bakes environment variables into the bundle)
npm run build

# Verify build succeeded
ls -la dist/
```

### **Step 4: Restart Services**

```bash
# Restart frontend
pm2 restart lms-frontend

# Restart backend
pm2 restart lms-backend

# Check status
pm2 status

# View logs
pm2 logs lms-backend --lines 20
pm2 logs lms-frontend --lines 20
```

### **Step 5: Verify Application**

```bash
# Test backend API
curl http://localhost:5001/health

# Test visits endpoint
curl http://localhost:5001/api/visits -H "Authorization: Bearer YOUR_TOKEN"

# Check from browser
# Open: http://13.201.165.54:3001
```

---

## 📋 Components Still Needing URL Fixes

The following components still have hardcoded `localhost:5001` URLs and need to be updated:

1. **components/B2BPrintReport.tsx**
2. **components/B2BClientDashboard.tsx**
3. **components/CreateVisitForm.tsx** (old form)
4. **components/admin/ClientLedgerModal.tsx**
5. **components/admin/UserManagement.tsx**
6. **components/admin/SignatureUploadModal.tsx**
7. **components/admin/B2BAccountManagementModal.tsx**
8. **components/admin/AuditLogViewer.tsx**
9. **components/admin/WaiversManagement.tsx**
10. **components/PatientSearchModal.tsx**

### **How to Fix Each File:**

1. Add import at the top:
   ```typescript
   import { API_BASE_URL } from '../config/api';  // or '../../config/api' depending on depth
   ```

2. Replace all instances of:
   ```typescript
   'http://localhost:5001/api/...'
   ```
   
   With:
   ```typescript
   `${API_BASE_URL}/...`
   ```

---

## 🔍 Debugging Visits Not Showing

If visits still don't show after deployment:

### **Check 1: Backend API Response**

```bash
# SSH into AWS
ssh -i your-key.pem ec2-user@13.201.165.54

# Get auth token (login first through browser, then check browser console/localStorage)
# Or create a test token

# Test visits API
curl http://localhost:5001/api/visits \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  | jq '.'

# Should return array of visits
```

### **Check 2: Database Has Visits**

```bash
# Check visits in database
PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity -c "SELECT id, visit_code, patient_id, created_at FROM visits ORDER BY created_at DESC LIMIT 10;"

# Check patients
PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity -c "SELECT id, name, phone FROM patients LIMIT 10;"

# Check referral doctors
PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity -c "SELECT id, name FROM referral_doctors;"
```

### **Check 3: Browser Console**

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors like:
   - `Failed to fetch`
   - `CORS error`
   - `401 Unauthorized`
   - `404 Not Found`

4. Go to Network tab
5. Filter by "visits"
6. Check the request URL - should be `http://13.201.165.54:5001/api/visits`
7. Check response status and body

### **Check 4: Frontend Build**

```bash
# Check if environment variable was baked into build
cd /home/ec2-user/LMS-SLNCity-V1
grep -r "13.201.165.54" dist/assets/

# Should see your AWS IP in the compiled JavaScript files
# If you see "localhost:5001" instead, the build didn't pick up the .env file
```

---

## 🎨 Responsive Design Issues (Edge Browser)

### **Known Issues:**

1. **Layout not adapting to screen size**
2. **Elements overlapping or cut off**
3. **Scrolling issues**

### **Solution (To Be Implemented):**

Need to add responsive CSS classes using Tailwind breakpoints:

```typescript
// Example responsive classes
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
className="text-sm md:text-base lg:text-lg"
className="p-2 md:p-4 lg:p-6"
className="overflow-x-auto" // For tables
```

### **Browser Compatibility:**

- **Chrome/Edge:** Use latest version
- **Firefox:** Use latest version
- **Safari:** May have issues with some CSS features

---

## ⚡ Quick Fixes for Common Issues

### **Issue: "Error loading visits"**

```bash
# Check backend logs
pm2 logs lms-backend --lines 50

# Restart backend
pm2 restart lms-backend
```

### **Issue: "No authentication token"**

- User needs to logout and login again
- Clear browser cache (Ctrl+Shift+Delete)
- Check if session expired

### **Issue: "CORS error"**

```bash
# Verify backend FRONTEND_URL
cat /home/ec2-user/LMS-SLNCity-V1/server/.env | grep FRONTEND_URL

# Should be: FRONTEND_URL=http://13.201.165.54:3001

# If wrong, fix it and restart backend
pm2 restart lms-backend
```

### **Issue: "Referral doctors not showing"**

```bash
# Add referral doctors to database
PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity << EOF
INSERT INTO referral_doctors (name) VALUES
('Dr. Rajesh Kumar'),
('Dr. Priya Sharma'),
('Dr. Amit Patel')
ON CONFLICT DO NOTHING;
EOF
```

---

## 📞 Support

If issues persist:

1. **Check all logs:**
   ```bash
   pm2 logs --lines 100
   ```

2. **Check database connection:**
   ```bash
   PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity -c "SELECT 1;"
   ```

3. **Restart everything:**
   ```bash
   pm2 restart all
   ```

4. **Check system resources:**
   ```bash
   free -h  # Memory
   df -h    # Disk space
   top      # CPU usage
   ```


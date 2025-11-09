# AWS Deployment Troubleshooting Guide

## 🐛 Current Issues and Solutions

### **Issue 1: Referred Doctor Not Showing**

**Symptoms:**
- Referral doctor dropdown is empty
- Referred doctor name not showing in reports

**Root Cause:**
- `referral_doctors` table is empty

**Solution:**
```bash
# SSH into AWS
ssh -i your-key.pem ec2-user@13.201.165.54

# Add referral doctors manually
cd /home/ec2-user/LMS-SLNCity-V1/server
PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity << EOF
INSERT INTO referral_doctors (name) VALUES
('Dr. Rajesh Kumar'),
('Dr. Priya Sharma'),
('Dr. Amit Patel'),
('Dr. Sunita Reddy'),
('Dr. Vikram Singh')
ON CONFLICT DO NOTHING;
EOF

# Verify
PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity -c "SELECT * FROM referral_doctors;"
```

---

### **Issue 2: Visit Management - Error Loading Visits**

**Symptoms:**
- "Error loading visits" message
- Visit list is empty

**Root Cause:**
- Database connection issue OR
- No visits in database yet OR
- Backend API error

**Solution:**
```bash
# Check backend logs
pm2 logs lms-backend --lines 50

# Check if visits table exists and has data
PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity -c "SELECT COUNT(*) FROM visits;"

# Check backend API directly
curl http://localhost:5001/api/visits -H "Authorization: Bearer YOUR_TOKEN"

# If backend shows errors, restart it
pm2 restart lms-backend
```

---

### **Issue 3: User Management is Blank**

**Symptoms:**
- User management page shows no users
- Cannot see user list

**Root Cause:**
- `users` table is empty OR
- `user_permissions` table not populated

**Solution:**
```bash
# Check if users exist
PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity -c "SELECT id, username, role FROM users;"

# If no users, run production seed
cd /home/ec2-user/LMS-SLNCity-V1/server
PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity -f db/seed-production.sql

# Populate user_permissions for existing users
PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity << EOF
-- Populate user_permissions from role_permissions
INSERT INTO user_permissions (user_id, permission)
SELECT u.id, unnest(rp.permissions)
FROM users u
JOIN role_permissions rp ON u.role = rp.role
ON CONFLICT (user_id, permission) DO NOTHING;
EOF

# Restart backend
pm2 restart lms-backend
```

---

### **Issue 4: Manage Test Prices - Jittering/Not Working**

**Symptoms:**
- Test prices page is flickering/jittering
- Cannot update test prices

**Root Cause:**
- Frontend re-rendering issue OR
- API calls happening too frequently OR
- Test templates not loaded

**Solution:**
```bash
# Check if test templates exist
PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity -c "SELECT code, name, price, b2b_price FROM test_templates;"

# If empty, seed test templates
cd /home/ec2-user/LMS-SLNCity-V1/server
npm run seed

# Check backend API
curl http://localhost:5001/api/test-templates

# Clear browser cache and reload
# Press Ctrl+Shift+R (hard refresh) in browser
```

---

### **Issue 5: Ledger Transactions Not Loading**

**Symptoms:**
- B2B ledger transactions page is empty
- "Error loading transactions" message

**Root Cause:**
- No B2B clients created yet OR
- No transactions in database OR
- Backend API error

**Solution:**
```bash
# Check if B2B clients exist
PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity -c "SELECT id, name, type, balance FROM clients WHERE type='REFERRAL_LAB';"

# Check if ledger entries exist
PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity -c "SELECT COUNT(*) FROM b2b_ledger;"

# Add a sample B2B client (for testing)
PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity << EOF
INSERT INTO clients (name, type, contact_person, phone, email, address, credit_limit, balance)
VALUES ('Apollo Diagnostics', 'REFERRAL_LAB', 'Dr. Kumar', '9876543210', 'apollo@example.com', 'Hyderabad', 50000.00, 0.00)
ON CONFLICT DO NOTHING;
EOF

# Restart backend
pm2 restart lms-backend
```

---

### **Issue 6: Report - Approver Signature Not Loading**

**Symptoms:**
- Approver signature image not showing in report
- Broken image icon

**Root Cause:**
- Signature image path incorrect OR
- CORS issue with image loading OR
- Signature not uploaded

**Solution:**
```bash
# Check if approver has signature
PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity -c "SELECT id, username, role, signature_image_url FROM users WHERE role IN ('APPROVER', 'SUDO', 'ADMIN');"

# Check if signature files exist
ls -la /home/ec2-user/LMS-SLNCity-V1/server/public/signatures/

# Verify backend serves signatures correctly
curl http://localhost:5001/signatures/test.png

# Check CORS configuration in backend
# Make sure helmet allows cross-origin images
```

**Frontend Fix:**
The signature URL should be constructed as:
```javascript
const signatureUrl = `${API_BASE_URL}/signatures/${filename}`;
```

---

### **Issue 7: Client Name Not Printed in Report**

**Symptoms:**
- B2B client name not showing in report
- Shows "undefined" or blank

**Root Cause:**
- Visit doesn't have `ref_customer_id` set OR
- Client data not joined in query

**Solution:**
```bash
# Check if visits have client references
PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity -c "SELECT id, visit_code, ref_customer_id FROM visits WHERE ref_customer_id IS NOT NULL LIMIT 10;"

# Check if clients table has data
PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity -c "SELECT id, name, type FROM clients;"

# Verify backend API returns client name
curl http://localhost:5001/api/visits/1 | jq '.client_name'
```

---

### **Issue 8: Referred Doctor Not Printed in Report**

**Symptoms:**
- Referred doctor name not showing in report
- Shows "Dr. ID: X" instead of name

**Root Cause:**
- Backend query doesn't join with `referral_doctors` table OR
- Frontend uses wrong field

**Solution:**
```bash
# Check if visits have referred_doctor_id
PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity -c "SELECT id, visit_code, referred_doctor_id FROM visits WHERE referred_doctor_id IS NOT NULL LIMIT 10;"

# Verify backend returns referred_doctor_name
curl http://localhost:5001/api/visits/1 | jq '.referred_doctor_name'

# If null, backend query needs to be fixed (already fixed in latest code)
```

---

## 🔧 **Complete Database Reset and Setup**

If you want to start fresh and fix all issues at once:

```bash
# SSH into AWS
ssh -i your-key.pem ec2-user@13.201.165.54

# Navigate to project
cd /home/ec2-user/LMS-SLNCity-V1

# Make setup script executable
chmod +x AWS_DATABASE_SETUP.sh

# Run the setup script
./AWS_DATABASE_SETUP.sh

# Restart backend
pm2 restart lms-backend

# Check logs
pm2 logs lms-backend --lines 50
```

---

## 📋 **Quick Verification Checklist**

After running the setup script, verify:

```bash
# 1. Check users
PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity -c "SELECT COUNT(*) FROM users;"

# 2. Check test templates
PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity -c "SELECT COUNT(*) FROM test_templates;"

# 3. Check antibiotics
PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity -c "SELECT COUNT(*) FROM antibiotics;"

# 4. Check role permissions
PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity -c "SELECT role, array_length(permissions, 1) as perm_count FROM role_permissions;"

# 5. Check user permissions
PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity -c "SELECT user_id, COUNT(*) as perm_count FROM user_permissions GROUP BY user_id;"

# 6. Check branches
PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity -c "SELECT COUNT(*) FROM branches;"

# 7. Check signatories
PGPASSWORD=lms_password psql -h localhost -p 5432 -U lms_user -d lms_slncity -c "SELECT COUNT(*) FROM signatories;"
```

---

## 🚀 **After Database Setup**

1. **Login to application:**
   - URL: `http://13.201.165.54:3001`
   - Username: `sudo`
   - Password: `ChangeMe@123`

2. **Change default password immediately**

3. **Add referral doctors:**
   - Go to Admin Panel → Manage Referral Doctors
   - Add your actual referral doctors

4. **Add B2B clients (if needed):**
   - Go to Admin Panel → Manage B2B Clients
   - Add your B2B clients

5. **Upload approver signatures:**
   - Go to User Management
   - Edit users with APPROVER role
   - Upload their signatures

6. **Test the workflow:**
   - Create a new visit
   - Collect sample
   - Enter results
   - Approve results
   - Print report
   - Verify all data shows correctly

---

## 📞 **Still Having Issues?**

If issues persist after running the setup script:

1. **Check backend logs:**
   ```bash
   pm2 logs lms-backend --lines 100
   ```

2. **Check frontend logs:**
   ```bash
   pm2 logs lms-frontend --lines 100
   ```

3. **Check browser console:**
   - Open browser DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for failed API calls

4. **Verify environment variables:**
   ```bash
   cat /home/ec2-user/LMS-SLNCity-V1/.env
   cat /home/ec2-user/LMS-SLNCity-V1/server/.env
   ```

5. **Test backend API directly:**
   ```bash
   # Health check
   curl http://localhost:5001/health
   
   # Test login
   curl -X POST http://localhost:5001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"sudo","password":"ChangeMe@123"}'
   ```


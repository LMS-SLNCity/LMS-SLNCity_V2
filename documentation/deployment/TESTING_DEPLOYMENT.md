# 🧪 TESTING DEPLOYMENT GUIDE

## Strategy: Run on Different Ports First, Then Switch

This guide helps you test the new deployment on different ports **without affecting** your current production setup.

---

## 📋 **Port Allocation**

### **Current Production (Keep Running):**
- Frontend: `3001`
- Backend: `5001`
- Database: `5432`

### **Testing Environment (New):**
- Frontend: `3002` ← Test here first
- Backend: `5002` ← Test here first
- Database: `5432` (shared - same database)

---

## 🚀 **STEP 1: Setup Testing Environment**

### **On AWS Server:**

```bash
# SSH into AWS
ssh -i your-key.pem ec2-user@13.201.165.54

# Navigate to project
cd /home/ec2-user/LMS-SLNCity-V1

# Pull latest code
git pull origin main
```

---

## 🔧 **STEP 2: Create Testing Environment Variables**

### **Create `.env.test` for Frontend:**

```bash
cat > .env.test << 'EOF'
# Testing Environment - Frontend
VITE_API_URL=http://13.201.165.54:5002
EOF
```

### **Create `server/.env.test` for Backend:**

```bash
cat > server/.env.test << 'EOF'
# Testing Environment - Backend
PORT=5002
DB_HOST=localhost
DB_PORT=5432
DB_USER=lms_user
DB_PASSWORD=lms_password
DB_NAME=lms_slncity
NODE_ENV=production

# JWT Secret (use same as production)
JWT_SECRET=e338cec6670e03b9cab465f4331062c9233e5a61e93f04e77b844d0ff597702a4693ffbfb147008ae78f7a2d35c15c63e7f7bfc02624f2609928e687dec16d95

# Frontend URL for CORS (Testing port)
FRONTEND_URL=http://13.201.165.54:3002
EOF
```

---

## 🏗️ **STEP 3: Build Testing Frontend**

```bash
# Copy test env to .env for build
cp .env.test .env

# Install dependencies (if needed)
npm install

# Build frontend with test configuration
npm run build

# Verify the build contains test port
grep -r "5002" dist/assets/ | head -3
```

**Expected output:** You should see `5002` in the compiled files.

---

## 🚀 **STEP 4: Start Testing Services with PM2**

### **Start Testing Backend:**

```bash
# Start backend on port 5002
pm2 start server/src/index.ts \
  --name lms-backend-test \
  --interpreter tsx \
  --env-file server/.env.test \
  --watch false
```

### **Start Testing Frontend:**

```bash
# Start frontend on port 3002
pm2 start npm \
  --name lms-frontend-test \
  -- run preview -- --port 3002 --host 0.0.0.0
```

### **Check Status:**

```bash
pm2 status
```

**Expected output:**
```
┌────┬──────────────────────┬─────────┬─────────┬──────────┐
│ id │ name                 │ status  │ restart │ uptime   │
├────┼──────────────────────┼─────────┼─────────┼──────────┤
│ 0  │ lms-frontend         │ online  │ 0       │ 2h       │ ← Production
│ 1  │ lms-backend          │ online  │ 0       │ 2h       │ ← Production
│ 2  │ lms-frontend-test    │ online  │ 0       │ 5s       │ ← Testing
│ 3  │ lms-backend-test     │ online  │ 0       │ 10s      │ ← Testing
└────┴──────────────────────┴─────────┴─────────┴──────────┘
```

---

## 🔍 **STEP 5: Verify Testing Environment**

### **Check Backend Health:**

```bash
# Test backend API
curl http://localhost:5002/health
```

**Expected:** `{"status":"ok"}`

### **Check Logs:**

```bash
# View testing backend logs
pm2 logs lms-backend-test --lines 20

# View testing frontend logs
pm2 logs lms-frontend-test --lines 20
```

**Look for:**
- ✅ Backend: "Server running on port 5002"
- ✅ Frontend: "ready in XXXms"
- ❌ No errors

---

## 🌐 **STEP 6: Configure AWS Security Group**

Add inbound rules for testing ports:

1. Go to **AWS Console** → **EC2** → **Security Groups**
2. Select your instance's security group
3. Click **Edit inbound rules**
4. Add these rules:

| Type       | Protocol | Port | Source    | Description          |
|------------|----------|------|-----------|----------------------|
| Custom TCP | TCP      | 3002 | 0.0.0.0/0 | LMS Frontend (Test)  |
| Custom TCP | TCP      | 5002 | 0.0.0.0/0 | LMS Backend (Test)   |

5. Click **Save rules**

---

## 🧪 **STEP 7: Test in Browser**

### **Open Testing URL:**

```
http://13.201.165.54:3002
```

### **Open Browser DevTools (F12):**

1. **Console Tab** - Check for errors
2. **Network Tab** - Monitor API calls

### **Test All Features:**

#### **1. Login**
- ✅ Staff login works
- ✅ B2B client login works
- ✅ No console errors

#### **2. Visit Management**
- ✅ Visits load correctly
- ✅ API calls go to `13.201.165.54:5002` (not localhost)
- ✅ Can create new visit
- ✅ Referral doctors show in dropdown

#### **3. User Management**
- ✅ Users load correctly
- ✅ Can view user details
- ✅ Permissions show correctly

#### **4. Test Prices**
- ✅ Test prices load
- ✅ No jittering
- ✅ Can edit prices

#### **5. Ledger Transactions**
- ✅ Transactions load
- ✅ Can view details
- ✅ Filtering works

#### **6. Reports**
- ✅ Reports generate correctly
- ✅ Approver signatures load
- ✅ Client name prints
- ✅ Referred doctor prints

#### **7. B2B Dashboard**
- ✅ Ledger loads
- ✅ Can request visit
- ✅ Can print report

---

## ✅ **STEP 8: Verify API Calls**

In **Browser DevTools → Network Tab**, check that ALL API calls use:

```
http://13.201.165.54:5002/api/...
```

**NOT:**
```
http://localhost:5001/api/...
```

### **Quick Check Commands:**

```bash
# On AWS server, check backend logs for incoming requests
pm2 logs lms-backend-test --lines 50 | grep "GET\|POST\|PUT\|DELETE"
```

You should see requests coming in when you use the application.

---

## 🎯 **STEP 9: Decision Point**

### **If Testing is Successful:**

✅ All features work  
✅ No console errors  
✅ API calls use correct URLs  
✅ No hardcoded localhost URLs  

**→ Proceed to STEP 10 (Switch to Production Ports)**

### **If Testing Has Issues:**

❌ Features not working  
❌ Console errors  
❌ Still seeing localhost URLs  

**→ Debug issues first:**

```bash
# Check logs
pm2 logs lms-backend-test --lines 100
pm2 logs lms-frontend-test --lines 100

# Check environment variables
pm2 env lms-backend-test | grep PORT
pm2 env lms-backend-test | grep FRONTEND_URL

# Restart services
pm2 restart lms-backend-test
pm2 restart lms-frontend-test
```

---

## 🔄 **STEP 10: Switch to Production Ports**

### **Once testing is successful, switch to production ports:**

```bash
# Stop testing services
pm2 stop lms-frontend-test
pm2 stop lms-backend-test

# Update production environment variables
cp .env.test .env
sed -i 's/5002/5001/g' .env

cp server/.env.test server/.env
sed -i 's/5002/5001/g' server/.env
sed -i 's/3002/3001/g' server/.env

# Rebuild frontend with production ports
npm run build

# Restart production services
pm2 restart lms-backend
pm2 restart lms-frontend

# Check status
pm2 status

# View logs
pm2 logs --lines 20
```

### **Verify Production:**

```
http://13.201.165.54:3001
```

Test all features again on production ports.

---

## 🧹 **STEP 11: Cleanup Testing Services**

### **Once production is working, remove testing services:**

```bash
# Delete testing services from PM2
pm2 delete lms-frontend-test
pm2 delete lms-backend-test

# Save PM2 configuration
pm2 save

# Remove testing env files (optional)
rm .env.test
rm server/.env.test
```

---

## 📊 **Testing Checklist**

Use this checklist to verify everything works:

### **Backend API (Port 5002):**
- [ ] Health check responds: `curl http://localhost:5002/health`
- [ ] No errors in logs: `pm2 logs lms-backend-test --lines 50`
- [ ] Database connection works
- [ ] JWT authentication works

### **Frontend (Port 3002):**
- [ ] Application loads in browser
- [ ] No console errors (F12 → Console)
- [ ] All API calls use `13.201.165.54:5002`
- [ ] No hardcoded `localhost:5001` URLs

### **Features:**
- [ ] Login (staff and B2B)
- [ ] Visit Management
- [ ] User Management
- [ ] Test Prices
- [ ] Ledger Transactions
- [ ] Reports (with signatures)
- [ ] B2B Dashboard
- [ ] Referral Doctors dropdown

### **Performance:**
- [ ] Pages load quickly
- [ ] No jittering or flickering
- [ ] Smooth navigation
- [ ] Images load correctly

---

## 🐛 **Common Issues & Solutions**

### **Issue: "Cannot connect to backend"**

```bash
# Check if backend is running
pm2 status | grep lms-backend-test

# Check backend logs
pm2 logs lms-backend-test --lines 50

# Restart backend
pm2 restart lms-backend-test
```

### **Issue: "Still seeing localhost:5001"**

```bash
# Verify .env.test has correct URL
cat .env.test

# Rebuild frontend
cp .env.test .env
npm run build
pm2 restart lms-frontend-test

# Verify build
grep -r "5002" dist/assets/ | head -3
```

### **Issue: "CORS error"**

```bash
# Check backend CORS configuration
cat server/.env.test | grep FRONTEND_URL

# Should be: FRONTEND_URL=http://13.201.165.54:3002

# If wrong, fix it:
echo "FRONTEND_URL=http://13.201.165.54:3002" >> server/.env.test
pm2 restart lms-backend-test
```

### **Issue: "Port already in use"**

```bash
# Check what's using the port
lsof -i :5002
lsof -i :3002

# Kill the process
kill -9 <PID>

# Or use different ports (5003, 3003)
```

---

## 📞 **Need Help?**

If you encounter issues during testing:

1. **Check logs:** `pm2 logs --lines 100`
2. **Check browser console:** F12 → Console tab
3. **Check network requests:** F12 → Network tab
4. **Verify environment variables:** `cat .env.test` and `cat server/.env.test`
5. **Restart services:** `pm2 restart lms-backend-test lms-frontend-test`

---

## 🎉 **Success!**

Once testing is complete and production is switched:

✅ All hardcoded URLs removed  
✅ Application works on AWS  
✅ All features tested and working  
✅ Production running on ports 3001/5001  
✅ Testing services cleaned up  

**Your deployment is complete!** 🚀


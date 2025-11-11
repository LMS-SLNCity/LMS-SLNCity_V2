# ✅ VM Deployment Checklist - Development Mode

## Pre-Deployment Checklist

### On Your Local Machine:
- [x] ✅ Fixed temporal dead zone error in CreateVisitFormNew.tsx
- [x] ✅ Converted const functions to function declarations in AppContext.tsx
- [x] ✅ Fixed circular dependency with invalidateCache
- [x] ✅ Verified lazy loading works (5-10 API calls)
- [x] ✅ Tested locally - application loads without white screen
- [x] ✅ Committed and pushed all changes to GitHub
- [x] ✅ Created deployment scripts and documentation

### On Your VM:
- [ ] Install Docker
- [ ] Install Git
- [ ] Open firewall ports (3000, 5002, 5433)
- [ ] Get VM IP address
- [ ] Clone repository from GitHub

---

## Deployment Steps

### Step 1: VM Prerequisites
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Install Git
sudo apt install git -y

# Open ports
sudo ufw allow 3000/tcp
sudo ufw allow 5002/tcp
sudo ufw allow 5433/tcp
sudo ufw enable
```

### Step 2: Clone Repository
```bash
cd ~
git clone https://github.com/LMS-SLNCity/LMS-SLNCity-V1.git
cd LMS-SLNCity-V1
```

### Step 3: Deploy
```bash
# Option A: Automated deployment (RECOMMENDED)
./deploy-vm-dev.sh

# Option B: Manual deployment
# 1. Get VM IP
VM_IP=$(hostname -I | awk '{print $1}')
echo $VM_IP

# 2. Create .env file
cat > .env << EOF
VITE_API_URL=http://${VM_IP}:5002
GEMINI_API_KEY=your_gemini_api_key_here
EOF

# 3. Create server/.env file
cat > server/.env << EOF
PORT=5002
DB_HOST=postgres
DB_PORT=5432
DB_USER=lms_user
DB_PASSWORD=lms_password
DB_NAME=lms_slncity
NODE_ENV=development
JWT_SECRET=e338cec6670e03b9cab465f4331062c9233e5a61e93f04e77b844d0ff597702a4693ffbfb147008ae78f7a2d35c15c63e7f7bfc02624f2609928e687dec16d95
FRONTEND_URL=http://${VM_IP}:3000
EOF

# 4. Build and start
export ENV=development
docker compose up -d --build
```

### Step 4: Verify Deployment
```bash
# Check services are running
docker compose ps

# Check logs
docker compose logs -f

# Test backend health
curl http://localhost:5002/health

# Test frontend
curl http://localhost:3000
```

---

## Post-Deployment Verification

### 1. Access Application
- [ ] Open browser: `http://YOUR_VM_IP:3000`
- [ ] Login page loads correctly
- [ ] No white screen

### 2. Test Login
- [ ] Login with `sudo` / `admin123`
- [ ] Dashboard loads successfully
- [ ] No JavaScript errors in console

### 3. Verify Lazy Loading Optimization
- [ ] Open DevTools (F12) → Network tab
- [ ] Login
- [ ] Count API requests: **Should be ~5-10 requests**
- [ ] NOT 2000+ requests!

### 4. Test Core Functionality
- [ ] Create a new visit (Reception view)
- [ ] Collect sample (Phlebotomy view)
- [ ] Enter results (Lab view)
- [ ] Approve results (Approver view)
- [ ] Generate and print report
- [ ] Test B2B client functionality

### 5. Test All User Roles
- [ ] SUDO: `sudo` / `admin123`
- [ ] Admin: `admin` / `admin123`
- [ ] Reception: `reception` / `reception123`
- [ ] Lab: `lab` / `lab123`
- [ ] Phlebotomy: `phlebotomy` / `phlebotomy123`
- [ ] Approver: `approver` / `approver123`

---

## Expected Results

### ✅ Success Indicators:
- All 3 containers running (postgres, backend, frontend)
- Frontend accessible at `http://VM_IP:3000`
- Backend API responding at `http://VM_IP:5002`
- Login works without errors
- Dashboard loads without white screen
- **Only 5-10 API calls on login** (check Network tab)
- All CRUD operations work
- Reports generate correctly

### ❌ Failure Indicators:
- White screen after login
- JavaScript errors in console
- "Cannot connect to backend" errors
- 2000+ API requests on login
- Containers not running
- Health checks failing

---

## Troubleshooting Guide

### Issue: White Screen
**Solution:**
```bash
# 1. Check frontend logs
docker compose logs frontend

# 2. Rebuild frontend
docker compose up -d --build frontend

# 3. Clear browser cache (Ctrl+Shift+R)
```

### Issue: Backend Connection Error
**Solution:**
```bash
# 1. Verify .env has correct VM IP
cat .env
cat server/.env

# 2. Check backend is running
docker compose ps backend
docker compose logs backend

# 3. Test backend directly
curl http://localhost:5002/health
```

### Issue: Database Connection Error
**Solution:**
```bash
# 1. Check postgres is healthy
docker compose ps postgres

# 2. Check postgres logs
docker compose logs postgres

# 3. Restart postgres
docker compose restart postgres

# 4. If needed, fresh start (WARNING: deletes data)
docker compose down -v
docker compose up -d
```

### Issue: Too Many API Calls (2000+)
**Solution:**
```bash
# This should NOT happen with the latest code
# If it does, verify you pulled the latest changes:
git pull origin main
docker compose down
docker compose up -d --build
```

---

## Maintenance Commands

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f postgres
```

### Restart Services
```bash
# All services
docker compose restart

# Specific service
docker compose restart frontend
```

### Update from GitHub
```bash
cd ~/LMS-SLNCity-V1
git pull origin main
docker compose down
docker compose up -d --build
```

### Backup Database
```bash
# Export database
docker compose exec postgres pg_dump -U lms_user lms_slncity > backup.sql

# Import database
docker compose exec -T postgres psql -U lms_user lms_slncity < backup.sql
```

### Clean Up
```bash
# Stop services (keeps data)
docker compose down

# Stop and remove data
docker compose down -v

# Remove unused Docker resources
docker system prune -a
```

---

## Performance Metrics

### Expected Performance:
- **Initial Load:** < 3 seconds
- **Login:** < 1 second
- **API Calls on Login:** 5-10 requests
- **Data Transfer on Login:** < 500 KB
- **Dashboard Load:** < 2 seconds
- **Report Generation:** < 3 seconds

### Monitor Performance:
```bash
# Check container resource usage
docker stats

# Check API response times
docker compose logs backend | grep "ms"
```

---

## Security Notes

### Development Mode:
- ✅ Simple passwords for testing
- ✅ JWT secret in repo
- ✅ Database accessible externally
- ✅ CORS enabled for all origins
- ✅ Debug logging enabled

### Before Production:
- [ ] Change all default passwords
- [ ] Generate new JWT secret
- [ ] Remove database port exposure
- [ ] Configure strict CORS
- [ ] Disable debug logging
- [ ] Set up SSL/HTTPS
- [ ] Configure firewall rules
- [ ] Use Docker secrets
- [ ] Set up monitoring
- [ ] Configure backups

---

## Support & Documentation

- **Quick Start:** `QUICK-VM-DEPLOY.md`
- **Full Guide:** `VM-DEPLOYMENT-DEV.md`
- **This Checklist:** `VM-DEPLOYMENT-CHECKLIST.md`
- **Credentials:** `CREDENTIALS.md`

---

## Success Criteria

✅ **Deployment is successful when:**
1. All containers are running and healthy
2. Application accessible from browser
3. Login works without errors
4. Only 5-10 API calls on login (verified in Network tab)
5. All user roles can access their views
6. Can create visits, enter results, and generate reports
7. No white screen or JavaScript errors
8. Performance is acceptable (< 3s page loads)

---

## Next Steps After Successful Deployment

1. ✅ Test all functionality thoroughly
2. ✅ Create sample data (visits, reports)
3. ✅ Train users on the system
4. ✅ Document any issues or feature requests
5. 🔜 Plan production deployment with security hardening
6. 🔜 Set up monitoring and alerting
7. 🔜 Configure automated backups
8. 🔜 Set up SSL/HTTPS
9. 🔜 Configure domain name
10. 🔜 Production security audit

---

**Deployment Date:** _____________  
**Deployed By:** _____________  
**VM IP Address:** _____________  
**Status:** ⬜ Success  ⬜ Failed  ⬜ Partial  
**Notes:** _____________________________________________


# Deployment Checklist

## ✅ Local Development Testing (DO THIS FIRST!)

### 1. Setup Local Environment
```bash
# Make script executable
chmod +x setup-local-dev.sh

# Run setup script
./setup-local-dev.sh
```

### 2. Start Backend
```bash
cd server
npm run dev
```

### 3. Start Frontend (in another terminal)
```bash
npm run dev
```

### 4. Test All Features Locally

#### Login Tests
- [ ] Login as `sudo` / `password` - Full access
- [ ] Login as `admin` / `password` - Admin access
- [ ] Login as `reception` / `password` - Registration
- [ ] Login as `phlebotomy` / `password` - Sample collection
- [ ] Login as `lab` / `password` - Result entry
- [ ] Login as `approver` / `password` - Result approval
- [ ] Login as B2B client: `City Diagnostic Center` / `client`

#### Core Workflow Tests
- [ ] Create new patient visit (Reception)
- [ ] Collect sample with sample type selection (Phlebotomy)
- [ ] Verify sample type is pre-filled from template
- [ ] Enter test results (Lab)
- [ ] Approve results (Approver)
- [ ] Print report

#### New Features Tests
- [ ] **Sample Type in Templates**: Create test template with default sample type
- [ ] **Sample Type in Collection**: Verify phlebotomy sees recommended sample type
- [ ] **B2B Sample Rejection**: Create B2B visit, reject sample in phlebotomy queue
- [ ] **Lab Sample Rejection**: Reject sample in lab queue
- [ ] **Culture & Sensitivity**: Verify antibiotics show in approval modal

#### B2B Features Tests
- [ ] B2B client login
- [ ] Request new visit
- [ ] View ledger
- [ ] Print report
- [ ] Verify client sees only their own data

---

## 🚀 AWS Deployment (ONLY AFTER LOCAL TESTING PASSES!)

### Pre-Deployment Checklist
- [ ] All local tests passed
- [ ] All features working correctly
- [ ] No console errors
- [ ] Code committed to GitHub
- [ ] `.env.aws` files reviewed and correct

### 1. Backup Current AWS Setup
```bash
# SSH into AWS
ssh -i ~/path/to/your-key.pem ec2-user@13.201.165.54

# Backup database
docker exec lms-postgres pg_dump -U lms_user -d lms_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup current code
cd /home/ec2-user
tar -czf LMS-backup-$(date +%Y%m%d_%H%M%S).tar.gz LMS-SLNCity-V1/
```

### 2. Update Environment Files on AWS
```bash
# On AWS server
cd /home/ec2-user/LMS-SLNCity-V1

# Pull latest code
git pull origin main

# Copy AWS environment files
cp .env.aws .env
cp server/.env.aws server/.env

# Verify environment files
cat .env
cat server/.env
```

### 3. Build Frontend
```bash
# On local machine
cd /Users/ramgopal/LMS-SLNCity-V1

# Make sure .env.aws is copied to .env
cp .env.aws .env

# Build
npm run build

# Verify dist folder
ls -la dist/
```

### 4. Deploy to AWS
```bash
# SCP dist folder to AWS
scp -i ~/path/to/your-key.pem -r dist/* ec2-user@13.201.165.54:/home/ec2-user/LMS-SLNCity-V1/dist/

# SSH into AWS
ssh -i ~/path/to/your-key.pem ec2-user@13.201.165.54

# Navigate to project
cd /home/ec2-user/LMS-SLNCity-V1

# Run database migration (if not already done)
docker exec -i lms-postgres psql -U lms_user -d lms_db < server/db/migrations/007_add_sample_type_to_templates.sql

# Restart services
pm2 restart lms-frontend
pm2 restart lms-backend

# Check status
pm2 status
pm2 logs --lines 50
```

### 5. Post-Deployment Testing
- [ ] Access: http://13.201.165.54:3001
- [ ] Login with production credentials
- [ ] Test all features (same as local tests)
- [ ] Check for console errors
- [ ] Verify no localhost URLs in network tab
- [ ] Test from client's network (if possible)

### 6. Rollback Plan (if something goes wrong)
```bash
# On AWS server
cd /home/ec2-user

# Stop services
pm2 stop all

# Restore backup
tar -xzf LMS-backup-YYYYMMDD_HHMMSS.tar.gz

# Restore database
docker exec -i lms-postgres psql -U lms_user -d lms_db < backup_YYYYMMDD_HHMMSS.sql

# Restart services
pm2 restart all
```

---

## 📝 Common Issues and Solutions

### Issue: "Failed to fetch" or CORS errors
**Solution**: Check `.env` files have correct URLs
- Frontend `.env`: `VITE_API_URL=http://13.201.165.54:5001`
- Backend `.env`: `FRONTEND_URL=http://13.201.165.54:3001`

### Issue: Login not working
**Solution**: 
1. Check backend logs: `pm2 logs lms-backend`
2. Verify database has users: `docker exec -i lms-postgres psql -U lms_user -d lms_db -c "SELECT username, role FROM users;"`
3. Check JWT_SECRET is set in backend `.env`

### Issue: Sample type not showing
**Solution**: Run migration:
```bash
docker exec -i lms-postgres psql -U lms_user -d lms_db < server/db/migrations/007_add_sample_type_to_templates.sql
```

### Issue: Port already in use
**Solution**: 
```bash
# Check what's using the port
lsof -i :5001
# Kill the process
kill -9 <PID>
# Or restart PM2
pm2 restart all
```

---

## 🎯 Success Criteria

### Local Development
- ✅ All features work without errors
- ✅ No console errors
- ✅ All user roles can login
- ✅ Complete workflow from registration to report printing works
- ✅ New features (sample type, rejection) work correctly

### AWS Production
- ✅ Application accessible from client's network
- ✅ All features work same as local
- ✅ No localhost URLs anywhere
- ✅ Performance is acceptable
- ✅ Client can demo successfully

---

## 📞 Emergency Contacts

If deployment fails:
1. **Rollback immediately** using backup
2. Check logs: `pm2 logs --lines 100`
3. Check this checklist for common issues
4. Test locally again to reproduce issue

---

**Remember: NEVER deploy to AWS without testing locally first!**


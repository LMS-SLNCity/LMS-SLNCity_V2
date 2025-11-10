# Deployment Steps - LMS SLNCity V1

This document provides step-by-step instructions to deploy the application locally and push changes to GitHub.

---

## 📋 Table of Contents

1. [Local Deployment](#local-deployment)
2. [Verify Changes](#verify-changes)
3. [Commit Changes](#commit-changes)
4. [Push to GitHub](#push-to-github)
5. [AWS Deployment](#aws-deployment)

---

## 🚀 Local Deployment

### Option 1: Using Deployment Script (Recommended)

```bash
# Make script executable (if not already)
chmod +x deploy-local.sh

# Run deployment script
./deploy-local.sh
```

The script will:
- Stop existing containers
- Optionally remove old images
- Build containers with latest code
- Start all services
- Verify health of all components
- Open application in browser

### Option 2: Manual Deployment

```bash
# Stop existing containers
podman-compose down

# Remove old images (optional, for clean build)
podman rmi -f localhost/lms-slncity-v1_frontend:latest
podman rmi -f localhost/lms-slncity-v1_backend:latest

# Build containers
podman-compose build --no-cache

# Start containers
podman-compose up -d

# Check status
podman ps

# View logs
podman-compose logs -f
```

---

## ✅ Verify Changes

### 1. Check Container Status

```bash
podman ps
```

Expected output:
```
CONTAINER ID  IMAGE                                     COMMAND               STATUS
xxxxxxxxxx    docker.io/library/postgres:16-alpine      postgres              Up X minutes (healthy)
xxxxxxxxxx    localhost/lms-slncity-v1_backend:latest   npm run dev           Up X minutes (healthy)
xxxxxxxxxx    localhost/lms-slncity-v1_frontend:latest  nginx -g daemon o...  Up X minutes
```

### 2. Test Backend Health

```bash
curl http://localhost:5002/health
```

Expected: `{"status":"ok"}`

### 3. Test Referral Doctors API

```bash
curl http://localhost:5002/api/referral-doctors | jq '.'
```

Expected: JSON array with doctors including `designation` field

### 4. Test Audit Logs API

```bash
curl http://localhost:5002/api/audit-logs | jq '. | length'
```

Expected: Number (not an error)

### 5. Test Frontend

Open browser: http://localhost:3000

**Login:**
- Username: `sudo`
- Password: `password`

**Test Checklist:**

- [ ] **Referral Doctor Management:**
  - Go to Admin Panel → Referral Doctor Management
  - Add new doctor with designation
  - Edit existing doctor to add/update designation
  - Verify designation shows in table

- [ ] **Create Visit Form:**
  - Go to Create Visit
  - Click "Ref Doctor" dropdown
  - Verify doctors show with designation (e.g., "Dr. Name, MD, Specialty")
  - Verify search functionality works

- [ ] **Test Templates:**
  - Go to Admin Panel → Test Management
  - Click "Add New Test" or edit existing
  - Add parameter
  - Click Unit dropdown
  - Verify search works and units are grouped by category

- [ ] **Audit Logs:**
  - Go to Admin Panel → Audit Logs
  - Verify logs load without errors
  - Test filtering by username, action, date range

- [ ] **Test Report:**
  - Create a visit with referral doctor
  - Complete tests and approve
  - Print report
  - Verify:
    - No duplicate "Dr." prefix
    - Designation shows next to doctor name
    - Microbiology reports (if any) start directly with C&S table

---

## 📝 Commit Changes

### 1. Check Git Status

```bash
git status
```

### 2. Review Changes

```bash
# View all changes
git diff

# View specific file changes
git diff components/TestReport.tsx
git diff server/src/routes/auditLogs.ts
```

### 3. Stage Changes

```bash
# Stage all changes
git add .

# Or stage specific files
git add server/db/init.sql
git add server/src/routes/referralDoctors.ts
git add server/src/routes/visits.ts
git add server/src/routes/auditLogs.ts
git add context/AppContext.tsx
git add types.ts
git add components/admin/ReferralDoctorManagement.tsx
git add components/CreateVisitForm.tsx
git add components/CreateVisitFormNew.tsx
git add components/TestReport.tsx
git add components/form/SearchableSelect.tsx
git add AWS_DEPLOYMENT_GUIDE.md
git add CHANGELOG.md
git add deploy-local.sh
git add DEPLOYMENT_STEPS.md
```

### 4. Commit Changes

```bash
git commit -m "feat: Add referral doctor designation and fix audit logs

- Add designation field to referral doctors (database, API, UI)
- Show designation in dropdowns and reports
- Fix duplicate 'Dr.' prefix in reports
- Fix audit logs API error (removed non-existent columns)
- Optimize microbiology report layout
- Add searchable dropdowns for units, doctors, and clients
- Add AWS deployment guide and changelog
- Add local deployment script

Closes #XX (if you have issue numbers)"
```

---

## 🔄 Push to GitHub

### 1. Check Remote

```bash
git remote -v
```

Expected:
```
origin  https://github.com/LMS-SLNCity/LMS-SLNCity-V1.git (fetch)
origin  https://github.com/LMS-SLNCity/LMS-SLNCity-V1.git (push)
```

### 2. Pull Latest Changes (if working with team)

```bash
# Fetch latest changes
git fetch origin

# Pull and merge
git pull origin main

# If there are conflicts, resolve them and commit
```

### 3. Push Changes

```bash
# Push to main branch
git push origin main

# Or push to a feature branch
git checkout -b feature/referral-doctor-designation
git push origin feature/referral-doctor-designation
```

### 4. Create Pull Request (if using feature branch)

1. Go to GitHub repository
2. Click "Pull Requests" → "New Pull Request"
3. Select your feature branch
4. Add title and description
5. Request review (if applicable)
6. Merge after approval

---

## ☁️ AWS Deployment

### Quick Start

1. **Follow AWS Deployment Guide:**
   ```bash
   cat AWS_DEPLOYMENT_GUIDE.md
   ```

2. **Key Steps:**
   - Create RDS PostgreSQL instance
   - Launch EC2 instance
   - Install Docker and Docker Compose
   - Clone repository on EC2
   - Configure environment variables
   - Initialize database
   - Build and deploy containers

3. **Detailed Instructions:**
   See `AWS_DEPLOYMENT_GUIDE.md` for complete step-by-step instructions

---

## 🔧 Troubleshooting

### Containers Won't Start

```bash
# Check logs
podman-compose logs

# Check specific container
podman logs lms-backend
podman logs lms-frontend
podman logs lms-postgres

# Restart containers
podman-compose restart
```

### Database Connection Issues

```bash
# Check database is running
podman exec lms-postgres pg_isready -U lms_user -d lms_slncity

# Connect to database
podman exec -it lms-postgres psql -U lms_user -d lms_slncity

# Check tables
\dt

# Check referral_doctors table
\d referral_doctors

# Exit
\q
```

### Frontend Not Loading

```bash
# Check if frontend container is running
podman ps | grep frontend

# Check frontend logs
podman logs lms-frontend

# Rebuild frontend
podman-compose stop frontend
podman rmi -f localhost/lms-slncity-v1_frontend:latest
podman-compose build --no-cache frontend
podman-compose up -d frontend
```

### Backend API Errors

```bash
# Check backend logs
podman logs -f lms-backend --tail 100

# Check backend health
curl http://localhost:5002/health

# Restart backend
podman restart lms-backend
```

### Git Push Fails

```bash
# If authentication fails, use personal access token
# GitHub Settings → Developer Settings → Personal Access Tokens
# Generate new token with repo permissions
# Use token as password when pushing

# Or configure SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"
# Add public key to GitHub
# Change remote to SSH
git remote set-url origin git@github.com:LMS-SLNCity/LMS-SLNCity-V1.git
```

---

## 📚 Additional Resources

- **README.md** - Project overview and setup
- **AWS_DEPLOYMENT_GUIDE.md** - Complete AWS deployment instructions
- **CHANGELOG.md** - Detailed list of all changes
- **docker-compose.yml** - Container configuration

---

## 🆘 Support

If you encounter issues:

1. Check logs: `podman-compose logs -f`
2. Review troubleshooting section above
3. Check GitHub Issues: https://github.com/LMS-SLNCity/LMS-SLNCity-V1/issues
4. Contact support: support@slncity.com

---

## ✅ Deployment Checklist

### Before Pushing to GitHub

- [ ] All containers build successfully
- [ ] All containers start and run healthy
- [ ] Backend health check passes
- [ ] Frontend loads in browser
- [ ] Can login with test credentials
- [ ] Referral doctor designation feature works
- [ ] Audit logs load without errors
- [ ] Test reports display correctly
- [ ] All tests pass (if applicable)
- [ ] Code is properly formatted
- [ ] No sensitive data in commits (passwords, keys, etc.)
- [ ] Documentation is updated
- [ ] Changelog is updated

### After Pushing to GitHub

- [ ] GitHub Actions pass (if configured)
- [ ] Pull request is reviewed and approved (if using PR workflow)
- [ ] Changes are merged to main branch
- [ ] Tag release version (if applicable)
- [ ] Update production deployment (if applicable)

---

**Last Updated:** 2025-01-10


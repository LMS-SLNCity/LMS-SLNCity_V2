# 🚀 Quick VM Deployment - Development Mode

## One-Command Deployment

### On Your VM:

```bash
# 1. Clone the repository
git clone https://github.com/LMS-SLNCity/LMS-SLNCity-V1.git
cd LMS-SLNCity-V1

# 2. Run the deployment script
./deploy-vm-dev.sh
```

That's it! The script will:
- ✅ Detect your VM IP automatically
- ✅ Configure environment files
- ✅ Build Docker images
- ✅ Start all services
- ✅ Load development test data

---

## Access the Application

**URL:** `http://YOUR_VM_IP:3000`

**Default Logins:**
- SUDO: `sudo` / `admin123`
- Admin: `admin` / `admin123`
- Reception: `reception` / `reception123`
- Lab: `lab` / `lab123`
- Phlebotomy: `phlebotomy` / `phlebotomy123`
- Approver: `approver` / `approver123`

---

## Quick Commands

```bash
# View logs
docker compose logs -f

# Restart services
docker compose restart

# Stop services
docker compose down

# Update from GitHub
git pull origin main
docker compose up -d --build

# Check status
docker compose ps
```

---

## Verify Optimization

1. Open browser DevTools (F12)
2. Go to Network tab
3. Login
4. **Should see ~5-10 API requests** (not 2000+!)

---

## Troubleshooting

**White screen?**
```bash
# Clear browser cache: Ctrl+Shift+R
docker compose logs frontend
docker compose up -d --build frontend
```

**Backend connection error?**
```bash
# Check backend is running
docker compose ps backend
docker compose logs backend

# Verify .env has correct VM IP
cat .env
```

**Database issues?**
```bash
# Restart database
docker compose restart postgres

# Fresh start (deletes data!)
docker compose down -v
docker compose up -d
```

---

## What's Deployed?

- ✅ PostgreSQL with development test data
- ✅ Node.js Backend API (port 5002)
- ✅ React Frontend (port 3000)
- ✅ Lazy loading optimization (5-10 API calls)
- ✅ All features enabled
- ✅ Test users and sample data

---

## Next Steps

1. ✅ Test all functionality
2. ✅ Create test visits
3. ✅ Generate reports
4. ✅ Test all user roles
5. 🔜 Plan production deployment

---

## Need Help?

Check the full guide: `VM-DEPLOYMENT-DEV.md`


# VM Deployment Guide - Development Version

## 🎯 Overview
This guide will help you deploy the LMS application to your VM in **development mode** with test data.

---

## 📋 Prerequisites on VM

### 1. Install Docker
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (to run docker without sudo)
sudo usermod -aG docker $USER

# Log out and log back in for group changes to take effect
# Or run: newgrp docker

# Verify Docker installation
docker --version
docker compose version
```

### 2. Install Git
```bash
sudo apt install git -y
git --version
```

### 3. Open Required Ports
```bash
# Allow ports for frontend, backend, and postgres
sudo ufw allow 3000/tcp  # Frontend
sudo ufw allow 5002/tcp  # Backend API
sudo ufw allow 5433/tcp  # PostgreSQL (optional, for external access)
sudo ufw enable
sudo ufw status
```

---

## 🚀 Deployment Steps

### Step 1: Clone the Repository
```bash
# Navigate to your preferred directory
cd ~

# Clone the repository
git clone https://github.com/LMS-SLNCity/LMS-SLNCity-V1.git

# Navigate to project directory
cd LMS-SLNCity-V1
```

### Step 2: Configure Environment Variables

**Get your VM's IP address:**
```bash
# Get VM IP address
hostname -I | awk '{print $1}'
# Example output: 192.168.1.100
```

**Create `.env` file for frontend:**
```bash
cat > .env << 'EOF'
# Frontend Environment Configuration
# Replace YOUR_VM_IP with your actual VM IP address
VITE_API_URL=http://YOUR_VM_IP:5002

# Optional: Gemini API Key (for AI features)
GEMINI_API_KEY=your_gemini_api_key_here
EOF
```

**Edit the `.env` file and replace `YOUR_VM_IP`:**
```bash
# Replace YOUR_VM_IP with your actual IP (e.g., 192.168.1.100)
nano .env
# Press Ctrl+X, then Y, then Enter to save
```

**Create `server/.env` file for backend:**
```bash
cat > server/.env << 'EOF'
# VM DEVELOPMENT CONFIGURATION
PORT=5002
DB_HOST=postgres
DB_PORT=5432
DB_USER=lms_user
DB_PASSWORD=lms_password
DB_NAME=lms_slncity
NODE_ENV=development

# JWT Secret (Generated: 2025-11-03)
JWT_SECRET=e338cec6670e03b9cab465f4331062c9233e5a61e93f04e77b844d0ff597702a4693ffbfb147008ae78f7a2d35c15c63e7f7bfc02624f2609928e687dec16d95

# Frontend URL for CORS - Replace YOUR_VM_IP with your actual VM IP
FRONTEND_URL=http://YOUR_VM_IP:3000
EOF
```

**Edit the `server/.env` file and replace `YOUR_VM_IP`:**
```bash
# Replace YOUR_VM_IP with your actual IP (e.g., 192.168.1.100)
nano server/.env
# Press Ctrl+X, then Y, then Enter to save
```

### Step 3: Build and Start Services
```bash
# Set environment to development (loads test data)
export ENV=development

# Build and start all services
docker compose up -d --build

# This will:
# 1. Build the backend Docker image
# 2. Build the frontend Docker image with your VM IP
# 3. Start PostgreSQL with development seed data
# 4. Start backend API server
# 5. Start frontend web server
```

### Step 4: Verify Deployment
```bash
# Check if all containers are running
docker compose ps

# You should see 3 containers running:
# - lms-postgres (healthy)
# - lms-backend (healthy)
# - lms-frontend (running)

# Check logs if needed
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f postgres
```

### Step 5: Access the Application

**From your local machine (browser):**
```
http://YOUR_VM_IP:3000
```

**Default Login Credentials (Development):**
- **SUDO User:** `sudo` / `admin123`
- **Admin User:** `admin` / `admin123`
- **Reception User:** `reception` / `reception123`
- **Lab User:** `lab` / `lab123`
- **Phlebotomy User:** `phlebotomy` / `phlebotomy123`
- **Approver User:** `approver` / `approver123`

---

## 🔄 Update/Redeploy

When you push new changes to GitHub and want to update the VM:

```bash
# Navigate to project directory
cd ~/LMS-SLNCity-V1

# Pull latest changes
git pull origin main

# Rebuild and restart services
docker compose down
docker compose up -d --build

# Or use the quick redeploy script
./redeploy.sh
```

---

## 🛠️ Useful Commands

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
# Restart all services
docker compose restart

# Restart specific service
docker compose restart frontend
docker compose restart backend
```

### Stop Services
```bash
# Stop all services (keeps data)
docker compose down

# Stop and remove all data (fresh start)
docker compose down -v
```

### Check Service Health
```bash
# Check container status
docker compose ps

# Check backend health endpoint
curl http://localhost:5002/health

# Check if frontend is serving
curl http://localhost:3000
```

### Database Access
```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U lms_user -d lms_slncity

# Inside psql:
\dt              # List all tables
\d visits        # Describe visits table
SELECT * FROM users;  # Query users
\q               # Quit
```

---

## 🐛 Troubleshooting

### Issue: Containers not starting
```bash
# Check logs
docker compose logs

# Check if ports are already in use
sudo netstat -tulpn | grep -E '3000|5002|5433'

# Kill processes using the ports if needed
sudo kill -9 <PID>
```

### Issue: Frontend shows "Cannot connect to backend"
```bash
# 1. Check if backend is running
docker compose ps backend

# 2. Check backend logs
docker compose logs backend

# 3. Verify VITE_API_URL in .env matches your VM IP
cat .env

# 4. Rebuild frontend with correct API URL
docker compose up -d --build frontend
```

### Issue: Database connection errors
```bash
# 1. Check if postgres is healthy
docker compose ps postgres

# 2. Check postgres logs
docker compose logs postgres

# 3. Restart postgres
docker compose restart postgres

# 4. If needed, reset database (WARNING: deletes all data)
docker compose down -v
docker compose up -d
```

### Issue: White screen or JavaScript errors
```bash
# 1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
# 2. Open browser console (F12) and check for errors
# 3. Rebuild frontend
docker compose up -d --build frontend
```

---

## 📊 Performance Verification

After deployment, verify the lazy loading optimization is working:

1. Open browser DevTools (F12)
2. Go to Network tab
3. Login with `sudo` / `admin123`
4. Check the number of API requests:
   - ✅ Should be ~5-10 requests
   - ❌ If you see 2000+ requests, something is wrong

---

## 🔒 Security Notes

**For Development:**
- Default passwords are simple for testing
- JWT secret is included in the repo
- Database is accessible on port 5433

**Before Production:**
- Change all default passwords
- Generate new JWT secret
- Remove database port exposure
- Set up SSL/HTTPS
- Configure firewall rules
- Use environment-specific secrets

---

## 📝 Next Steps

1. ✅ Deploy to VM using this guide
2. ✅ Test all functionality
3. ✅ Verify lazy loading is working (5-10 API calls)
4. ✅ Create test visits and reports
5. ✅ Test all user roles
6. 🔜 Plan production deployment with security hardening

---

## 📞 Support

If you encounter issues:
1. Check the logs: `docker compose logs -f`
2. Verify environment variables in `.env` files
3. Ensure VM IP is correctly configured
4. Check firewall rules: `sudo ufw status`


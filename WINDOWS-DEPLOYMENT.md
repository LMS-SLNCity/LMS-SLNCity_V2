# LMS SLNCity - Windows Deployment Guide
**Sri Lakshmi Narasimha Diagnostic Center**

## 📋 Prerequisites

Before deploying, ensure you have the following installed:

### 1. Node.js (v18.x or higher)
- Download from: https://nodejs.org/
- Choose "LTS" version
- During installation, check "Add to PATH"
- Verify installation:
  ```cmd
  node --version
  npm --version
  ```

### 2. Docker Desktop
- Download from: https://www.docker.com/products/docker-desktop
- Install and restart your computer
- Start Docker Desktop
- Verify installation:
  ```cmd
  docker --version
  ```

### 3. Git (Optional, for updates)
- Download from: https://git-scm.com/download/win
- Use default settings during installation

---

## 🚀 Quick Start (One-Click Deployment)

### Step 1: Extract the Project
1. Extract the ZIP file to a folder (e.g., `C:\LMS-SLNCity`)
2. Open the folder

### Step 2: Run Deployment Script
1. Right-click on `deploy-windows.bat`
2. Select **"Run as Administrator"**
3. Wait for the script to complete (5-10 minutes)

### Step 3: Start the Application
1. Double-click `start-all.bat`
2. Two command windows will open (Backend + Frontend)
3. Wait 30 seconds for servers to start
4. Open browser to: http://localhost:5173

### Step 4: Login
- **Username**: `sudo`
- **Password**: `Password123`

---

## 📁 Project Structure

```
LMS-SLNCity-V1/
├── deploy-windows.bat          # One-click deployment script
├── start-all.bat               # Start all services
├── start-backend.bat           # Start backend only
├── start-frontend.bat          # Start frontend only
├── server/
│   ├── db/
│   │   ├── init.sql           # Database schema
│   │   ├── seed-development.sql  # Test data
│   │   └── seed-production.sql   # Production data
│   └── src/                    # Backend code
├── components/                 # Frontend components
└── pages/                      # Frontend pages
```

---

## 🔧 Manual Deployment (If Script Fails)

### Step 1: Start Database
```cmd
docker run -d ^
  --name lms-postgres-dev ^
  -e POSTGRES_USER=lms_user ^
  -e POSTGRES_PASSWORD=lms_password ^
  -e POSTGRES_DB=lms_slncity ^
  -p 5433:5432 ^
  -v lms-slncity-v1_postgres_dev_data:/var/lib/postgresql/data ^
  postgres:16-alpine
```

### Step 2: Wait for Database (30 seconds)
```cmd
timeout /t 30 /nobreak
```

### Step 3: Initialize Database Schema
```cmd
docker exec -i lms-postgres-dev psql -U lms_user -d lms_slncity < server\db\init.sql
```

### Step 4: Load Seed Data
```cmd
docker exec -i lms-postgres-dev psql -U lms_user -d lms_slncity < server\db\seed-development.sql
```

### Step 5: Install Dependencies
```cmd
npm install
cd server
npm install
cd ..
```

### Step 6: Start Backend
Open a new command prompt:
```cmd
cd server
set JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
set PORT=5001
npm run dev
```

### Step 7: Start Frontend
Open another command prompt:
```cmd
npm run dev
```

---

## 🛠️ Common Issues & Solutions

### Issue 1: "Docker is not running"
**Solution**: 
1. Open Docker Desktop
2. Wait for it to fully start (whale icon in system tray)
3. Run the script again

### Issue 2: "Port 5433 is already in use"
**Solution**:
```cmd
docker stop lms-postgres-dev
docker rm lms-postgres-dev
```
Then run deployment script again.

### Issue 3: "Permission denied"
**Solution**: 
- Right-click the script
- Select "Run as Administrator"

### Issue 4: "Database connection failed"
**Solution**:
1. Check if Docker container is running:
   ```cmd
   docker ps
   ```
2. If not running, restart:
   ```cmd
   docker start lms-postgres-dev
   ```

### Issue 5: "npm install fails"
**Solution**:
1. Delete `node_modules` folders:
   ```cmd
   rmdir /s /q node_modules
   rmdir /s /q server\node_modules
   ```
2. Clear npm cache:
   ```cmd
   npm cache clean --force
   ```
3. Run deployment script again

---

## 🔄 Daily Operations

### Starting the Application
1. Make sure Docker Desktop is running
2. Double-click `start-all.bat`
3. Open browser to http://localhost:5173

### Stopping the Application
1. Close the command windows (Backend + Frontend)
2. Stop database (optional):
   ```cmd
   docker stop lms-postgres-dev
   ```

### Restarting Everything
1. Stop all services
2. Run `deploy-windows.bat` again

---

## 🗄️ Database Management

### View Database Data
```cmd
docker exec -it lms-postgres-dev psql -U lms_user -d lms_slncity
```

Common queries:
```sql
-- View all users
SELECT * FROM users;

-- View all patients
SELECT * FROM patients;

-- View all visits
SELECT * FROM visits;

-- Exit
\q
```

### Reset Database (Fresh Start)
```cmd
docker stop lms-postgres-dev
docker rm lms-postgres-dev
docker volume rm lms-slncity-v1_postgres_dev_data
```
Then run `deploy-windows.bat` again.

### Backup Database
```cmd
docker exec lms-postgres-dev pg_dump -U lms_user lms_slncity > backup.sql
```

### Restore Database
```cmd
docker exec -i lms-postgres-dev psql -U lms_user -d lms_slncity < backup.sql
```

---

## 🔐 Security Notes

### Change Default Passwords (IMPORTANT!)

1. **Database Password**:
   - Edit `deploy-windows.bat`
   - Change `POSTGRES_PASSWORD=lms_password` to a strong password
   - Update connection strings in backend code

2. **JWT Secret**:
   - Edit `start-backend.bat`
   - Change `JWT_SECRET` to a random 32+ character string

3. **Admin Password**:
   - Login as `sudo`
   - Go to Settings → Change Password
   - Use a strong password

---

## 📊 System Requirements

### Minimum:
- Windows 10/11 (64-bit)
- 4 GB RAM
- 10 GB free disk space
- Internet connection (for initial setup)

### Recommended:
- Windows 10/11 (64-bit)
- 8 GB RAM
- 20 GB free disk space
- SSD for better performance

---

## 🆘 Support

### Check Logs

**Backend Logs**: Check the "LMS Backend" command window

**Frontend Logs**: Check the "LMS Frontend" command window

**Database Logs**:
```cmd
docker logs lms-postgres-dev
```

### Get Help
1. Check this guide first
2. Review error messages in command windows
3. Check Docker Desktop for container status
4. Contact system administrator

---

## 📝 Default Test Data

After deployment, the system includes:

- **Users**: 
  - sudo (admin)
  - reception1, reception2
  - lab1, lab2
  - doctor1

- **Patients**: 5 sample patients
- **Tests**: 20+ test templates
- **Referral Doctors**: 3 doctors
- **B2B Clients**: 2 clients

All passwords: `Password123` (change in production!)

---

## 🎯 Next Steps

1. ✅ Deploy using `deploy-windows.bat`
2. ✅ Start application using `start-all.bat`
3. ✅ Login and test the system
4. ✅ Change default passwords
5. ✅ Add real users and data
6. ✅ Configure backup schedule
7. ✅ Train staff on the system

---

**Version**: 1.0  
**Last Updated**: 2025-01-05  
**Organization**: Sri Lakshmi Narasimha Diagnostic Center (SLNCity)


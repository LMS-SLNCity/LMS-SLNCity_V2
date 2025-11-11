# 🚀 Deploy to AWS EC2 - Step by Step

## Server Details
- **IP Address**: `13.201.165.54`
- **Instance Type**: t3.micro
- **Docker**: ✅ Installed

---

## 📋 Pre-Deployment Checklist

### 1. AWS Security Group Configuration
Open these ports in your EC2 Security Group:

```
Port 22   - SSH (Your IP only for security)
Port 80   - HTTP (0.0.0.0/0)
Port 3000 - Frontend (0.0.0.0/0)
Port 5002 - Backend API (0.0.0.0/0)
Port 5433 - PostgreSQL (Optional - only if you need external DB access)
```

**How to configure:**
1. Go to AWS Console → EC2 → Security Groups
2. Select your instance's security group
3. Click "Edit inbound rules"
4. Add the above rules
5. Save

---

## 🔧 Deployment Steps

### Step 1: Connect to Your EC2 Instance

```bash
ssh -i your-key.pem ubuntu@13.201.165.54
```

Or if using Amazon Linux:
```bash
ssh -i your-key.pem ec2-user@13.201.165.54
```

---

### Step 2: Verify Prerequisites

```bash
# Check Docker
docker --version

# Check Docker Compose
docker compose version

# If Docker Compose is not installed:
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Check Git
git --version

# If Git is not installed:
sudo yum install git -y    # Amazon Linux
# OR
sudo apt-get install git -y  # Ubuntu
```

---

### Step 3: Clone the Repository

```bash
# Navigate to home directory
cd ~

# Clone repository
git clone https://github.com/LMS-SLNCity/LMS-SLNCity-V1.git

# Navigate to project
cd LMS-SLNCity-V1

# Verify files
ls -la
```

---

### Step 4: Generate JWT Secret

```bash
# Generate a secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**IMPORTANT**: Copy the output - you'll need it in the next step!

---

### Step 5: Create Environment File

```bash
# Create .env file
nano .env
```

Paste this content (replace JWT_SECRET with the value from Step 4):

```env
ENV=production
POSTGRES_USER=lms_user
POSTGRES_PASSWORD=lms_password_secure_2024
POSTGRES_DB=lms_slncity
DB_HOST=postgres
DB_PORT=5432
DB_USER=lms_user
DB_PASSWORD=lms_password_secure_2024
DB_NAME=lms_slncity
NODE_ENV=production
PORT=5002
JWT_SECRET=PASTE_YOUR_GENERATED_SECRET_HERE
VITE_API_URL=http://13.201.165.54:5002
FRONTEND_URL=http://13.201.165.54:3000
```

**Save and exit**: Press `Ctrl+X`, then `Y`, then `Enter`

---

### Step 6: Deploy the Application

```bash
# Build and start all services
docker compose up -d --build
```

This will:
- ✅ Build the backend Docker image
- ✅ Build the frontend Docker image  
- ✅ Pull PostgreSQL image
- ✅ Start all containers
- ✅ Initialize database with schema
- ✅ Seed initial data (users, test templates, etc.)

**Expected output**: You should see containers being built and started.

---

### Step 7: Monitor the Deployment

```bash
# Check container status
docker ps

# You should see 3 containers running:
# - lms-postgres (healthy)
# - lms-backend (healthy)
# - lms-frontend (up)

# View logs (press Ctrl+C to exit)
docker compose logs -f

# Or view specific service logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

---

### Step 8: Verify Services

```bash
# Test backend health endpoint
curl http://localhost:5002/health

# Expected output: {"status":"ok","timestamp":"..."}

# Test frontend
curl -I http://localhost:3000

# Expected output: HTTP/1.1 200 OK
```

---

### Step 9: Verify Database

```bash
# Connect to database
docker exec -it lms-postgres psql -U lms_user -d lms_slncity

# Run verification queries
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as test_count FROM test_templates;
SELECT COUNT(*) as branch_count FROM branches;

# Exit database
\q
```

**Expected results**:
- Users: 6
- Test templates: ~50+
- Branches: 1

---

### Step 10: Test from Your Local Machine

Open your browser and navigate to:

```
http://13.201.165.54:3000
```

**Production Login Credentials**:
- **Username**: `sudo`
- **Password**: `$iva@V3nna21`

**Test the following**:
1. ✅ Login page loads
2. ✅ Can login with admin credentials
3. ✅ Dashboard loads
4. ✅ Can navigate to different sections
5. ✅ Can create a new visit
6. ✅ Can view reports

---

## 🎯 Post-Deployment Tasks

### 1. Change Default Passwords

After first login, change these default passwords:
- Admin user password
- Database password (in .env file)

### 2. Set Up Auto-Start on Reboot

```bash
# Enable Docker to start on boot
sudo systemctl enable docker

# Test reboot
sudo reboot

# After reboot, reconnect and check
ssh -i your-key.pem ubuntu@13.201.165.54
docker ps
```

### 3. Set Up Log Rotation

```bash
# Configure Docker log rotation
sudo nano /etc/docker/daemon.json
```

Add:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Restart Docker:
```bash
sudo systemctl restart docker
cd ~/LMS-SLNCity-V1
docker compose up -d
```

---

## 🔍 Troubleshooting

### Issue: Containers won't start

```bash
# Check logs
docker compose logs

# Check disk space (t3.micro has limited storage)
df -h

# If low on space, clean up
docker system prune -a
```

### Issue: Can't access from browser

1. **Check Security Group**: Ensure ports 3000 and 5002 are open
2. **Check containers**: `docker ps` - all should be running
3. **Check backend**: `curl http://localhost:5002/health`
4. **Check frontend**: `curl http://localhost:3000`

### Issue: Database connection errors

```bash
# Check if PostgreSQL is healthy
docker ps

# Restart database
docker compose restart postgres

# Check logs
docker compose logs postgres
```

### Issue: Out of memory (t3.micro has 1GB RAM)

```bash
# Check memory usage
free -h

# Check container stats
docker stats

# If needed, restart containers
docker compose restart
```

---

## 📊 Monitoring Commands

```bash
# View all container logs
docker compose logs -f

# View specific service
docker compose logs -f backend

# Check container status
docker ps

# Check resource usage
docker stats

# Check disk space
df -h

# Check memory
free -h
```

---

## 🔄 Update Application

When you need to deploy updates:

```bash
# Connect to server
ssh -i your-key.pem ubuntu@13.201.165.54

# Navigate to project
cd ~/LMS-SLNCity-V1

# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose up -d --build

# Verify
docker ps
curl http://localhost:5002/health
```

---

## 💾 Backup Database

```bash
# Create backup
docker exec lms-postgres pg_dump -U lms_user lms_slncity > backup_$(date +%Y%m%d_%H%M%S).sql

# List backups
ls -lh backup_*.sql

# Restore from backup (if needed)
docker exec -i lms-postgres psql -U lms_user -d lms_slncity < backup_20250111_120000.sql
```

---

## ✅ Success Criteria

Your deployment is successful when:

- [ ] All 3 containers are running and healthy
- [ ] Backend health check returns OK
- [ ] Frontend loads in browser
- [ ] Can login with admin credentials
- [ ] Can create and view visits
- [ ] Can generate reports
- [ ] Database has seeded data

---

## 📞 Need Help?

If you encounter issues:

1. Check the logs: `docker compose logs -f`
2. Review DEPLOYMENT.md for detailed troubleshooting
3. Check GitHub repository issues
4. Verify all environment variables in .env file

---

## 🎉 Next Steps After Successful Deployment

1. **Change default passwords** for all users
2. **Set up SSL/HTTPS** (recommended for production)
3. **Configure domain name** instead of IP address
4. **Set up automated backups** to S3
5. **Configure monitoring** and alerts
6. **Document your custom configurations**

---

**Good luck with your deployment! 🚀**


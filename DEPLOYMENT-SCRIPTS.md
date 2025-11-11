# 🚀 LMS SLNCity - Deployment Scripts Guide

## 📋 Overview

This repository includes three automated deployment scripts to simplify deploying and managing your LMS application on AWS EC2.

### Scripts Included:

| Script | Purpose | Run From | Use Case |
|--------|---------|----------|----------|
| **deploy-to-ec2.sh** | Helper script to deploy from your local machine | Local Machine | First time deployment or updates |
| **deploy.sh** | Full deployment script | EC2 Instance | Complete setup with Docker, database, etc. |
| **redeploy.sh** | Quick update script | EC2 Instance | Deploy code changes without full setup |

---

## 🎯 Quick Start (Recommended)

### Option 1: Deploy from Local Machine (Easiest)

This is the **recommended** method for most users.

```bash
# 1. Make sure you're in the project directory
cd /path/to/LMS-SLNCity-V1

# 2. Run the helper script with your EC2 SSH key
./deploy-to-ec2.sh /path/to/your-ec2-key.pem

# 3. Follow the interactive menu
```

The script will:
- ✅ Test connection to EC2
- ✅ Copy deployment scripts to EC2
- ✅ Give you options to deploy or redeploy
- ✅ Show you the application URL when done

---

## 📖 Detailed Usage

### 1️⃣ deploy-to-ec2.sh (Local Machine)

**Purpose**: Run this on your LOCAL machine to manage EC2 deployment

**Prerequisites**:
- SSH key file (.pem) for EC2 access
- EC2 instance running (13.201.165.54)
- Security group allows SSH (port 22)

**Usage**:
```bash
./deploy-to-ec2.sh /path/to/your-key.pem
```

**Interactive Menu**:
```
1) Full deployment (first time setup)
   - Installs Docker
   - Clones repository
   - Deploys application
   - Takes 10-15 minutes

2) Quick redeploy (update existing deployment)
   - Pulls latest code
   - Rebuilds containers
   - Takes 3-5 minutes

3) Just copy scripts and exit
   - Copies scripts to EC2
   - You run them manually

4) Open SSH session
   - Opens terminal on EC2
   - For manual operations

5) Exit
```

**Example**:
```bash
# First time deployment
./deploy-to-ec2.sh ~/Downloads/my-ec2-key.pem
# Choose option 1 from menu

# Later, to deploy updates
./deploy-to-ec2.sh ~/Downloads/my-ec2-key.pem
# Choose option 2 from menu
```

---

### 2️⃣ deploy.sh (EC2 Instance)

**Purpose**: Complete deployment script that runs ON the EC2 instance

**What it does**:
1. ✅ Updates system packages
2. ✅ Installs Docker and Docker Compose
3. ✅ Clones the GitHub repository
4. ✅ Generates secure JWT secret
5. ✅ Creates .env file with production settings
6. ✅ Builds and starts Docker containers
7. ✅ Verifies deployment
8. ✅ Shows access information

**Usage** (on EC2):
```bash
# SSH to EC2 first
ssh -i your-key.pem ubuntu@13.201.165.54

# Run deployment script
./deploy.sh
```

**What you'll see**:
```
╔══════════════════════════════════════════════════════════════╗
║              LMS SLNCity - Deployment Script                 ║
╚══════════════════════════════════════════════════════════════╝

Step 1: Updating System
Step 2: Installing Docker
Step 3: Installing Docker Compose
Step 4: Cloning Repository
Step 5: Creating Environment File
Step 6: Deploying Application
Step 7: Waiting for Services to Start
Step 8: Verifying Deployment

╔══════════════════════════════════════════════════════════════╗
║                🎉 DEPLOYMENT SUCCESSFUL! 🎉                  ║
╚══════════════════════════════════════════════════════════════╝
```

**Time Required**: 10-15 minutes (first time)

---

### 3️⃣ redeploy.sh (EC2 Instance)

**Purpose**: Quick redeployment after code changes

**What it does**:
1. ✅ Backs up .env file
2. ✅ Pulls latest code from GitHub
3. ✅ Restores .env file
4. ✅ Stops current containers
5. ✅ Rebuilds and restarts containers
6. ✅ Verifies deployment

**Usage** (on EC2):
```bash
# SSH to EC2 first
ssh -i your-key.pem ubuntu@13.201.165.54

# Run redeploy script
./redeploy.sh
```

**When to use**:
- ✅ After pushing code changes to GitHub
- ✅ To update frontend or backend code
- ✅ To apply configuration changes
- ❌ NOT for first time deployment (use deploy.sh)

**Time Required**: 3-5 minutes

---

## 🔧 Manual Deployment (Alternative)

If you prefer manual control:

### Step 1: Copy Scripts to EC2

```bash
# From your local machine
scp -i your-key.pem deploy.sh ubuntu@13.201.165.54:~/
scp -i your-key.pem redeploy.sh ubuntu@13.201.165.54:~/
```

### Step 2: SSH to EC2

```bash
ssh -i your-key.pem ubuntu@13.201.165.54
```

### Step 3: Make Scripts Executable

```bash
chmod +x deploy.sh redeploy.sh
```

### Step 4: Run Deployment

```bash
# First time
./deploy.sh

# Or for updates
./redeploy.sh
```

---

## 📊 What Gets Deployed

### Docker Containers:

| Container | Port | Purpose |
|-----------|------|---------|
| **lms-postgres** | 5432 (internal), 5433 (external) | PostgreSQL database |
| **lms-backend** | 5002 | Node.js/Express API server |
| **lms-frontend** | 3000 | React app served by Nginx |

### Environment Configuration:

The scripts automatically create a `.env` file with:
- ✅ Production environment settings
- ✅ Auto-generated JWT secret
- ✅ Secure database password
- ✅ Correct IP addresses (13.201.165.54)

### Database Initialization:

- ✅ Creates database schema
- ✅ Runs migrations
- ✅ Seeds production data (1 sudo user)
- ✅ Creates essential test templates

---

## 🔐 Security Features

### Automated Security:

1. **JWT Secret**: Auto-generated 32-byte random secret
2. **Database Password**: Auto-generated secure password
3. **Environment Isolation**: Production settings only
4. **No Hardcoded Secrets**: All sensitive data in .env

### Manual Security Steps:

After deployment, you should:
- [ ] Configure EC2 security groups properly
- [ ] Set up SSL/HTTPS (recommended)
- [ ] Enable database backups
- [ ] Monitor application logs
- [ ] Create additional users with strong passwords

---

## 🆘 Troubleshooting

### Script Fails to Connect to EC2

**Problem**: `Failed to connect to EC2 instance`

**Solutions**:
```bash
# 1. Check EC2 is running
aws ec2 describe-instances --instance-ids i-xxxxx

# 2. Check security group allows SSH from your IP
# Go to AWS Console → EC2 → Security Groups
# Ensure port 22 is open for your IP

# 3. Verify SSH key permissions
chmod 400 your-key.pem

# 4. Test connection manually
ssh -i your-key.pem ubuntu@13.201.165.54
```

### Docker Installation Fails

**Problem**: Docker installation errors

**Solution**:
```bash
# SSH to EC2 and run manually
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo usermod -aG docker ubuntu
# Log out and back in
```

### Containers Won't Start

**Problem**: `docker compose up` fails

**Solutions**:
```bash
# Check logs
cd ~/LMS-SLNCity-V1
docker compose logs

# Check disk space
df -h

# Check memory
free -h

# Restart Docker
sudo systemctl restart docker
docker compose up -d --build
```

### Application Not Accessible

**Problem**: Can't access http://13.201.165.54:3000

**Solutions**:
```bash
# 1. Check containers are running
docker compose ps

# 2. Check security group allows ports 3000 and 5002
# AWS Console → EC2 → Security Groups

# 3. Check application logs
docker compose logs frontend
docker compose logs backend

# 4. Test locally on EC2
curl http://localhost:3000
curl http://localhost:5002/health
```

### Database Connection Errors

**Problem**: Backend can't connect to database

**Solutions**:
```bash
# Check database is running
docker compose ps postgres

# Check database logs
docker compose logs postgres

# Verify database credentials in .env
cat .env | grep POSTGRES

# Restart database
docker compose restart postgres
```

---

## 📚 Common Commands

### On Local Machine:

```bash
# Deploy to EC2
./deploy-to-ec2.sh ~/path/to/key.pem

# Copy files to EC2
scp -i key.pem file.txt ubuntu@13.201.165.54:~/

# SSH to EC2
ssh -i key.pem ubuntu@13.201.165.54
```

### On EC2 Instance:

```bash
# Navigate to app directory
cd ~/LMS-SLNCity-V1

# View running containers
docker compose ps

# View logs (all services)
docker compose logs -f

# View logs (specific service)
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres

# Restart services
docker compose restart

# Stop services
docker compose down

# Start services
docker compose up -d

# Rebuild and restart
docker compose up -d --build

# Check disk space
df -h

# Check memory
free -h

# Check system resources
htop
```

---

## 🎯 Deployment Checklist

### Before Deployment:

- [ ] EC2 instance is running
- [ ] Security group configured (ports 22, 3000, 5002)
- [ ] SSH key file available
- [ ] Git repository is up to date
- [ ] All code changes committed and pushed

### During Deployment:

- [ ] Run deploy-to-ec2.sh or deploy.sh
- [ ] Wait for completion (10-15 minutes)
- [ ] Note the JWT secret generated
- [ ] Verify all containers are running

### After Deployment:

- [ ] Access http://13.201.165.54:3000
- [ ] Login with sudo / $iva@V3nna21
- [ ] Create additional users
- [ ] Configure test templates
- [ ] Set up branches
- [ ] Test all functionality
- [ ] Set up database backups
- [ ] Monitor logs for errors

---

## 📞 Support

### Useful Resources:

- **DEPLOY-NOW.md**: Step-by-step manual deployment guide
- **DEPLOYMENT.md**: Comprehensive deployment documentation
- **QUICK-DEPLOY.md**: Quick reference commands
- **CREDENTIALS.md**: User credentials (local only)

### Getting Help:

If deployment fails:
1. Check the troubleshooting section above
2. Review container logs: `docker compose logs`
3. Check system resources: `df -h` and `free -h`
4. Verify security group settings in AWS Console

---

## 🔄 Update Workflow

### Typical workflow for deploying updates:

```bash
# 1. Make code changes locally
# 2. Test locally
docker compose up -d --build

# 3. Commit and push to GitHub
git add .
git commit -m "Your changes"
git push origin main

# 4. Deploy to EC2
./deploy-to-ec2.sh ~/path/to/key.pem
# Choose option 2 (Quick redeploy)

# 5. Verify deployment
# Open http://13.201.165.54:3000
```

---

## ✅ Summary

| Task | Command | Time |
|------|---------|------|
| **First deployment** | `./deploy-to-ec2.sh key.pem` → Option 1 | 10-15 min |
| **Deploy updates** | `./deploy-to-ec2.sh key.pem` → Option 2 | 3-5 min |
| **View logs** | SSH + `docker compose logs -f` | - |
| **Restart app** | SSH + `docker compose restart` | 1-2 min |

---

**Ready to deploy? Run `./deploy-to-ec2.sh /path/to/your-key.pem` to get started!** 🚀


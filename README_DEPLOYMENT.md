# 🚀 LMS SLNCity - AWS Deployment Ready

## ✅ Everything is Ready to Deploy!

---

## 📋 Quick Start

### On Your AWS Server (13.201.165.54)

```bash
# 1. Connect to AWS
ssh -i your-key.pem ubuntu@13.201.165.54

# 2. Clone repository
git clone https://github.com/LMS-SLNCity/LMS-SLNCity-V1.git
cd LMS-SLNCity-V1

# 3. Run deployment script
chmod +x deploy-aws.sh
./deploy-aws.sh
```

**That's it!** The script handles everything automatically.

---

## 🎯 What the Script Does

1. ✅ Installs Docker and Docker Compose (if needed)
2. ✅ Creates `.env` file with your configuration
3. ✅ Builds all Docker images (PostgreSQL, Backend, Frontend)
4. ✅ Starts all services
5. ✅ Configures firewall (SSH, HTTP, HTTPS)
6. ✅ Sets up automated daily backups (2 AM)
7. ✅ Creates management scripts
8. ✅ Verifies deployment
9. ✅ Optionally changes default passwords

---

## 🌐 Access URLs

After deployment:

- **Frontend**: http://13.201.165.54
- **Backend API**: http://13.201.165.54:5002/api
- **Health Check**: http://13.201.165.54:5002/api/health

---

## 🔐 Default Credentials

- **Username**: `sudo`
- **Password**: `ChangeMe@123`

⚠️ **IMPORTANT**: Change these immediately after first login!

---

## 🛠️ Management Scripts

After deployment, you'll have these scripts in your home directory:

```bash
~/status-lms.sh       # Check system status
~/restart-lms.sh      # Restart all services
~/start-lms.sh        # Start all services
~/stop-lms.sh         # Stop all services
~/logs-lms.sh         # View logs in real-time
~/backup-database.sh  # Create manual backup
```

---

## 🛡️ Data Safety

### Automated Backups
- ✅ Daily backups at 2 AM
- ✅ Stored in `~/backups/`
- ✅ 7-day retention
- ✅ Compressed with gzip

### Data Persistence
- ✅ Database data in Docker volume
- ✅ Survives container restarts
- ✅ Protected from accidental deletion

### Manual Backup
```bash
~/backup-database.sh
```

---

## 📊 Configuration

Your configuration is in `.env`:

```env
NODE_ENV=production
DB_HOST=postgres
DB_PORT=5432
DB_USER=lms_user
DB_PASSWORD=lms_password
DB_NAME=lms_slncity
PORT=5002
JWT_SECRET=UaKjjogf15hJtr6eVa7OGo7omGe3wuUQkS89o6AYYyDaXDSmbrKagzHR/b7h3UYf
VITE_API_URL=http://13.201.165.54:5002/api
FRONTEND_URL=http://13.201.165.54
```

---

## 🔍 Verify Deployment

```bash
# Check status
~/status-lms.sh

# View logs
~/logs-lms.sh

# Check containers
docker ps

# Test backend
curl http://localhost:5002/health

# Test frontend
curl http://localhost:80
```

---

## 🔄 Update Application

```bash
cd ~/LMS-SLNCity-V1

# 1. Backup first!
~/backup-database.sh

# 2. Pull latest code
git pull origin main

# 3. Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify
~/status-lms.sh
```

---

## 🚨 Troubleshooting

### Services not starting?
```bash
# Check logs
~/logs-lms.sh

# Check container status
docker ps -a

# Restart services
~/restart-lms.sh
```

### Can't access from browser?
```bash
# Check firewall
sudo ufw status

# Make sure ports are open
sudo ufw allow 80/tcp
sudo ufw allow 5002/tcp
```

### Database issues?
```bash
# Check database
docker exec lms-postgres pg_isready -U lms_user

# View database logs
docker logs lms-postgres

# Restart database
docker-compose -f docker-compose.prod.yml restart postgres
```

---

## 📚 Documentation

### Essential Reading
1. **DEPLOY_NOW.md** - Quick deployment guide
2. **DATA_SAFETY_PROTOCOL.md** - Data protection rules
3. **AWS_QUICK_REFERENCE.md** - Daily operations

### Complete Guides
4. **AWS_DEPLOYMENT_COMMANDS.md** - Detailed commands
5. **AWS_DEPLOYMENT_CHECKLIST.md** - Step-by-step checklist
6. **PRODUCTION_DEPLOYMENT_SUMMARY.md** - Complete overview

---

## 🎯 Architecture

```
Internet
   ↓
Nginx (Port 80/443)
   ↓
Backend (Port 5002)
   ↓
PostgreSQL (Port 5432 - internal)
   ↓
Docker Volume (postgres_data)
   ↓
Daily Backups (~/backups/)
```

---

## ✅ Pre-Deployment Checklist

Before running the deployment script:

- [ ] AWS EC2 instance is running
- [ ] Security group allows SSH (22), HTTP (80), HTTPS (443)
- [ ] You have SSH access to the server
- [ ] Server IP is 13.201.165.54
- [ ] You have the SSH key file

---

## 🎉 Post-Deployment Checklist

After deployment completes:

- [ ] Access frontend at http://13.201.165.54
- [ ] Login with sudo/ChangeMe@123
- [ ] Change default passwords
- [ ] Create a test visit
- [ ] Print a test report
- [ ] Verify doctor designation shows in report
- [ ] Check audit logs
- [ ] Verify backup was created (`ls ~/backups/`)
- [ ] Test management scripts (`~/status-lms.sh`)

---

## 🔐 Security Checklist

- [ ] Default passwords changed
- [ ] Firewall enabled (UFW)
- [ ] Only necessary ports open (22, 80, 443)
- [ ] Database not exposed to internet
- [ ] Backups configured and tested
- [ ] SSL certificate installed (optional)

---

## 💡 Tips

### Daily Operations
```bash
# Morning check
~/status-lms.sh

# View recent logs
docker-compose -f ~/LMS-SLNCity-V1/docker-compose.prod.yml logs --tail=100

# Check disk space
df -h

# Check memory
free -h
```

### Weekly Tasks
```bash
# Check backups
ls -lh ~/backups/

# Test restore (on test server)
# Review audit logs
# Check for updates
```

### Monthly Tasks
```bash
# Review security
# Update system packages
# Review and clean old logs
# Test disaster recovery
```

---

## 📞 Support

### Deployment Info
```bash
cat ~/deployment-info.txt
```

### System Status
```bash
~/status-lms.sh
```

### View Logs
```bash
~/logs-lms.sh
```

---

## 🚀 Ready to Deploy!

Everything is configured and ready. Just run:

```bash
ssh -i your-key.pem ubuntu@13.201.165.54
git clone https://github.com/LMS-SLNCity/LMS-SLNCity-V1.git
cd LMS-SLNCity-V1
chmod +x deploy-aws.sh
./deploy-aws.sh
```

The script will guide you through the rest!

---

**Last Updated**: 2025-11-10  
**Version**: 1.0  
**Status**: ✅ READY TO DEPLOY


# 🚀 Deploy to AWS - Quick Start

## One-Command Deployment

### On AWS EC2 Server

```bash
# 1. Connect to your AWS server
ssh -i your-key.pem ubuntu@13.201.165.54

# 2. Clone the repository (if not already done)
cd ~
git clone https://github.com/LMS-SLNCity/LMS-SLNCity-V1.git
cd LMS-SLNCity-V1

# 3. Make the deployment script executable
chmod +x deploy-aws.sh

# 4. Run the deployment script
./deploy-aws.sh
```

That's it! The script will:
- ✅ Install Docker and Docker Compose (if needed)
- ✅ Create .env file with your configuration
- ✅ Build all Docker images
- ✅ Start all services (PostgreSQL, Backend, Frontend)
- ✅ Configure firewall
- ✅ Setup automated daily backups
- ✅ Create management scripts
- ✅ Verify deployment

---

## After Deployment

### Access Your Application

- **Frontend**: http://13.201.165.54
- **Backend API**: http://13.201.165.54:5002/api
- **Health Check**: http://13.201.165.54:5002/api/health

### Default Login

- **Username**: `sudo`
- **Password**: `ChangeMe@123` (change this immediately!)

---

## Management Scripts

After deployment, you'll have these handy scripts:

```bash
# Check system status
~/status-lms.sh

# View logs in real-time
~/logs-lms.sh

# Restart all services
~/restart-lms.sh

# Stop all services
~/stop-lms.sh

# Start all services
~/start-lms.sh

# Create manual backup
~/backup-database.sh
```

---

## Important Notes

### 🛡️ Data Safety

- ✅ Database data is stored in a Docker volume
- ✅ Data persists across container restarts
- ✅ Automated daily backups at 2 AM
- ✅ Backups stored in `~/backups/` (7-day retention)

### 🔐 Security

- ✅ Change default passwords immediately
- ✅ Firewall configured (SSH, HTTP, HTTPS)
- ✅ Database not exposed to internet
- ✅ Backend accessible on port 5002

### 📊 Monitoring

```bash
# Check system status
~/status-lms.sh

# View container logs
~/logs-lms.sh

# Check disk space
df -h

# Check memory
free -h

# Check containers
docker ps
```

---

## Troubleshooting

### If deployment fails:

```bash
# Check logs
~/logs-lms.sh

# Check container status
docker ps -a

# Restart services
~/restart-lms.sh

# Check firewall
sudo ufw status
```

### If you need to rebuild:

```bash
cd ~/LMS-SLNCity-V1

# Stop services
docker-compose -f docker-compose.prod.yml down

# Rebuild
docker-compose -f docker-compose.prod.yml build --no-cache

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

---

## Configuration

Your configuration is in `.env` file:

```bash
# View configuration
cat ~/LMS-SLNCity-V1/.env

# Edit configuration
nano ~/LMS-SLNCity-V1/.env

# After editing, restart services
~/restart-lms.sh
```

---

## Backup & Restore

### Manual Backup

```bash
~/backup-database.sh
```

### List Backups

```bash
ls -lh ~/backups/
```

### Restore from Backup

```bash
# Stop services
cd ~/LMS-SLNCity-V1
docker-compose -f docker-compose.prod.yml down

# Start only database
docker-compose -f docker-compose.prod.yml up -d postgres
sleep 10

# Restore (replace YYYYMMDD_HHMMSS with actual date)
gunzip -c ~/backups/lms_backup_YYYYMMDD_HHMMSS.sql.gz | docker exec -i lms-postgres psql -U lms_user -d lms_slncity

# Start all services
docker-compose -f docker-compose.prod.yml up -d
```

---

## Update Application

```bash
cd ~/LMS-SLNCity-V1

# Backup first!
~/backup-database.sh

# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Check status
~/status-lms.sh
```

---

## Support

### Documentation Files

- `DATA_SAFETY_PROTOCOL.md` - Data protection rules
- `AWS_QUICK_REFERENCE.md` - Daily operations
- `PRODUCTION_DEPLOYMENT_SUMMARY.md` - Complete guide

### Deployment Info

```bash
# View deployment information
cat ~/deployment-info.txt
```

---

## Quick Health Check

```bash
# Run this to check everything
echo "=== LMS Health Check ==="
echo ""
echo "Containers:"
docker ps --filter "name=lms-"
echo ""
echo "Backend:"
curl -s http://localhost:5002/health
echo ""
echo "Frontend:"
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:80
echo ""
echo "Database:"
docker exec lms-postgres pg_isready -U lms_user
```

---

## 🎉 You're All Set!

Your LMS system is now running on AWS. Access it at:

**http://13.201.165.54**

Login with:
- Username: `sudo`
- Password: `ChangeMe@123` (change immediately!)

---

**Questions?** Check the documentation files or run `~/status-lms.sh` to see system status.


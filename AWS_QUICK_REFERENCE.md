# AWS Deployment - Quick Reference

## 🚀 Quick Start (Copy-Paste Commands)

### 1. Connect to Server
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 2. One-Time Setup (Run once)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo systemctl start docker && sudo systemctl enable docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Log out and back in
exit
```

### 3. Clone and Setup
```bash
# Clone repository
cd ~ && git clone https://github.com/LMS-SLNCity/LMS-SLNCity-V1.git
cd LMS-SLNCity-V1

# Generate secrets
echo "JWT_SECRET=$(openssl rand -base64 48)"
echo "DB_PASSWORD=$(openssl rand -base64 24)"

# Create .env file (edit with your values)
cat > .env << 'EOF'
NODE_ENV=production
DB_HOST=postgres
DB_PORT=5432
DB_USER=lms_user
DB_PASSWORD=YOUR_GENERATED_PASSWORD_HERE
DB_NAME=lms_slncity
PORT=5002
JWT_SECRET=YOUR_GENERATED_SECRET_HERE
VITE_API_URL=http://YOUR_IP_OR_DOMAIN/api
FRONTEND_URL=http://YOUR_IP_OR_DOMAIN
EOF

# Edit .env with your actual values
nano .env
```

### 4. Deploy
```bash
# Build and start
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker ps
docker-compose -f docker-compose.prod.yml logs -f
```

### 5. Change Default Passwords
```bash
docker exec -it lms-postgres psql -U lms_user -d lms_slncity << 'EOF'
UPDATE users SET password_hash = crypt('YourNewPassword123!', gen_salt('bf')) WHERE username = 'sudo';
UPDATE users SET password_hash = crypt('YourNewPassword123!', gen_salt('bf')) WHERE username = 'admin';
\q
EOF
```

### 6. Setup Firewall
```bash
sudo apt install -y ufw
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### 7. Setup Backups
```bash
mkdir -p ~/backups

cat > ~/backup-database.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/backups
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="lms_backup_${DATE}.sql"
docker exec lms-postgres pg_dump -U lms_user lms_slncity > "${BACKUP_DIR}/${BACKUP_FILE}"
gzip "${BACKUP_DIR}/${BACKUP_FILE}"
find ${BACKUP_DIR} -name "lms_backup_*.sql.gz" -mtime +7 -delete
echo "Backup completed: ${BACKUP_FILE}.gz"
EOF

chmod +x ~/backup-database.sh
~/backup-database.sh

# Add daily backup at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup-database.sh >> ~/backup.log 2>&1") | crontab -
```

---

## 📋 Daily Operations

### Check Status
```bash
# Container status
docker ps

# Logs (last 100 lines)
docker-compose -f docker-compose.prod.yml logs --tail=100

# Follow logs in real-time
docker-compose -f docker-compose.prod.yml logs -f

# Specific service logs
docker logs lms-backend
docker logs lms-frontend
docker logs lms-postgres
```

### Restart Services
```bash
# Restart all
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
docker-compose -f docker-compose.prod.yml restart frontend
docker-compose -f docker-compose.prod.yml restart postgres
```

### Stop/Start Services
```bash
# Stop all
docker-compose -f docker-compose.prod.yml down

# Start all
docker-compose -f docker-compose.prod.yml up -d

# Stop specific service
docker-compose -f docker-compose.prod.yml stop backend

# Start specific service
docker-compose -f docker-compose.prod.yml start backend
```

---

## 🔄 Update Application

```bash
cd ~/LMS-SLNCity-V1

# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 💾 Backup & Restore

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
docker-compose -f docker-compose.prod.yml down

# Start only database
docker-compose -f docker-compose.prod.yml up -d postgres
sleep 10

# Restore (replace YYYYMMDD_HHMMSS with actual backup date)
gunzip -c ~/backups/lms_backup_YYYYMMDD_HHMMSS.sql.gz | docker exec -i lms-postgres psql -U lms_user -d lms_slncity

# Start all services
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🗄️ Database Operations

### Connect to Database
```bash
docker exec -it lms-postgres psql -U lms_user -d lms_slncity
```

### Common SQL Commands
```sql
-- List all tables
\dt

-- Count users
SELECT COUNT(*) FROM users;

-- Count visits
SELECT COUNT(*) FROM visits;

-- Check database size
SELECT pg_size_pretty(pg_database_size('lms_slncity'));

-- View recent audit logs
SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10;

-- Exit
\q
```

### Change User Password
```bash
docker exec -it lms-postgres psql -U lms_user -d lms_slncity -c "UPDATE users SET password_hash = crypt('NewPassword123!', gen_salt('bf')) WHERE username = 'sudo';"
```

---

## 🔍 Monitoring

### System Resources
```bash
# Disk space
df -h

# Memory usage
free -h

# CPU usage
top

# Docker stats
docker stats

# Container resource usage
docker stats --no-stream
```

### Application Health
```bash
# Backend health check
curl http://localhost:5002/health

# Frontend check
curl http://localhost:80

# Database check
docker exec lms-postgres pg_isready -U lms_user
```

### Check Logs for Errors
```bash
# Backend errors
docker logs lms-backend 2>&1 | grep -i error

# Frontend errors
docker logs lms-frontend 2>&1 | grep -i error

# Database errors
docker logs lms-postgres 2>&1 | grep -i error

# All errors
docker-compose -f docker-compose.prod.yml logs 2>&1 | grep -i error
```

---

## 🔒 Security

### View Firewall Status
```bash
sudo ufw status verbose
```

### View Open Ports
```bash
sudo netstat -tulpn | grep LISTEN
```

### Check Failed Login Attempts
```bash
docker exec -it lms-postgres psql -U lms_user -d lms_slncity -c "SELECT * FROM audit_logs WHERE action LIKE '%login%' AND details LIKE '%failed%' ORDER BY timestamp DESC LIMIT 20;"
```

### Update System Security Patches
```bash
sudo apt update
sudo apt upgrade -y
sudo reboot  # If kernel updated
```

---

## 🐛 Troubleshooting

### Container Won't Start
```bash
# Check logs
docker logs lms-backend
docker logs lms-frontend
docker logs lms-postgres

# Check if port is in use
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :5002
sudo netstat -tulpn | grep :5432

# Remove and recreate
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### Database Connection Issues
```bash
# Check if database is ready
docker exec lms-postgres pg_isready -U lms_user

# Check database logs
docker logs lms-postgres

# Restart database
docker-compose -f docker-compose.prod.yml restart postgres
```

### Application Not Accessible
```bash
# Check containers
docker ps

# Check nginx
docker logs lms-frontend

# Check backend
docker logs lms-backend

# Test backend directly
curl http://localhost:5002/health

# Check firewall
sudo ufw status
```

### Out of Disk Space
```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a

# Clean old backups (keep last 7 days)
find ~/backups -name "lms_backup_*.sql.gz" -mtime +7 -delete

# Clean logs
sudo journalctl --vacuum-time=7d
```

### High Memory Usage
```bash
# Check memory
free -h

# Check Docker stats
docker stats --no-stream

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

---

## 🔐 SSL Certificate (Let's Encrypt)

### Install Certificate
```bash
# Install Certbot
sudo apt install -y certbot

# Stop frontend
docker-compose -f docker-compose.prod.yml stop frontend

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
mkdir -p ~/LMS-SLNCity-V1/nginx/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ~/LMS-SLNCity-V1/nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ~/LMS-SLNCity-V1/nginx/ssl/
sudo chown -R $USER:$USER ~/LMS-SLNCity-V1/nginx/ssl

# Update nginx config (uncomment HTTPS section)
nano ~/LMS-SLNCity-V1/nginx.prod.conf

# Restart frontend
docker-compose -f docker-compose.prod.yml up -d frontend
```

### Renew Certificate
```bash
# Manual renewal
sudo certbot renew

# Restart frontend
docker-compose -f docker-compose.prod.yml restart frontend
```

### Auto-Renewal (Already setup in cron)
```bash
# Check cron jobs
crontab -l

# Should see:
# 0 3 * * * certbot renew --quiet && docker-compose -f ~/LMS-SLNCity-V1/docker-compose.prod.yml restart frontend
```

---

## 📊 Performance Optimization

### Clear Docker Cache
```bash
docker system prune -a
```

### Optimize Database
```bash
docker exec -it lms-postgres psql -U lms_user -d lms_slncity -c "VACUUM ANALYZE;"
```

### View Slow Queries
```bash
docker exec -it lms-postgres psql -U lms_user -d lms_slncity -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

---

## 📞 Emergency Contacts

- **Server IP**: _______________
- **Domain**: _______________
- **SSH Key Location**: _______________
- **Database Password**: (stored in password manager)
- **JWT Secret**: (stored in password manager)

---

## 🔗 Important URLs

- **Frontend**: http://your-domain.com or http://your-ec2-ip
- **Backend API**: http://your-domain.com/api or http://your-ec2-ip/api
- **Health Check**: http://your-domain.com/api/health
- **AWS Console**: https://console.aws.amazon.com/

---

## 📝 Default Credentials (CHANGE IMMEDIATELY!)

- **Username**: sudo
- **Password**: ChangeMe@123

---

## 🎯 Quick Health Check

Run this to check everything at once:

```bash
echo "=== SYSTEM HEALTH CHECK ==="
echo ""
echo "1. Disk Space:"
df -h | grep -E "Filesystem|/$"
echo ""
echo "2. Memory:"
free -h
echo ""
echo "3. Containers:"
docker ps
echo ""
echo "4. Backend Health:"
curl -s http://localhost:5002/health
echo ""
echo "5. Database:"
docker exec lms-postgres pg_isready -U lms_user
echo ""
echo "6. Recent Errors:"
docker-compose -f ~/LMS-SLNCity-V1/docker-compose.prod.yml logs --tail=50 2>&1 | grep -i error | tail -5
echo ""
echo "=== END HEALTH CHECK ==="
```

---

## 📚 Documentation Files

- **Complete Guide**: `AWS_DEPLOYMENT_COMMANDS.md`
- **Checklist**: `AWS_DEPLOYMENT_CHECKLIST.md`
- **This File**: `AWS_QUICK_REFERENCE.md`
- **Changes Log**: `FIXES_SUMMARY.md`

---

**Last Updated**: 2025-11-10
**Version**: 1.0


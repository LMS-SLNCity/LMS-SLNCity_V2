# AWS Deployment Checklist

Use this checklist to ensure a smooth deployment to AWS.

---

## Pre-Deployment (Local)

### 1. Code Preparation
- [ ] All code changes committed to Git
- [ ] All tests passing locally
- [ ] No console.log or debug statements in production code
- [ ] Environment variables documented
- [ ] Database migrations tested
- [ ] Backup of current production database (if updating)

### 2. Configuration Files
- [ ] `docker-compose.prod.yml` created
- [ ] `server/Dockerfile.prod` created
- [ ] `Dockerfile.frontend.prod` created
- [ ] `nginx.prod.conf` created
- [ ] `.env.example` file created with all required variables
- [ ] `.gitignore` includes `.env` file

### 3. Security Review
- [ ] No hardcoded passwords or secrets
- [ ] JWT secret is strong (64+ characters)
- [ ] Database password is strong (24+ characters)
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] SQL injection prevention verified
- [ ] XSS protection enabled

### 4. Push to GitHub
```bash
git add .
git commit -m "Production deployment ready"
git push origin main
```

---

## AWS Setup

### 1. EC2 Instance
- [ ] Instance launched (t3.medium or t3.large)
- [ ] Ubuntu 22.04 LTS selected
- [ ] 30 GB storage allocated
- [ ] SSH key pair downloaded and secured
- [ ] Instance tagged appropriately

### 2. Security Group Configuration
- [ ] SSH (22) - Your IP only
- [ ] HTTP (80) - 0.0.0.0/0
- [ ] HTTPS (443) - 0.0.0.0/0
- [ ] PostgreSQL (5432) - NOT exposed to internet
- [ ] Security group named appropriately

### 3. Elastic IP (Optional but Recommended)
- [ ] Elastic IP allocated
- [ ] Elastic IP associated with instance
- [ ] DNS A record updated (if using domain)

---

## Server Configuration

### 1. Initial Connection
```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@your-ec2-ip
```
- [ ] Successfully connected to server
- [ ] Server is responsive

### 2. System Updates
```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl wget git vim htop net-tools
```
- [ ] System updated
- [ ] Essential tools installed

### 3. Docker Installation
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo systemctl start docker
sudo systemctl enable docker
```
- [ ] Docker installed
- [ ] Docker service running
- [ ] User added to docker group
- [ ] Logged out and back in

### 4. Docker Compose Installation
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```
- [ ] Docker Compose installed
- [ ] Version verified

---

## Application Deployment

### 1. Clone Repository
```bash
cd ~
git clone https://github.com/LMS-SLNCity/LMS-SLNCity-V1.git
cd LMS-SLNCity-V1
```
- [ ] Repository cloned
- [ ] In correct directory

### 2. Environment Configuration
```bash
nano .env
```
- [ ] `.env` file created
- [ ] `NODE_ENV=production` set
- [ ] `DB_HOST=postgres` set
- [ ] Strong `DB_PASSWORD` generated and set
- [ ] Strong `JWT_SECRET` generated and set
- [ ] `VITE_API_URL` set correctly
- [ ] `FRONTEND_URL` set correctly
- [ ] All required variables present

### 3. Generate Secrets
```bash
# JWT Secret
openssl rand -base64 48

# Database Password
openssl rand -base64 24
```
- [ ] JWT secret generated and added to .env
- [ ] Database password generated and added to .env
- [ ] Secrets stored securely (password manager)

### 4. Build Docker Images
```bash
docker-compose -f docker-compose.prod.yml build --no-cache
```
- [ ] Build started successfully
- [ ] No build errors
- [ ] All 3 images built (postgres, backend, frontend)
- [ ] Images verified with `docker images`

### 5. Start Services
```bash
docker-compose -f docker-compose.prod.yml up -d
```
- [ ] All containers started
- [ ] No startup errors
- [ ] Containers verified with `docker ps`

### 6. Verify Deployment
```bash
# Check container status
docker ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Test backend health
curl http://localhost:5002/health

# Test frontend
curl http://localhost:80

# Test database
docker exec -it lms-postgres psql -U lms_user -d lms_slncity -c "SELECT COUNT(*) FROM users;"
```
- [ ] All 3 containers running
- [ ] Backend health check returns OK
- [ ] Frontend accessible
- [ ] Database accessible
- [ ] Default users exist

---

## Post-Deployment Configuration

### 1. Change Default Passwords
```bash
docker exec -it lms-postgres psql -U lms_user -d lms_slncity
```
```sql
UPDATE users SET password_hash = crypt('YourNewStrongPassword123!', gen_salt('bf')) WHERE username = 'sudo';
UPDATE users SET password_hash = crypt('YourNewStrongPassword123!', gen_salt('bf')) WHERE username = 'admin';
\q
```
- [ ] Sudo password changed
- [ ] Admin password changed
- [ ] New passwords stored securely
- [ ] Verified login with new passwords

### 2. Firewall Configuration
```bash
sudo apt install -y ufw
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```
- [ ] UFW installed
- [ ] SSH allowed
- [ ] HTTP allowed
- [ ] HTTPS allowed
- [ ] Firewall enabled
- [ ] Rules verified

### 3. Backup Setup
```bash
mkdir -p ~/backups
nano ~/backup-database.sh
# (paste backup script)
chmod +x ~/backup-database.sh
~/backup-database.sh
```
- [ ] Backup directory created
- [ ] Backup script created
- [ ] Script executable
- [ ] Test backup successful
- [ ] Backup file exists in ~/backups

### 4. Automated Backups
```bash
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup-database.sh >> ~/backup.log 2>&1") | crontab -
crontab -l
```
- [ ] Cron job added
- [ ] Cron job verified
- [ ] Backup time appropriate (2 AM)

---

## SSL Certificate (Optional but Recommended)

### 1. Domain Configuration
- [ ] Domain name purchased
- [ ] A record points to EC2 Elastic IP
- [ ] DNS propagated (check with `nslookup your-domain.com`)

### 2. Let's Encrypt Setup
```bash
sudo apt install -y certbot
docker-compose -f docker-compose.prod.yml stop frontend
sudo certbot certonly --standalone -d your-domain.com
mkdir -p ~/LMS-SLNCity-V1/nginx/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ~/LMS-SLNCity-V1/nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ~/LMS-SLNCity-V1/nginx/ssl/
sudo chown -R $USER:$USER ~/LMS-SLNCity-V1/nginx/ssl
```
- [ ] Certbot installed
- [ ] Certificate generated
- [ ] Certificates copied to nginx/ssl
- [ ] Permissions set correctly

### 3. Enable HTTPS in Nginx
```bash
nano ~/LMS-SLNCity-V1/nginx.prod.conf
# Uncomment HTTPS section and update domain name
docker-compose -f docker-compose.prod.yml up -d frontend
```
- [ ] nginx.prod.conf updated
- [ ] HTTPS section uncommented
- [ ] Domain name updated
- [ ] Frontend restarted
- [ ] HTTPS accessible

### 4. Auto-Renewal
```bash
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && docker-compose -f ~/LMS-SLNCity-V1/docker-compose.prod.yml restart frontend") | crontab -
```
- [ ] Auto-renewal cron job added
- [ ] Cron job verified

---

## Testing

### 1. Functional Testing
- [ ] Can access frontend at http://your-domain.com or http://your-ec2-ip
- [ ] Can login with sudo credentials
- [ ] Can create a new user
- [ ] Can create a test template
- [ ] Can register a patient
- [ ] Can create a visit
- [ ] Can add tests to visit
- [ ] Can collect sample
- [ ] Can enter test results
- [ ] Can approve test results
- [ ] Can print report
- [ ] Report displays correctly

### 2. B2B Testing
- [ ] Can create B2B client
- [ ] Can set custom prices
- [ ] Can create B2B login
- [ ] Can login as B2B client
- [ ] B2B client sees only their visits
- [ ] Ledger entries working
- [ ] Balance calculations correct

### 3. Security Testing
- [ ] Cannot access database from internet
- [ ] HTTPS working (if configured)
- [ ] Rate limiting working
- [ ] Audit logs recording actions
- [ ] Unauthorized access blocked
- [ ] SQL injection attempts blocked

### 4. Performance Testing
- [ ] Page load times acceptable (<3 seconds)
- [ ] API response times acceptable (<500ms)
- [ ] Database queries optimized
- [ ] No memory leaks
- [ ] CPU usage normal (<50% idle)

---

## Monitoring Setup

### 1. Basic Monitoring
```bash
# Check disk space
df -h

# Check memory
free -h

# Check CPU
htop

# Check Docker stats
docker stats

# Check logs
docker-compose -f docker-compose.prod.yml logs --tail=100 -f
```
- [ ] Disk space adequate (>50% free)
- [ ] Memory usage normal (<80%)
- [ ] CPU usage normal (<50% idle)
- [ ] No errors in logs

### 2. Log Rotation
```bash
sudo nano /etc/docker/daemon.json
```
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```
```bash
sudo systemctl restart docker
docker-compose -f docker-compose.prod.yml restart
```
- [ ] Log rotation configured
- [ ] Docker restarted
- [ ] Containers restarted

---

## Documentation

### 1. Deployment Documentation
- [ ] Server IP/domain documented
- [ ] SSH key location documented
- [ ] Database credentials stored securely
- [ ] JWT secret stored securely
- [ ] Backup location documented
- [ ] Cron jobs documented

### 2. Runbook Created
- [ ] How to restart services
- [ ] How to check logs
- [ ] How to restore backup
- [ ] How to update application
- [ ] Emergency contacts listed
- [ ] Troubleshooting guide created

---

## Final Verification

### 1. Smoke Test
- [ ] Application accessible from external network
- [ ] Can login successfully
- [ ] Can perform basic operations
- [ ] No errors in browser console
- [ ] No errors in server logs

### 2. Backup Verification
- [ ] Backup file exists
- [ ] Backup file size reasonable
- [ ] Can restore from backup (test on local)

### 3. Security Verification
- [ ] Default passwords changed
- [ ] Firewall enabled
- [ ] Only necessary ports open
- [ ] SSL configured (if applicable)
- [ ] Secrets not exposed in logs

### 4. Performance Verification
- [ ] Response times acceptable
- [ ] No memory leaks
- [ ] CPU usage normal
- [ ] Disk space adequate

---

## Go-Live

### 1. Communication
- [ ] Stakeholders notified of deployment
- [ ] Maintenance window communicated (if applicable)
- [ ] Support team briefed
- [ ] Documentation shared

### 2. Monitoring
- [ ] Monitor logs for first 24 hours
- [ ] Monitor performance metrics
- [ ] Monitor error rates
- [ ] Monitor user feedback

### 3. Post-Deployment
- [ ] Verify all functionality working
- [ ] Address any issues immediately
- [ ] Document any issues encountered
- [ ] Update runbook with lessons learned

---

## Rollback Plan (If Needed)

### 1. Rollback Steps
```bash
# Stop current deployment
docker-compose -f docker-compose.prod.yml down

# Restore database backup
gunzip -c ~/backups/lms_backup_YYYYMMDD_HHMMSS.sql.gz | docker exec -i lms-postgres psql -U lms_user -d lms_slncity

# Checkout previous version
git checkout <previous-commit-hash>

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

---

## Support Contacts

- **Technical Lead**: [Name] - [Email] - [Phone]
- **DevOps**: [Name] - [Email] - [Phone]
- **AWS Support**: [Account Number] - [Support Plan]
- **Domain Registrar**: [Provider] - [Account]

---

## Completion

- [ ] All checklist items completed
- [ ] Application running smoothly
- [ ] No critical issues
- [ ] Documentation updated
- [ ] Team notified of successful deployment

**Deployment Date**: _______________
**Deployed By**: _______________
**Sign-off**: _______________

---

## Notes

Use this section to document any issues, deviations from the plan, or important observations during deployment:

```
[Add your notes here]
```


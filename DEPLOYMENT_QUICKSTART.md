# 🚀 Quick Start Deployment Guide
## LMS SLNCity - Bare-Metal Production Deployment

**Time Required:** 2-3 hours  
**Cost:** ₹0 (Free)  
**Difficulty:** Intermediate

---

## 📋 Prerequisites

- [ ] Bare-metal server with Ubuntu 22.04 LTS installed
- [ ] Jio Router with admin access
- [ ] Domain name or DuckDNS account (free)
- [ ] Basic Linux command line knowledge

---

## ⚡ Quick Deployment (5 Steps)

### Step 1: Server Setup (30 minutes)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL 16
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-16

# Install Nginx and other tools
sudo apt install -y nginx git ufw fail2ban

# Install PM2
sudo npm install -g pm2
```

### Step 2: Security Configuration (15 minutes)

```bash
# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Secure PostgreSQL
sudo -u postgres psql << EOF
ALTER USER postgres WITH PASSWORD 'YOUR_STRONG_PASSWORD';
CREATE USER lms_user WITH ENCRYPTED PASSWORD 'YOUR_STRONG_PASSWORD';
CREATE DATABASE lms_slncity OWNER lms_user;
GRANT ALL PRIVILEGES ON DATABASE lms_slncity TO lms_user;
\q
EOF

# Configure PostgreSQL for localhost only
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" /etc/postgresql/16/main/postgresql.conf
sudo systemctl restart postgresql
```

### Step 3: Application Deployment (20 minutes)

```bash
# Clone repository
sudo mkdir -p /var/www/lms-slncity
sudo chown $USER:$USER /var/www/lms-slncity
cd /var/www/lms-slncity
git clone https://github.com/LMS-SLNCity/LMS-SLNCity-V1.git .

# Generate JWT secret
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# Create backend .env
cat > server/.env << EOF
NODE_ENV=production
PORT=5001
DB_HOST=localhost
DB_PORT=5432
DB_USER=lms_user
DB_PASSWORD=YOUR_STRONG_PASSWORD
DB_NAME=lms_slncity
JWT_SECRET=$JWT_SECRET
FRONTEND_URL=https://yourdomain.com
EOF

# Create frontend .env
cat > .env << EOF
VITE_API_URL=https://yourdomain.com/api
EOF

# Install dependencies and build
cd server
npm install
npm run build

cd ..
npm install
npm run build

# Initialize database
cd server
psql -h localhost -U lms_user -d lms_slncity -f db/init.sql
npm run seed
```

### Step 4: Dynamic DNS Setup (10 minutes)

```bash
# 1. Go to https://www.duckdns.org
# 2. Sign in and create subdomain: lms-slncity.duckdns.org
# 3. Note your token

# Setup DuckDNS updater
mkdir -p ~/duckdns
cat > ~/duckdns/duck.sh << 'EOF'
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=lms-slncity&token=YOUR_TOKEN&ip=" | curl -k -o ~/duckdns/duck.log -K -
EOF

chmod 700 ~/duckdns/duck.sh

# Test it
~/duckdns/duck.sh
cat ~/duckdns/duck.log  # Should show "OK"

# Add to crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1") | crontab -

# Configure router port forwarding
# Go to 192.168.29.1 → Port Forwarding
# Forward ports 80 and 443 to your server's local IP
```

### Step 5: SSL & Nginx Setup (30 minutes)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Stop nginx temporarily
sudo systemctl stop nginx

# Get SSL certificate
sudo certbot certonly --standalone -d lms-slncity.duckdns.org

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/lms-slncity > /dev/null << 'EOF'
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name lms-slncity.duckdns.org;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name lms-slncity.duckdns.org;

    ssl_certificate /etc/letsencrypt/live/lms-slncity.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lms-slncity.duckdns.org/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location /api {
        proxy_pass http://localhost:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        root /var/www/lms-slncity/dist;
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/lms-slncity /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and start Nginx
sudo nginx -t
sudo systemctl start nginx

# Start application with PM2
cd /var/www/lms-slncity
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd
# Run the command it outputs
```

---

## ✅ Verification

```bash
# Check application status
pm2 status

# Check logs
pm2 logs lms-backend --lines 50

# Test health endpoint
curl https://lms-slncity.duckdns.org/health

# Test API
curl https://lms-slncity.duckdns.org/api/health
```

---

## 🔒 Security Checklist

Run the security audit script:

```bash
cd /var/www/lms-slncity
./security-check.sh
```

**Must Fix Before Production:**
- [ ] JWT_SECRET is set to a strong random value (64+ characters)
- [ ] Database passwords are strong (12+ characters)
- [ ] Firewall is enabled and configured
- [ ] PostgreSQL is listening on localhost only
- [ ] SSL certificate is installed and valid
- [ ] Nginx security headers are configured
- [ ] PM2 is running the application
- [ ] DuckDNS is updating correctly

---

## 📊 Monitoring

```bash
# View application logs
pm2 logs lms-backend

# Monitor resources
pm2 monit

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check database
sudo -u postgres psql -d lms_slncity -c "SELECT COUNT(*) FROM visits;"
```

---

## 🔄 Updates & Maintenance

```bash
# Pull latest code and redeploy
cd /var/www/lms-slncity
./deploy.sh

# Backup database
pg_dump -h localhost -U lms_user lms_slncity > backup_$(date +%Y%m%d).sql

# Renew SSL certificate (automatic, but can force)
sudo certbot renew --force-renewal
```

---

## 🆘 Troubleshooting

### Application won't start
```bash
pm2 logs lms-backend
# Check for errors in logs
```

### Database connection failed
```bash
sudo systemctl status postgresql
psql -h localhost -U lms_user -d lms_slncity
```

### SSL certificate issues
```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

### Can't access from internet
```bash
# Check if DuckDNS is updating
cat ~/duckdns/duck.log

# Check router port forwarding
# Verify ports 80 and 443 are forwarded to your server

# Check firewall
sudo ufw status
```

---

## 📞 Support

For detailed documentation, see:
- **Full Deployment Guide:** `SECURITY_AND_DEPLOYMENT.md`
- **System Architecture:** `SYSTEM_ARCHITECTURE.md`
- **Database Setup:** `POSTGRES_MIGRATION_PLAN.md`

---

## 🎉 Success!

Your LMS SLNCity application should now be:
- ✅ Running on HTTPS with valid SSL certificate
- ✅ Accessible from internet via DuckDNS domain
- ✅ Secured with firewall and security headers
- ✅ Monitored with PM2 process manager
- ✅ Production-ready and NABL-compliant

**Access your application at:** `https://lms-slncity.duckdns.org`

**Default Login:**
- Username: `sudo`
- Password: `Sudo123` (Change immediately!)

---

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Domain:** _____________


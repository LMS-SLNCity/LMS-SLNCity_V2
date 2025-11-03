# Security Audit & Bare-Metal Deployment Plan
## LMS SLNCity Diagnostic Center - Production Deployment Guide

**Target Environment:** Bare-metal server with Jio Router (Dynamic IP)  
**Budget:** Near-zero cost  
**Security Level:** Production-grade with NABL compliance

---

## 📋 Table of Contents
1. [Security Audit](#security-audit)
2. [Security Hardening](#security-hardening)
3. [Deployment Architecture](#deployment-architecture)
4. [Step-by-Step Deployment](#step-by-step-deployment)
5. [Dynamic IP Solution](#dynamic-ip-solution)
6. [Monitoring & Maintenance](#monitoring--maintenance)

---

## 🔒 Security Audit

### ✅ Current Security Strengths

#### 1. **Authentication & Authorization**
- ✅ **Password Hashing:** bcrypt with salt rounds (10)
- ✅ **JWT Tokens:** 24-hour expiry with secret key
- ✅ **Role-Based Access Control (RBAC):** 7 roles with granular permissions
- ✅ **Session Management:** Token verification on every request
- ✅ **Audit Logging:** Comprehensive login tracking with IP and user agent

#### 2. **Database Security**
- ✅ **Parameterized Queries:** All SQL queries use `$1, $2` placeholders
- ✅ **SQL Injection Prevention:** No string concatenation in queries
- ✅ **Separate DB User:** `lms_user` with limited privileges
- ✅ **Password Protection:** Database credentials in environment variables

#### 3. **API Security**
- ✅ **CORS Enabled:** Cross-origin resource sharing configured
- ✅ **Request Size Limits:** 50MB limit for JSON/URL-encoded data
- ✅ **Error Handling:** Centralized error middleware
- ✅ **Health Check Endpoint:** `/health` for monitoring

#### 4. **Audit & Compliance**
- ✅ **NABL-Compliant Logging:** 90-day retention for login logs
- ✅ **Comprehensive Audit Trail:** All CRUD operations logged
- ✅ **Automated Cleanup:** Scheduled cleanup of expired logs
- ✅ **IP Address Tracking:** All requests logged with IP

---

### ⚠️ Security Vulnerabilities (CRITICAL - Must Fix)

#### 1. **JWT Secret Key Hardcoded** 🔴 CRITICAL
**Location:** `server/src/routes/auth.ts:8`, `server/src/middleware/auth.ts:4`
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
```
**Risk:** Default secret key is publicly visible in code  
**Impact:** Attackers can forge JWT tokens and impersonate any user  
**Fix:** Generate strong secret and store in `.env` file

#### 2. **CORS Wide Open** 🔴 CRITICAL
**Location:** `server/src/index.ts:37`
```typescript
app.use(cors());
```
**Risk:** Allows requests from ANY origin  
**Impact:** CSRF attacks, unauthorized API access  
**Fix:** Restrict to specific origins

#### 3. **No Rate Limiting** 🟠 HIGH
**Risk:** Brute force attacks on login endpoint  
**Impact:** Account takeover, DDoS attacks  
**Fix:** Implement rate limiting middleware

#### 4. **No HTTPS/TLS** 🟠 HIGH
**Risk:** Man-in-the-middle attacks, data interception  
**Impact:** Passwords and sensitive data transmitted in plain text  
**Fix:** Implement SSL/TLS certificates

#### 5. **Sensitive Data in Logs** 🟡 MEDIUM
**Location:** `server/src/routes/auth.ts:71`
```typescript
console.log('Login attempt:', req.body);
```
**Risk:** Passwords logged to console (already partially fixed)  
**Impact:** Credentials exposed in log files  
**Fix:** Remove all sensitive data from logs

#### 6. **No Helmet.js Security Headers** 🟡 MEDIUM
**Risk:** Missing security headers (CSP, X-Frame-Options, etc.)  
**Impact:** XSS, clickjacking vulnerabilities  
**Fix:** Add helmet.js middleware

#### 7. **Database Credentials in Code** 🟡 MEDIUM
**Location:** `server/src/db/connection.ts:7-11`
```typescript
user: process.env.DB_USER || 'postgres',
password: process.env.DB_PASSWORD || 'postgres',
```
**Risk:** Default credentials in code  
**Impact:** Database compromise if `.env` not configured  
**Fix:** Fail fast if environment variables not set

#### 8. **No Input Validation** 🟡 MEDIUM
**Risk:** Malformed data can crash server  
**Impact:** DoS, data corruption  
**Fix:** Add validation middleware (express-validator)

#### 9. **Frontend API URL Hardcoded** 🟡 MEDIUM
**Location:** Multiple frontend files
```typescript
fetch('http://localhost:5001/api/...')
```
**Risk:** Won't work in production  
**Impact:** Application breaks in production  
**Fix:** Use environment variables

#### 10. **No File Upload Validation** 🟡 MEDIUM
**Risk:** Malicious file uploads (signatures)  
**Impact:** Server compromise, XSS  
**Fix:** Validate file types and sizes

---

## 🛡️ Security Hardening (Implementation Required)

### Priority 1: Critical Fixes (Deploy Blockers)

#### 1.1 Generate Strong JWT Secret
```bash
# Generate a 64-character random secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### 1.2 Configure CORS Properly
```typescript
// server/src/index.ts
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

#### 1.3 Add Rate Limiting
```bash
cd server
npm install express-rate-limit
```

```typescript
// server/src/index.ts
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again after 15 minutes'
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/client-login', loginLimiter);
```

#### 1.4 Add Helmet.js Security Headers
```bash
cd server
npm install helmet
```

```typescript
// server/src/index.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

#### 1.5 Remove Sensitive Logging
```typescript
// server/src/routes/auth.ts - REMOVE THIS LINE
// console.log('Login attempt:', req.body);

// Replace with:
console.log('Login attempt for user:', username);
```

### Priority 2: High Priority Fixes

#### 2.1 Add Input Validation
```bash
cd server
npm install express-validator
```

#### 2.2 Environment Variable Validation
```typescript
// server/src/config/env.ts
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key-change-in-production') {
  throw new Error('JWT_SECRET must be set in environment variables');
}

if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === 'postgres') {
  throw new Error('DB_PASSWORD must be set in environment variables');
}
```

#### 2.3 HTTPS/TLS Setup
- Use Let's Encrypt for free SSL certificates
- Configure Nginx as reverse proxy with SSL termination

---

## 🏗️ Deployment Architecture

### System Architecture (Bare-Metal)

```
Internet (Dynamic IP)
    ↓
Jio Router (DDNS)
    ↓
Bare-Metal Server (Ubuntu 22.04 LTS)
    ├── Nginx (Reverse Proxy + SSL)
    │   ├── Port 443 (HTTPS) → Frontend (Port 3000)
    │   └── Port 443 (HTTPS) → Backend API (Port 5001)
    ├── Node.js (Backend)
    │   └── Express Server (Port 5001)
    ├── PostgreSQL (Database)
    │   └── Port 5432 (localhost only)
    └── PM2 (Process Manager)
```

### Port Configuration
- **80 (HTTP):** Redirect to HTTPS
- **443 (HTTPS):** Nginx reverse proxy
- **3000:** Frontend (internal only)
- **5001:** Backend API (internal only)
- **5432:** PostgreSQL (localhost only)

---

## 🚀 Step-by-Step Deployment

### Phase 1: Server Preparation

#### 1.1 Install Ubuntu 22.04 LTS
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git build-essential ufw fail2ban
```

#### 1.2 Configure Firewall
```bash
# Enable UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change 22 to your custom port if changed)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

#### 1.3 Install Node.js 20 LTS
```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

#### 1.4 Install PostgreSQL 16
```bash
# Add PostgreSQL repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update

# Install PostgreSQL 16
sudo apt install -y postgresql-16 postgresql-contrib-16

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### 1.5 Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 1.6 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
pm2 startup systemd
# Run the command it outputs
```

### Phase 2: Database Setup

#### 2.1 Secure PostgreSQL
```bash
# Switch to postgres user
sudo -u postgres psql

-- Change postgres password
ALTER USER postgres WITH PASSWORD 'STRONG_PASSWORD_HERE';

-- Create application user
CREATE USER lms_user WITH ENCRYPTED PASSWORD 'STRONG_PASSWORD_HERE';
CREATE DATABASE lms_slncity OWNER lms_user;
GRANT ALL PRIVILEGES ON DATABASE lms_slncity TO lms_user;

-- Exit
\q
```

#### 2.2 Configure PostgreSQL for Local Access Only
```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/16/main/postgresql.conf

# Set listen_addresses to localhost only
listen_addresses = 'localhost'

# Edit pg_hba.conf
sudo nano /etc/postgresql/16/main/pg_hba.conf

# Allow only local connections
local   all             all                                     scram-sha-256
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Phase 3: Application Deployment

#### 3.1 Clone Repository
```bash
# Create application directory
sudo mkdir -p /var/www/lms-slncity
sudo chown $USER:$USER /var/www/lms-slncity

# Clone repository
cd /var/www/lms-slncity
git clone https://github.com/LMS-SLNCity/LMS-SLNCity-V1.git .
```

#### 3.2 Configure Environment Variables
```bash
# Create backend .env file
cd /var/www/lms-slncity/server
nano .env
```

```env
# Backend .env
NODE_ENV=production
PORT=5001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=lms_user
DB_PASSWORD=YOUR_STRONG_DB_PASSWORD_HERE
DB_NAME=lms_slncity

# JWT Secret (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=YOUR_64_CHAR_RANDOM_SECRET_HERE

# Frontend URL (will be your domain)
FRONTEND_URL=https://yourdomain.com
```

```bash
# Create frontend .env file
cd /var/www/lms-slncity
nano .env
```

```env
# Frontend .env
VITE_API_URL=https://yourdomain.com/api
```

#### 3.3 Install Dependencies and Build
```bash
# Backend
cd /var/www/lms-slncity/server
npm install --production
npm run build

# Frontend
cd /var/www/lms-slncity
npm install
npm run build
```

#### 3.4 Initialize Database
```bash
cd /var/www/lms-slncity/server
psql -h localhost -U lms_user -d lms_slncity -f db/init.sql
npm run seed
```

### Phase 4: Dynamic IP Solution (FREE)

Since Jio doesn't provide static IP, we'll use **DuckDNS** (free DDNS service):

#### 4.1 Setup DuckDNS
```bash
# 1. Go to https://www.duckdns.org
# 2. Sign in with Google/GitHub
# 3. Create a subdomain: lms-slncity.duckdns.org
# 4. Note your token

# Install DuckDNS updater
mkdir -p ~/duckdns
cd ~/duckdns
nano duck.sh
```

```bash
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=lms-slncity&token=YOUR_TOKEN_HERE&ip=" | curl -k -o ~/duckdns/duck.log -K -
```

```bash
chmod 700 duck.sh

# Test it
./duck.sh
cat duck.log  # Should show "OK"

# Add to crontab (update every 5 minutes)
crontab -e
# Add this line:
*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1
```

#### 4.2 Configure Router Port Forwarding
```
Jio Router Admin Panel (usually 192.168.29.1)
→ Port Forwarding / Virtual Server
→ Add rules:
   - External Port 80 → Internal IP (your server) Port 80
   - External Port 443 → Internal IP (your server) Port 443
```

### Phase 5: SSL/TLS Setup (FREE with Let's Encrypt)

#### 5.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

#### 5.2 Obtain SSL Certificate
```bash
# Stop nginx temporarily
sudo systemctl stop nginx

# Get certificate (use your DuckDNS domain)
sudo certbot certonly --standalone -d lms-slncity.duckdns.org

# Start nginx
sudo systemctl start nginx

# Auto-renewal (certbot adds this automatically)
sudo certbot renew --dry-run
```

### Phase 6: Nginx Configuration

#### 6.1 Create Nginx Config
```bash
sudo nano /etc/nginx/sites-available/lms-slncity
```

```nginx
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

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/lms-slncity.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lms-slncity.duckdns.org/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API Proxy
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Frontend
    location / {
        root /var/www/lms-slncity/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Health check
    location /health {
        proxy_pass http://localhost:5001/health;
        access_log off;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/lms-slncity /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Phase 7: Start Application with PM2

#### 7.1 Create PM2 Ecosystem File
```bash
cd /var/www/lms-slncity
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'lms-backend',
    script: './server/dist/index.js',
    cwd: '/var/www/lms-slncity',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    error_file: '/var/log/lms-slncity/backend-error.log',
    out_file: '/var/log/lms-slncity/backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

#### 7.2 Start Application
```bash
# Create log directory
sudo mkdir -p /var/log/lms-slncity
sudo chown $USER:$USER /var/log/lms-slncity

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 logs lms-backend
```

---

## 📊 Monitoring & Maintenance

### Daily Monitoring
```bash
# Check application status
pm2 status

# Check logs
pm2 logs lms-backend --lines 100

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check database
sudo -u postgres psql -d lms_slncity -c "SELECT COUNT(*) FROM visits;"
```

### Weekly Maintenance
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Backup database
pg_dump -h localhost -U lms_user lms_slncity > backup_$(date +%Y%m%d).sql

# Check disk space
df -h

# Check memory
free -h
```

### Security Monitoring
```bash
# Check failed login attempts
sudo tail -f /var/log/auth.log | grep "Failed password"

# Check firewall status
sudo ufw status

# Check fail2ban status
sudo fail2ban-client status
```

---

## 💰 Cost Breakdown (Near-Zero)

| Service | Cost | Notes |
|---------|------|-------|
| DuckDNS | FREE | Dynamic DNS |
| Let's Encrypt SSL | FREE | SSL certificates |
| Ubuntu Server | FREE | Open source OS |
| PostgreSQL | FREE | Open source database |
| Node.js/Express | FREE | Open source runtime |
| Nginx | FREE | Open source web server |
| PM2 | FREE | Open source process manager |
| **Total Monthly Cost** | **₹0** | Only electricity + internet |

---

## ✅ Pre-Deployment Checklist

- [ ] Generate strong JWT secret (64 characters)
- [ ] Generate strong database passwords
- [ ] Configure CORS with specific origin
- [ ] Add rate limiting to login endpoints
- [ ] Add Helmet.js security headers
- [ ] Remove sensitive data from logs
- [ ] Validate all environment variables
- [ ] Setup DuckDNS account and subdomain
- [ ] Configure router port forwarding
- [ ] Obtain Let's Encrypt SSL certificate
- [ ] Configure Nginx reverse proxy
- [ ] Setup PM2 process manager
- [ ] Configure PostgreSQL for local-only access
- [ ] Setup automated database backups
- [ ] Configure fail2ban for SSH protection
- [ ] Test all security headers
- [ ] Test HTTPS redirect
- [ ] Test API endpoints
- [ ] Test frontend application
- [ ] Setup monitoring and alerts

---

## 🆘 Troubleshooting

### Application won't start
```bash
# Check PM2 logs
pm2 logs lms-backend

# Check if port is in use
sudo lsof -i :5001

# Check environment variables
pm2 env 0
```

### Database connection failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U lms_user -d lms_slncity

# Check pg_hba.conf
sudo nano /etc/postgresql/16/main/pg_hba.conf
```

### SSL certificate issues
```bash
# Renew certificate
sudo certbot renew --force-renewal

# Check certificate expiry
sudo certbot certificates
```

### DuckDNS not updating
```bash
# Check duck.log
cat ~/duckdns/duck.log

# Manually update
~/duckdns/duck.sh

# Check crontab
crontab -l
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-03  
**Maintained By:** LMS SLNCity Development Team


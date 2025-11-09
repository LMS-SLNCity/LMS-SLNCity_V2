# AWS Deployment Steps for LMS SLNCity

**AWS Instance IP:** `http://13.233.122.144`

---

## 🚀 Quick Deployment Steps

### **On Your AWS EC2 Instance:**

```bash
# 1. SSH into your AWS instance
ssh -i your-key.pem ubuntu@13.233.122.144

# 2. Pull latest code from GitHub
cd /path/to/LMS-SLNCity-V1
git pull origin main

# 3. Install/Update dependencies
# Backend
cd server
npm install --production

# Frontend
cd ..
npm install

# 4. Build both applications
# Backend
cd server
npm run build

# Frontend
cd ..
npm run build

# 5. Restart services
# If using PM2:
pm2 restart lms-backend
pm2 restart lms-frontend

# If using systemd:
sudo systemctl restart lms-backend
sudo systemctl restart lms-frontend

# If running manually:
# Kill existing processes and restart
pkill -f "node.*server/dist/index.js"
pkill -f "vite"

# Start backend (in background)
cd server
NODE_ENV=production PORT=5001 node dist/index.js > /tmp/backend.log 2>&1 &

# Start frontend (in background)
cd ..
npm run preview -- --port 80 --host 0.0.0.0 > /tmp/frontend.log 2>&1 &
```

---

## 📋 Environment Configuration

### **Backend `.env` (server/.env)**

```env
PORT=5001
DB_HOST=localhost
DB_PORT=5432
DB_USER=lms_user
DB_PASSWORD=lms_password
DB_NAME=lms_slncity
NODE_ENV=production

# JWT Secret (KEEP THIS SECRET!)
JWT_SECRET=e338cec6670e03b9cab465f4331062c9233e5a61e93f04e77b844d0ff597702a4693ffbfb147008ae78f7a2d35c15c63e7f7bfc02624f2609928e687dec16d95

# Frontend URL for CORS
FRONTEND_URL=http://13.233.122.144
```

### **Frontend `.env` (root directory)**

```env
# API URL (Backend URL)
VITE_API_URL=http://13.233.122.144:5001

# Optional: Gemini API Key (for AI features)
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 🔧 AWS Security Group Configuration

Make sure your AWS Security Group allows these ports:

| Port | Protocol | Source | Description |
|------|----------|--------|-------------|
| 22 | TCP | Your IP | SSH access |
| 80 | TCP | 0.0.0.0/0 | Frontend (HTTP) |
| 443 | TCP | 0.0.0.0/0 | Frontend (HTTPS) - if using SSL |
| 5001 | TCP | 0.0.0.0/0 | Backend API |
| 5432 | TCP | localhost | PostgreSQL (internal only) |

---

## 🗄️ Database Setup

```bash
# 1. Install PostgreSQL (if not already installed)
sudo apt update
sudo apt install postgresql postgresql-contrib -y

# 2. Create database and user
sudo -u postgres psql << EOF
CREATE USER lms_user WITH PASSWORD 'lms_password';
CREATE DATABASE lms_slncity OWNER lms_user;
GRANT ALL PRIVILEGES ON DATABASE lms_slncity TO lms_user;
\q
EOF

# 3. Initialize database schema
cd /path/to/LMS-SLNCity-V1/server
psql -h localhost -U lms_user -d lms_slncity -f db/init.sql

# 4. Seed development data (optional)
psql -h localhost -U lms_user -d lms_slncity -f db/seed-development.sql
```

---

## 🔄 Process Management with PM2 (Recommended)

```bash
# 1. Install PM2 globally
sudo npm install -g pm2

# 2. Start backend
cd /path/to/LMS-SLNCity-V1/server
pm2 start dist/index.js --name lms-backend --env production

# 3. Start frontend (using serve)
npm install -g serve
cd /path/to/LMS-SLNCity-V1
pm2 start "serve -s dist -l 80" --name lms-frontend

# 4. Save PM2 configuration
pm2 save

# 5. Setup PM2 to start on boot
pm2 startup
# Follow the instructions printed by the command above

# 6. Monitor processes
pm2 status
pm2 logs lms-backend
pm2 logs lms-frontend
```

---

## 🌐 Nginx Reverse Proxy (Optional but Recommended)

```bash
# 1. Install Nginx
sudo apt install nginx -y

# 2. Create Nginx configuration
sudo nano /etc/nginx/sites-available/lms-slncity

# Paste this configuration:
```

```nginx
server {
    listen 80;
    server_name 13.233.122.144;

    # Frontend
    location / {
        root /path/to/LMS-SLNCity-V1/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Signature images
    location /signatures {
        alias /path/to/LMS-SLNCity-V1/server/public/signatures;
    }
}
```

```bash
# 3. Enable the site
sudo ln -s /etc/nginx/sites-available/lms-slncity /etc/nginx/sites-enabled/

# 4. Test configuration
sudo nginx -t

# 5. Restart Nginx
sudo systemctl restart nginx
```

---

## 🔍 Troubleshooting

### **Check if services are running:**

```bash
# Check backend
curl http://localhost:5001/health

# Check frontend
curl http://localhost:80

# Check from outside
curl http://13.233.122.144:5001/health
curl http://13.233.122.144
```

### **View logs:**

```bash
# PM2 logs
pm2 logs lms-backend --lines 100
pm2 logs lms-frontend --lines 100

# Manual logs
tail -f /tmp/backend.log
tail -f /tmp/frontend.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### **Common Issues:**

1. **"Connection Refused"**
   - Check if backend is running: `pm2 status`
   - Check if port 5001 is open: `sudo netstat -tlnp | grep 5001`
   - Check AWS Security Group allows port 5001

2. **"CORS Error"**
   - Verify `FRONTEND_URL` in `server/.env` matches your AWS IP
   - Restart backend after changing `.env`

3. **"Database Connection Error"**
   - Check PostgreSQL is running: `sudo systemctl status postgresql`
   - Verify database credentials in `server/.env`
   - Check database exists: `psql -U lms_user -d lms_slncity -c "\l"`

4. **"404 Not Found" on refresh**
   - Use Nginx configuration above
   - Or configure Vite preview to handle SPA routing

---

## 📦 Complete Deployment Script

Save this as `deploy.sh` on your AWS instance:

```bash
#!/bin/bash

echo "🚀 Deploying LMS SLNCity..."

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
cd server && npm install --production
cd .. && npm install

# Build applications
echo "🔨 Building applications..."
cd server && npm run build
cd .. && npm run build

# Restart services
echo "🔄 Restarting services..."
pm2 restart lms-backend
pm2 restart lms-frontend

echo "✅ Deployment complete!"
echo "🌐 Frontend: http://13.233.122.144"
echo "🔧 Backend: http://13.233.122.144:5001"
```

Make it executable:
```bash
chmod +x deploy.sh
```

Run it:
```bash
./deploy.sh
```

---

## 🎯 Next Steps

1. **Setup SSL Certificate** (Let's Encrypt)
2. **Configure Domain Name** (instead of IP)
3. **Setup Automated Backups**
4. **Configure Monitoring** (PM2 Plus, CloudWatch)
5. **Setup CI/CD Pipeline** (GitHub Actions)

---

## 📞 Support

If you encounter issues, check:
- Backend logs: `pm2 logs lms-backend`
- Frontend logs: `pm2 logs lms-frontend`
- Database logs: `sudo tail -f /var/log/postgresql/postgresql-*.log`


# Quick Deployment Guide - LMS SLNCity

## Server Info
- **IP**: 13.201.165.54
- **Instance**: t3.micro
- **Docker**: ✓ Installed

---

## Quick Deploy Commands

### 1. Connect to Server
```bash
ssh -i your-key.pem ubuntu@13.201.165.54
```

### 2. Clone & Setup
```bash
# Clone repository
git clone https://github.com/LMS-SLNCity/LMS-SLNCity-V1.git
cd LMS-SLNCity-V1

# Create .env file
cat > .env << 'EOF'
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
JWT_SECRET=REPLACE_WITH_SECURE_SECRET
VITE_API_URL=http://13.201.165.54:5002
FRONTEND_URL=http://13.201.165.54:3000
EOF

# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy the output and update JWT_SECRET in .env file
nano .env
```

### 3. Deploy
```bash
# Build and start
docker compose up -d --build

# Monitor logs
docker compose logs -f
```

### 4. Verify
```bash
# Check containers
docker ps

# Test backend
curl http://localhost:5002/health

# Test frontend
curl http://localhost:3000
```

### 5. Access Application
Open browser: **http://13.201.165.54:3000**

**Default Login**:
- Username: `admin`
- Password: `admin123`

---

## Essential Commands

```bash
# View logs
docker compose logs -f

# Restart services
docker compose restart

# Stop services
docker compose down

# Update & redeploy
git pull origin main
docker compose up -d --build

# Check disk space
df -h

# Clean up Docker
docker system prune -a
```

---

## Security Group Ports
Open these ports in AWS Security Group:
- **22** - SSH
- **80** - HTTP
- **3000** - Frontend
- **5002** - Backend API
- **5433** - PostgreSQL (optional)

---

## Troubleshooting

**Containers not starting?**
```bash
docker compose logs backend
docker compose logs frontend
```

**Out of memory?**
```bash
docker stats
free -h
```

**Need fresh start?**
```bash
docker compose down
docker volume rm lms-slncity-v1_postgres_data
docker compose up -d --build
```


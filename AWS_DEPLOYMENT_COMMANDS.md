# AWS Deployment Commands - Complete Guide

## Prerequisites

- AWS Account with EC2 access
- SSH key pair created in AWS
- Domain name (optional, but recommended)
- Git repository access

---

## Part 1: AWS EC2 Setup

### Step 1: Launch EC2 Instance

```bash
# Use AWS Console or CLI to launch instance with these specs:
# - Instance Type: t3.medium (2 vCPU, 4 GB RAM) - minimum
# - Instance Type: t3.large (2 vCPU, 8 GB RAM) - recommended
# - OS: Ubuntu 22.04 LTS
# - Storage: 30 GB gp3 SSD (minimum)
# - Security Group: Create new with following rules
```

### Step 2: Configure Security Group

```bash
# Inbound Rules:
# SSH (22) - Your IP only
# HTTP (80) - 0.0.0.0/0
# HTTPS (443) - 0.0.0.0/0
# Custom TCP (3000) - 0.0.0.0/0 (Frontend - temporary, will use nginx later)
# Custom TCP (5002) - 0.0.0.0/0 (Backend API - temporary, will use nginx later)

# Note: PostgreSQL port 5432 should NOT be exposed to internet
# It will only be accessible within Docker network
```

### Step 3: Connect to EC2 Instance

```bash
# Download your .pem key file and set permissions
chmod 400 your-key.pem

# Connect to instance
ssh -i your-key.pem ubuntu@your-ec2-public-ip

# Example:
# ssh -i lms-key.pem ubuntu@54.123.45.67
```

---

## Part 2: Server Setup

### Step 1: Update System

```bash
# Update package list
sudo apt update

# Upgrade packages
sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git vim htop net-tools
```

### Step 2: Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group
sudo usermod -aG docker $USER

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Verify Docker installation
docker --version

# Log out and log back in for group changes to take effect
exit
# Then reconnect via SSH
```

### Step 3: Install Docker Compose

```bash
# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

---

## Part 3: Application Setup

### Step 1: Clone Repository

```bash
# Navigate to home directory
cd ~

# Clone repository
git clone https://github.com/LMS-SLNCity/LMS-SLNCity-V1.git

# Navigate to project directory
cd LMS-SLNCity-V1

# Verify files
ls -la
```

### Step 2: Create Production Environment File

```bash
# Create .env file for production
cat > .env << 'EOF'
# Environment
NODE_ENV=production
ENV=production

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USER=lms_user
DB_PASSWORD=CHANGE_THIS_STRONG_PASSWORD_123!@#
DB_NAME=lms_slncity

# Backend Configuration
PORT=5002
JWT_SECRET=CHANGE_THIS_TO_RANDOM_64_CHAR_STRING_abc123xyz789!@#$%^&*()

# Frontend Configuration
VITE_API_URL=http://your-domain.com/api
# Or use IP: VITE_API_URL=http://54.123.45.67/api

# CORS
FRONTEND_URL=http://your-domain.com
# Or use IP: FRONTEND_URL=http://54.123.45.67
EOF

# Edit the file to set your actual values
nano .env
```

### Step 3: Generate Strong Secrets

```bash
# Generate JWT secret (64 characters)
openssl rand -base64 48

# Generate database password (32 characters)
openssl rand -base64 24

# Copy these values and update your .env file
nano .env
```

### Step 4: Create Production Docker Compose File

```bash
# Create docker-compose.prod.yml
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: lms-postgres
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
      ENV: production
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./server/db/init.sql:/docker-entrypoint-initdb.d/01-init.sql
      - ./server/db/seed-production.sql:/docker-entrypoint-initdb.d/seed-production.sql
      - ./server/db/migrations:/docker-entrypoint-initdb.d/migrations
      - ./server/db/run-migrations.sh:/docker-entrypoint-initdb.d/03-run-migrations.sh
      - ./server/db/setup-production.sh:/docker-entrypoint-initdb.d/04-setup-production.sh
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - lms-network

  backend:
    build:
      context: ./server
      dockerfile: Dockerfile.prod
    container_name: lms-backend
    restart: always
    environment:
      NODE_ENV: production
      PORT: ${PORT}
      DB_HOST: ${DB_HOST}
      DB_PORT: ${DB_PORT}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      JWT_SECRET: ${JWT_SECRET}
      FRONTEND_URL: ${FRONTEND_URL}
    ports:
      - "5002:5002"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:5002/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - lms-network

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend.prod
      args:
        VITE_API_URL: ${VITE_API_URL}
    container_name: lms-frontend
    restart: always
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl:ro
    networks:
      - lms-network

volumes:
  postgres_data:

networks:
  lms-network:
    driver: bridge
EOF
```

### Step 5: Create Production Dockerfiles

```bash
# Create production backend Dockerfile
cat > server/Dockerfile.prod << 'EOF'
FROM node:18-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript
RUN npm install -g typescript
RUN tsc

# Remove dev dependencies and source files
RUN rm -rf src tsconfig.json node_modules
RUN npm ci --only=production

# Expose port
EXPOSE 5002

# Start the production server
CMD ["node", "dist/index.js"]
EOF

# Create production frontend Dockerfile
cat > Dockerfile.frontend.prod << 'EOF'
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build argument for API URL
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf

# Expose ports
EXPOSE 80 443

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
EOF

# Create production nginx configuration
cat > nginx.prod.conf << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name _;

    # Redirect HTTP to HTTPS (uncomment after SSL setup)
    # return 301 https://$server_name$request_uri;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API proxy
    location /api {
        proxy_pass http://backend:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# HTTPS configuration (uncomment after SSL setup)
# server {
#     listen 443 ssl http2;
#     listen [::]:443 ssl http2;
#     server_name your-domain.com;
#
#     ssl_certificate /etc/nginx/ssl/fullchain.pem;
#     ssl_certificate_key /etc/nginx/ssl/privkey.pem;
#
#     # SSL configuration
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers HIGH:!aNULL:!MD5;
#     ssl_prefer_server_ciphers on;
#
#     # ... rest of configuration same as above
# }
EOF
```

---

## Part 4: Build and Deploy

### Step 1: Build Docker Images

```bash
# Make sure you're in the project directory
cd ~/LMS-SLNCity-V1

# Build all images (this will take 5-10 minutes)
docker-compose -f docker-compose.prod.yml build --no-cache

# Verify images are built
docker images | grep lms
```

### Step 2: Start Services

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check if containers are running
docker ps

# You should see 3 containers:
# - lms-postgres
# - lms-backend
# - lms-frontend
```

### Step 3: Verify Deployment

```bash
# Check container logs
docker-compose -f docker-compose.prod.yml logs -f

# Check backend health
curl http://localhost:5002/health

# Check frontend
curl http://localhost:80

# Check database
docker exec -it lms-postgres psql -U lms_user -d lms_slncity -c "SELECT COUNT(*) FROM users;"
```

---

## Part 5: Post-Deployment Configuration

### Step 1: Change Default Passwords

```bash
# Connect to database
docker exec -it lms-postgres psql -U lms_user -d lms_slncity

# Change sudo password
UPDATE users SET password_hash = crypt('YourNewStrongPassword123!', gen_salt('bf')) WHERE username = 'sudo';

# Change admin password
UPDATE users SET password_hash = crypt('YourNewStrongPassword123!', gen_salt('bf')) WHERE username = 'admin';

# Exit
\q
```

### Step 2: Configure Firewall

```bash
# Install UFW
sudo apt install -y ufw

# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Step 3: Setup Automated Backups

```bash
# Create backup directory
mkdir -p ~/backups

# Create backup script
cat > ~/backup-database.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/backups
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="lms_backup_${DATE}.sql"

# Create backup
docker exec lms-postgres pg_dump -U lms_user lms_slncity > "${BACKUP_DIR}/${BACKUP_FILE}"

# Compress backup
gzip "${BACKUP_DIR}/${BACKUP_FILE}"

# Keep only last 7 days of backups
find ${BACKUP_DIR} -name "lms_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
EOF

# Make script executable
chmod +x ~/backup-database.sh

# Test backup
~/backup-database.sh

# Setup daily backup cron job (runs at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup-database.sh >> ~/backup.log 2>&1") | crontab -

# Verify cron job
crontab -l
```

---

## Part 6: SSL Certificate Setup (Optional but Recommended)

### Option A: Using Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt install -y certbot

# Stop nginx temporarily
docker-compose -f docker-compose.prod.yml stop frontend

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Create SSL directory
mkdir -p ~/LMS-SLNCity-V1/nginx/ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ~/LMS-SLNCity-V1/nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ~/LMS-SLNCity-V1/nginx/ssl/

# Set permissions
sudo chown -R $USER:$USER ~/LMS-SLNCity-V1/nginx/ssl

# Update nginx.prod.conf to enable HTTPS (uncomment HTTPS section)
nano ~/LMS-SLNCity-V1/nginx.prod.conf

# Restart frontend
docker-compose -f docker-compose.prod.yml up -d frontend

# Setup auto-renewal
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && docker-compose -f ~/LMS-SLNCity-V1/docker-compose.prod.yml restart frontend") | crontab -
```

---

## Part 7: Monitoring and Maintenance

### Daily Commands

```bash
# Check container status
docker ps

# Check logs
docker-compose -f docker-compose.prod.yml logs --tail=100 -f

# Check disk space
df -h

# Check memory usage
free -h

# Check database size
docker exec lms-postgres psql -U lms_user -d lms_slncity -c "SELECT pg_size_pretty(pg_database_size('lms_slncity'));"
```

### Restart Services

```bash
# Restart all services
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
docker-compose -f docker-compose.prod.yml restart frontend
docker-compose -f docker-compose.prod.yml restart postgres
```

### Update Application

```bash
# Navigate to project directory
cd ~/LMS-SLNCity-V1

# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Restore from Backup

```bash
# Stop application
docker-compose -f docker-compose.prod.yml down

# Start only database
docker-compose -f docker-compose.prod.yml up -d postgres

# Wait for database to be ready
sleep 10

# Restore backup
gunzip -c ~/backups/lms_backup_YYYYMMDD_HHMMSS.sql.gz | docker exec -i lms-postgres psql -U lms_user -d lms_slncity

# Start all services
docker-compose -f docker-compose.prod.yml up -d
```

---

## Part 8: Troubleshooting

### Container won't start

```bash
# Check logs
docker logs lms-backend
docker logs lms-frontend
docker logs lms-postgres

# Check if port is already in use
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :5002

# Remove and recreate containers
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### Database connection issues

```bash
# Check if database is running
docker exec lms-postgres pg_isready -U lms_user

# Check database logs
docker logs lms-postgres

# Connect to database manually
docker exec -it lms-postgres psql -U lms_user -d lms_slncity
```

### Application not accessible

```bash
# Check if containers are running
docker ps

# Check nginx logs
docker logs lms-frontend

# Check backend logs
docker logs lms-backend

# Test backend directly
curl http://localhost:5002/health

# Check security group rules in AWS Console
```

---

## Quick Reference

### Access URLs
- **Frontend**: http://your-ec2-ip or http://your-domain.com
- **Backend API**: http://your-ec2-ip/api or http://your-domain.com/api
- **Health Check**: http://your-ec2-ip/api/health

### Default Credentials (CHANGE IMMEDIATELY!)
- **Username**: sudo
- **Password**: ChangeMe@123

### Important Files
- Environment: `~/LMS-SLNCity-V1/.env`
- Docker Compose: `~/LMS-SLNCity-V1/docker-compose.prod.yml`
- Nginx Config: `~/LMS-SLNCity-V1/nginx.prod.conf`
- Backups: `~/backups/`

### Useful Commands
```bash
# View all containers
docker ps -a

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart all
docker-compose -f docker-compose.prod.yml restart

# Stop all
docker-compose -f docker-compose.prod.yml down

# Start all
docker-compose -f docker-compose.prod.yml up -d

# Clean up
docker system prune -a
```

---

## Estimated Costs (AWS)

- **t3.medium**: ~$30/month
- **t3.large**: ~$60/month
- **Storage (30 GB)**: ~$3/month
- **Data Transfer**: ~$5-10/month
- **Total**: ~$40-75/month

---

## Support

For issues or questions:
- GitHub: https://github.com/LMS-SLNCity/LMS-SLNCity-V1/issues
- Check logs: `docker-compose -f docker-compose.prod.yml logs -f`


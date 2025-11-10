# AWS Deployment Guide - LMS SLNCity V1

## Overview
This guide provides step-by-step instructions to deploy the Laboratory Management System (LMS) to AWS using a single EC2 instance with Docker containers for all services (PostgreSQL, Backend, Frontend).

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     AWS Cloud                            │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  EC2 Instance (Ubuntu 22.04 LTS)                 │  │
│  │                                                   │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │  │
│  │  │  Frontend   │  │  Backend    │  │PostgreSQL│ │  │
│  │  │  (Nginx)    │  │  (Node.js)  │  │ (Docker) │ │  │
│  │  │  Port 80    │  │  Port 5002  │  │Port 5432 │ │  │
│  │  │  Port 443   │  │             │  │          │ │  │
│  │  └─────────────┘  └─────────────┘  └──────────┘ │  │
│  │         │                 │              │       │  │
│  │         └─────────────────┴──────────────┘       │  │
│  │                Docker Network                     │  │
│  └──────────────────────────────────────────────────┘  │
│                          │                              │
│                          ▼                              │
│            ┌──────────────────────┐                     │
│            │  Route 53 (Optional) │                     │
│            │  DNS Management      │                     │
│            └──────────────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

**Benefits of Single VM Deployment:**
- ✅ Lower cost (~$15-25/month vs $40-55/month)
- ✅ Simpler setup and maintenance
- ✅ Faster internal communication between services
- ✅ Easier backup and restore
- ✅ Suitable for small to medium workloads

---

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **SSH Key Pair** for EC2 access (or create new one)
3. **Domain Name** (optional, for custom domain)
4. **Basic Linux knowledge**

---

## Step 1: Create EC2 Instance

### 1.1 Launch EC2 Instance

```bash
# AWS Console → EC2 → Launch Instance

# Configuration:
- Name: lms-slncity-server
- AMI: Ubuntu Server 22.04 LTS (64-bit x86)
- Instance Type: t3.medium (2 vCPU, 4 GB RAM) - recommended for all 3 services
  - Minimum: t3.small (2 vCPU, 2 GB RAM) - for testing only
  - Production: t3.medium or larger
- Key Pair: Select existing or create new
- Network Settings:
  - VPC: Default VPC (or custom VPC)
  - Subnet: Public subnet
  - Auto-assign Public IP: Enable
  - Security Group: Create new → lms-sg
- Storage: 30 GB gp3 SSD (minimum)
  - Recommended: 50 GB for production
- Advanced Details:
  - Enable detailed monitoring (optional)
```

### 1.2 Configure Security Group

```bash
# In AWS Console → EC2 → Security Groups → lms-sg
# Add Inbound Rules:

1. SSH:
   Type: SSH
   Protocol: TCP
   Port: 22
   Source: My IP (or specific IP range)
   Description: SSH access

2. HTTP:
   Type: HTTP
   Protocol: TCP
   Port: 80
   Source: 0.0.0.0/0
   Description: HTTP access for frontend

3. HTTPS:
   Type: HTTPS
   Protocol: TCP
   Port: 443
   Source: 0.0.0.0/0
   Description: HTTPS access (for SSL)

4. Backend API (optional, for direct API access):
   Type: Custom TCP
   Protocol: TCP
   Port: 5002
   Source: 0.0.0.0/0
   Description: Backend API access (can be removed after testing)
```

**Note:** PostgreSQL port 5432 does NOT need to be exposed since all services are on the same VM and communicate via Docker network.

---

## Step 2: Connect to EC2 and Install Dependencies

### 2.1 SSH into EC2

```bash
# From your local machine:
chmod 400 your-key-pair.pem
ssh -i your-key-pair.pem ubuntu@<EC2-PUBLIC-IP>
```

### 2.2 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2.3 Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker ubuntu

# Start Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Logout and login again for group changes to take effect
exit
# SSH back in
ssh -i your-key-pair.pem ubuntu@<EC2-PUBLIC-IP>

# Verify Docker installation
docker --version
```

### 2.4 Install Docker Compose

```bash
# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### 2.5 Install Git and Other Tools

```bash
# Install Git
sudo apt install git -y

# Install PostgreSQL client (for database management)
sudo apt install postgresql-client -y

# Verify installations
git --version
psql --version
```

---

## Step 3: Clone and Configure Application

### 3.1 Clone Repository

```bash
cd /home/ubuntu
git clone https://github.com/LMS-SLNCity/LMS-SLNCity-V1.git
cd LMS-SLNCity-V1
```

### 3.2 Create Production Environment File

```bash
# Create .env file for production
cat > .env << 'EOF'
# Environment
NODE_ENV=production
ENV=production

# Database Configuration (Local PostgreSQL in Docker)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=lms_slncity
DB_USER=lms_user
DB_PASSWORD=<STRONG-DB-PASSWORD>

# Backend Configuration
PORT=5002
JWT_SECRET=<GENERATE-STRONG-SECRET>

# Frontend Configuration
VITE_API_BASE_URL=http://<EC2-PUBLIC-IP>:5002/api

# CORS Configuration
CORS_ORIGIN=http://<EC2-PUBLIC-IP>

EOF
```

**Important Notes:**
- `DB_HOST=postgres` - This is the Docker container name, NOT localhost
- Database password should be strong and unique
- JWT secret should be randomly generated

### 3.3 Generate Secrets

```bash
# Generate JWT secret
echo "JWT_SECRET=$(openssl rand -hex 64)"

# Generate database password
echo "DB_PASSWORD=$(openssl rand -base64 32)"

# Copy these values and update .env file
```

### 3.4 Update Environment Variables

```bash
# Edit .env file with actual values
nano .env

# Replace:
# <STRONG-DB-PASSWORD> with generated database password
# <GENERATE-STRONG-SECRET> with generated JWT secret
# <EC2-PUBLIC-IP> with your EC2 public IP (get it from AWS console)

# Save and exit (Ctrl+X, then Y, then Enter)
```

### 3.5 Get EC2 Public IP

```bash
# Get your EC2 public IP
curl -s http://169.254.169.254/latest/meta-data/public-ipv4

# Or from AWS Console → EC2 → Instances → Select your instance → Public IPv4 address
```

---

## Step 4: Create Production Docker Compose File

```bash
# Create docker-compose.prod.yml
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    container_name: lms-postgres
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
      ENV: production
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./server/db/init.sql:/docker-entrypoint-initdb.d/01-init.sql
      - ./server/db/seed-production.sql:/docker-entrypoint-initdb.d/02-seed-production.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - lms-network

  # Backend API
  backend:
    build:
      context: ./server
      dockerfile: Dockerfile.prod
    container_name: lms-backend
    restart: always
    environment:
      NODE_ENV: production
      PORT: 5002
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "5002:5002"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - lms-network

  # Frontend
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      args:
        VITE_API_BASE_URL: ${VITE_API_BASE_URL}
    container_name: lms-frontend
    restart: always
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    networks:
      - lms-network

volumes:
  postgres_data:
    driver: local

networks:
  lms-network:
    driver: bridge
EOF
```

---

## Step 5: Create Production Dockerfiles

### 5.1 Backend Production Dockerfile

```bash
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
RUN npm install -g typescript tsx
RUN tsc

# Expose port
EXPOSE 5002

# Start the production server
CMD ["node", "dist/index.js"]
EOF
```

### 5.2 Frontend Production Dockerfile

```bash
cat > Dockerfile.frontend << 'EOF'
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build argument for API URL
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose ports
EXPOSE 80
EXPOSE 443

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
EOF
```

---

## Step 6: Build and Deploy Application

### 6.1 Build Docker Images

```bash
cd /home/ubuntu/LMS-SLNCity-V1

# Load environment variables
export $(cat .env | xargs)

# Build images (this will take 5-10 minutes)
docker-compose -f docker-compose.prod.yml build

# You should see:
# - Building postgres (using postgres:16-alpine image)
# - Building backend (compiling TypeScript)
# - Building frontend (building React app)
```

### 6.2 Start Application

```bash
# Start all containers
docker-compose -f docker-compose.prod.yml up -d

# Check container status
docker ps

# Expected output:
# CONTAINER ID   IMAGE                    STATUS                    PORTS
# xxxxxxxxxx     lms-slncity-v1_frontend  Up X minutes              0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
# xxxxxxxxxx     lms-slncity-v1_backend   Up X minutes (healthy)    0.0.0.0:5002->5002/tcp
# xxxxxxxxxx     postgres:16-alpine       Up X minutes (healthy)    0.0.0.0:5432->5432/tcp
```

### 6.3 Check Logs

```bash
# Check all logs
docker-compose -f docker-compose.prod.yml logs

# Check specific service logs
docker logs lms-postgres
docker logs lms-backend
docker logs lms-frontend

# Follow logs in real-time
docker logs -f lms-backend
```

### 6.4 Verify Deployment

```bash
# Test backend health
curl http://localhost:5002/health
# Expected: {"status":"ok","timestamp":"..."}

# Test frontend
curl http://localhost
# Expected: HTML content

# Test database connection
docker exec lms-postgres psql -U lms_user -d lms_slncity -c "SELECT COUNT(*) FROM users;"
# Expected: count of users

# From your browser:
# Visit: http://<EC2-PUBLIC-IP>
# You should see the login page
```

### 6.5 Test Login

```bash
# Default credentials (from seed-production.sql):
# Username: sudo
# Password: password

# Login and verify:
# - Dashboard loads
# - Can navigate to different pages
# - Can create visits
# - Can manage referral doctors
```

---

## Step 7: Configure Domain and SSL (Optional but Recommended)

### 7.1 Point Domain to EC2

```bash
# Option 1: Using Route 53 (AWS DNS)
# 1. Go to Route 53 → Hosted Zones
# 2. Select your domain (or create new hosted zone)
# 3. Create Record:
#    - Record name: @ (for root domain) or lms (for subdomain)
#    - Record type: A
#    - Value: <EC2-PUBLIC-IP>
#    - TTL: 300
#    - Routing policy: Simple routing

# Option 2: Using External Domain Registrar
# 1. Login to your domain registrar (GoDaddy, Namecheap, etc.)
# 2. Go to DNS Management
# 3. Add A Record:
#    - Host: @ (or subdomain)
#    - Points to: <EC2-PUBLIC-IP>
#    - TTL: 300 (or Auto)
```

### 7.2 Install SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Stop frontend container temporarily
docker stop lms-frontend

# Get certificate (replace yourdomain.com with your actual domain)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificate will be saved to:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

### 7.3 Update Nginx Configuration for SSL

```bash
# Create SSL-enabled nginx configuration
cat > nginx-ssl.conf << 'EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://lms-backend:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Replace yourdomain.com with your actual domain
sed -i 's/yourdomain.com/YOUR_ACTUAL_DOMAIN/g' nginx-ssl.conf

# Copy to nginx.conf
cp nginx-ssl.conf nginx.conf
```

### 7.4 Update Docker Compose for SSL

```bash
# Update docker-compose.prod.yml to mount SSL certificates
# Add to frontend service volumes:
cat >> docker-compose.prod.yml << 'EOF'
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
EOF
```

### 7.5 Restart Frontend with SSL

```bash
# Rebuild and restart frontend
docker-compose -f docker-compose.prod.yml up -d --build frontend

# Verify SSL
curl https://yourdomain.com
```

### 7.6 Setup SSL Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Setup cron job for auto-renewal
sudo crontab -e

# Add this line (runs twice daily):
0 0,12 * * * certbot renew --quiet --post-hook "docker restart lms-frontend"
```

---

## Step 8: Setup Monitoring and Backups

### 8.1 Enable CloudWatch Monitoring

```bash
# In AWS Console → EC2 → Monitoring
# Enable detailed monitoring for your instance

# Install CloudWatch agent (optional, for detailed metrics)
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb
```

### 8.2 Setup Database Backups

```bash
# Create backup directory
sudo mkdir -p /home/ubuntu/backups
sudo chown ubuntu:ubuntu /home/ubuntu/backups

# Create backup script
cat > /home/ubuntu/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/lms_backup_$DATE.sql"

# Create backup
docker exec lms-postgres pg_dump -U lms_user -d lms_slncity > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "lms_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
EOF

# Make script executable
chmod +x /home/ubuntu/backup-db.sh

# Test backup
/home/ubuntu/backup-db.sh
```

### 8.3 Setup Automated Backups with Cron

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/ubuntu/backup-db.sh >> /home/ubuntu/backups/backup.log 2>&1

# Save and exit
```

### 8.4 Setup Docker Log Rotation

```bash
# Create or edit Docker daemon config
sudo nano /etc/docker/daemon.json
```

Add:
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
# Restart Docker
sudo systemctl restart docker

# Restart containers
cd /home/ubuntu/LMS-SLNCity-V1
docker-compose -f docker-compose.prod.yml restart
```

### 8.5 Setup Disk Space Monitoring

```bash
# Create monitoring script
cat > /home/ubuntu/check-disk.sh << 'EOF'
#!/bin/bash
THRESHOLD=80
USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

if [ $USAGE -gt $THRESHOLD ]; then
    echo "WARNING: Disk usage is at ${USAGE}%"
    # You can add email notification here
fi
EOF

chmod +x /home/ubuntu/check-disk.sh

# Add to crontab (check every hour)
crontab -e
# Add: 0 * * * * /home/ubuntu/check-disk.sh
```

---

## Maintenance Commands

### Update Application

```bash
cd /home/ubuntu/LMS-SLNCity-V1

# Backup database before update
/home/ubuntu/backup-db.sh

# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker ps
docker-compose -f docker-compose.prod.yml logs -f
```

### Database Backup and Restore

```bash
# Manual backup
docker exec lms-postgres pg_dump -U lms_user -d lms_slncity > backup_$(date +%Y%m%d).sql
gzip backup_$(date +%Y%m%d).sql

# Restore from backup
gunzip backup_20250110.sql.gz
docker exec -i lms-postgres psql -U lms_user -d lms_slncity < backup_20250110.sql

# Copy backup to S3 (optional)
aws s3 cp backup_20250110.sql.gz s3://your-backup-bucket/lms-backups/
```

### View Logs

```bash
# All logs
docker-compose -f docker-compose.prod.yml logs -f

# Specific service logs
docker logs -f lms-postgres --tail 100
docker logs -f lms-backend --tail 100
docker logs -f lms-frontend --tail 100

# Save logs to file
docker logs lms-backend > backend.log 2>&1
```

### Restart Services

```bash
# Restart all services
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker restart lms-postgres
docker restart lms-backend
docker restart lms-frontend

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Start all services
docker-compose -f docker-compose.prod.yml up -d
```

### Check Resource Usage

```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check Docker resource usage
docker stats

# Check container status
docker ps -a

# Check Docker volumes
docker volume ls
```

---

## Troubleshooting

### Backend Cannot Connect to Database

```bash
# Check if postgres container is running
docker ps | grep postgres

# Check postgres logs
docker logs lms-postgres

# Check backend environment variables
docker exec lms-backend env | grep DB_

# Test connection from backend container
docker exec lms-backend ping postgres

# Test database connection
docker exec lms-postgres psql -U lms_user -d lms_slncity -c "SELECT 1;"

# Check Docker network
docker network inspect lms-slncity-v1_lms-network
```

### Frontend Shows API Errors

```bash
# Check backend is running
docker ps | grep backend
curl http://localhost:5002/health

# Check VITE_API_BASE_URL in .env
cat .env | grep VITE_API_BASE_URL

# Rebuild frontend with correct API URL
docker-compose -f docker-compose.prod.yml build --no-cache frontend
docker-compose -f docker-compose.prod.yml up -d frontend

# Check nginx logs
docker logs lms-frontend
```

### Database Initialization Failed

```bash
# Check postgres logs
docker logs lms-postgres

# Manually run init script
docker exec -i lms-postgres psql -U lms_user -d lms_slncity < server/db/init.sql

# Check if tables exist
docker exec lms-postgres psql -U lms_user -d lms_slncity -c "\dt"
```

### Out of Memory

```bash
# Check memory usage
free -h
docker stats

# Check which container is using most memory
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}"

# Upgrade EC2 instance type if needed
# AWS Console → EC2 → Actions → Instance Settings → Change Instance Type
# Recommended: t3.medium (4 GB RAM) or larger
```

### Disk Space Full

```bash
# Check disk usage
df -h

# Check Docker disk usage
docker system df

# Clean up old images and containers
docker system prune -a

# Clean up old backups
find /home/ubuntu/backups -name "*.sql.gz" -mtime +30 -delete

# Check large files
du -sh /var/lib/docker/*
```

### Container Keeps Restarting

```bash
# Check container status
docker ps -a

# Check logs for errors
docker logs lms-backend --tail 100
docker logs lms-postgres --tail 100

# Check healthcheck status
docker inspect lms-backend | grep -A 10 Health

# Restart with fresh state
docker-compose -f docker-compose.prod.yml down
docker volume rm lms-slncity-v1_postgres_data  # WARNING: This deletes all data!
docker-compose -f docker-compose.prod.yml up -d
```

### SSL Certificate Issues

```bash
# Check certificate expiry
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check nginx configuration
docker exec lms-frontend nginx -t

# Restart frontend
docker restart lms-frontend
```

---

## Security Checklist

- [ ] Strong database password used (not default)
- [ ] JWT secret is randomly generated (64+ characters)
- [ ] EC2 security group restricts SSH to specific IPs only
- [ ] PostgreSQL port (5432) is NOT exposed to internet
- [ ] SSL certificate installed (for production with domain)
- [ ] Regular automated backups enabled
- [ ] CloudWatch monitoring enabled
- [ ] Application logs reviewed regularly
- [ ] Docker containers run as non-root users (where possible)
- [ ] Environment variables stored securely (not in git)
- [ ] Firewall (ufw) configured on EC2
- [ ] Fail2ban installed for SSH protection
- [ ] Regular security updates applied

### Additional Security Hardening

```bash
# Install and configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Install fail2ban for SSH protection
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Disable password authentication for SSH (use keys only)
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd

# Setup automatic security updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## Cost Estimation (Monthly)

### Single VM Deployment (All services on one EC2)

**Development/Testing:**
- **EC2 t3.small** (2 vCPU, 2 GB RAM): ~$15-20
- **Storage (30 GB gp3)**: ~$3
- **Data Transfer**: ~$2-5
- **Total**: ~$20-28/month

**Production (Recommended):**
- **EC2 t3.medium** (2 vCPU, 4 GB RAM): ~$30-35
- **Storage (50 GB gp3)**: ~$5
- **Data Transfer**: ~$5-10
- **Elastic IP**: ~$3.60 (if not attached to running instance)
- **Total**: ~$40-50/month

**High Traffic Production:**
- **EC2 t3.large** (2 vCPU, 8 GB RAM): ~$60-70
- **Storage (100 GB gp3)**: ~$10
- **Data Transfer**: ~$10-20
- **Load Balancer** (optional): ~$16
- **Total**: ~$96-116/month

### Cost Comparison

| Setup | Monthly Cost | Best For |
|-------|-------------|----------|
| Single VM (t3.small) | $20-28 | Testing, small clinics |
| Single VM (t3.medium) | $40-50 | Small to medium clinics |
| Single VM (t3.large) | $96-116 | Large clinics, high traffic |
| Separate RDS + EC2 | $55-80 | Enterprise, high availability |

**Cost Savings Tips:**
- Use Reserved Instances (save up to 40%)
- Use Spot Instances for non-production (save up to 90%)
- Setup auto-shutdown for non-business hours (save 50%+)
- Use S3 for backups instead of EBS snapshots

---

## Performance Optimization

### Database Optimization

```bash
# Connect to database
docker exec -it lms-postgres psql -U lms_user -d lms_slncity

# Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_created_at ON visits(created_at);
CREATE INDEX IF NOT EXISTS idx_test_results_visit_id ON test_results(visit_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_username ON audit_logs(username);

# Analyze tables
ANALYZE;

# Exit
\q
```

### Docker Optimization

```bash
# Limit container resources in docker-compose.prod.yml
# Add to each service:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

---

## Scaling Considerations

### Vertical Scaling (Upgrade Instance)
```bash
# Stop application
docker-compose -f docker-compose.prod.yml down

# In AWS Console:
# EC2 → Instances → Select instance → Actions → Instance Settings → Change Instance Type
# Choose larger instance (e.g., t3.medium → t3.large)

# Start instance and application
docker-compose -f docker-compose.prod.yml up -d
```

### Horizontal Scaling (Multiple Instances)
For high availability and load balancing:
1. Setup Application Load Balancer (ALB)
2. Create Auto Scaling Group
3. Use RDS for shared database
4. Use S3 for shared file storage
5. Use ElastiCache for session management

---

## Monitoring Dashboard

### Setup Grafana (Optional)

```bash
# Add to docker-compose.prod.yml
  grafana:
    image: grafana/grafana:latest
    container_name: lms-grafana
    restart: always
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - lms-network

volumes:
  grafana_data:
```

---

## Quick Reference Commands

### Daily Operations
```bash
# Check status
docker ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f --tail 50

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Check disk space
df -h

# Check memory
free -h
```

### Weekly Maintenance
```bash
# Check backups
ls -lh /home/ubuntu/backups/

# Check for updates
sudo apt update
sudo apt list --upgradable

# Clean up Docker
docker system prune -f
```

### Monthly Tasks
```bash
# Review logs for errors
docker logs lms-backend --since 30d | grep -i error

# Check SSL certificate expiry
sudo certbot certificates

# Review security updates
sudo apt update && sudo apt upgrade -y

# Test backup restoration
```

---

## Support

For issues or questions:
- **GitHub Issues**: https://github.com/LMS-SLNCity/LMS-SLNCity-V1/issues
- **Email**: support@slncity.com
- **Documentation**: See README.md and other guides

---

## Appendix: Complete Deployment Checklist

### Pre-Deployment
- [ ] AWS account created and configured
- [ ] SSH key pair created
- [ ] Domain name registered (optional)
- [ ] Code pushed to GitHub

### EC2 Setup
- [ ] EC2 instance launched (t3.medium recommended)
- [ ] Security group configured
- [ ] SSH access verified
- [ ] Docker installed
- [ ] Docker Compose installed
- [ ] Git installed

### Application Setup
- [ ] Repository cloned
- [ ] .env file created with strong passwords
- [ ] docker-compose.prod.yml created
- [ ] Dockerfiles created
- [ ] Environment variables configured

### Deployment
- [ ] Docker images built successfully
- [ ] All containers started
- [ ] Database initialized
- [ ] Backend health check passes
- [ ] Frontend accessible
- [ ] Login works with test credentials

### Security
- [ ] Firewall (ufw) configured
- [ ] SSH password authentication disabled
- [ ] Strong database password set
- [ ] JWT secret generated
- [ ] SSL certificate installed (if using domain)
- [ ] Fail2ban installed

### Monitoring & Backups
- [ ] Automated backups configured
- [ ] Backup script tested
- [ ] CloudWatch monitoring enabled
- [ ] Log rotation configured
- [ ] Disk space monitoring setup

### Post-Deployment
- [ ] Application tested thoroughly
- [ ] Performance verified
- [ ] Backups verified
- [ ] Documentation updated
- [ ] Team trained

---

**Last Updated**: 2025-01-10
**Version**: 1.0.0
**Deployment Type**: Single VM (All services on one EC2 instance)


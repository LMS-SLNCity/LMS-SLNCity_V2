# AWS Deployment Guide - LMS SLNCity V1

## Overview
This guide provides step-by-step instructions to deploy the Laboratory Management System (LMS) to AWS using EC2, RDS PostgreSQL, and Docker.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     AWS Cloud                            │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  EC2 Instance (Ubuntu 22.04 LTS)                 │  │
│  │                                                   │  │
│  │  ┌─────────────┐  ┌─────────────┐               │  │
│  │  │  Frontend   │  │  Backend    │               │  │
│  │  │  (Nginx)    │  │  (Node.js)  │               │  │
│  │  │  Port 80    │  │  Port 5002  │               │  │
│  │  └─────────────┘  └─────────────┘               │  │
│  │         │                 │                       │  │
│  └─────────┼─────────────────┼───────────────────────┘  │
│            │                 │                          │
│            │                 ▼                          │
│            │      ┌─────────────────────┐              │
│            │      │  RDS PostgreSQL     │              │
│            │      │  (Managed Database) │              │
│            │      │  Port 5432          │              │
│            │      └─────────────────────┘              │
│            │                                            │
│            ▼                                            │
│  ┌──────────────────────┐                              │
│  │  Route 53 (Optional) │                              │
│  │  DNS Management      │                              │
│  └──────────────────────┘                              │
└─────────────────────────────────────────────────────────┘
```

---

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **SSH Key Pair** for EC2 access
4. **Domain Name** (optional, for custom domain)

---

## Step 1: Create RDS PostgreSQL Database

### 1.1 Create RDS Instance

```bash
# Login to AWS Console
# Navigate to RDS → Create Database

# Configuration:
- Engine: PostgreSQL 16.x
- Template: Production (or Dev/Test for testing)
- DB Instance Identifier: lms-slncity-db
- Master Username: lms_user
- Master Password: <STRONG_PASSWORD> (save this securely)
- DB Instance Class: db.t3.micro (for testing) or db.t3.small (for production)
- Storage: 20 GB SSD (gp3)
- Enable Storage Autoscaling: Yes (up to 100 GB)
- VPC: Default VPC (or create custom VPC)
- Public Access: No (for security)
- VPC Security Group: Create new → lms-db-sg
- Database Name: lms_slncity
- Port: 5432
- Backup Retention: 7 days
- Enable Encryption: Yes
```

### 1.2 Configure Security Group for RDS

```bash
# In AWS Console → EC2 → Security Groups → lms-db-sg
# Add Inbound Rule:
Type: PostgreSQL
Protocol: TCP
Port: 5432
Source: <EC2-SECURITY-GROUP-ID> (will create in next step)
Description: Allow EC2 to connect to RDS
```

### 1.3 Note RDS Endpoint

```bash
# After RDS is created, note the endpoint:
# Example: lms-slncity-db.xxxxxxxxxx.us-east-1.rds.amazonaws.com
```

---

## Step 2: Create EC2 Instance

### 2.1 Launch EC2 Instance

```bash
# AWS Console → EC2 → Launch Instance

# Configuration:
- Name: lms-slncity-server
- AMI: Ubuntu Server 22.04 LTS (64-bit x86)
- Instance Type: t3.small (2 vCPU, 2 GB RAM) - minimum recommended
- Key Pair: Select existing or create new
- Network Settings:
  - VPC: Same as RDS
  - Subnet: Public subnet
  - Auto-assign Public IP: Enable
  - Security Group: Create new → lms-ec2-sg
- Storage: 30 GB gp3 SSD
- Advanced Details:
  - Enable detailed monitoring (optional)
```

### 2.2 Configure Security Group for EC2

```bash
# In AWS Console → EC2 → Security Groups → lms-ec2-sg
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
   Description: HTTP access

3. HTTPS (optional):
   Type: HTTPS
   Protocol: TCP
   Port: 443
   Source: 0.0.0.0/0
   Description: HTTPS access

4. Backend API (for testing):
   Type: Custom TCP
   Protocol: TCP
   Port: 5002
   Source: 0.0.0.0/0
   Description: Backend API access
```

### 2.3 Update RDS Security Group

```bash
# Go back to RDS Security Group (lms-db-sg)
# Edit Inbound Rule:
Source: <EC2-SECURITY-GROUP-ID> (lms-ec2-sg)
```

---

## Step 3: Connect to EC2 and Install Dependencies

### 3.1 SSH into EC2

```bash
# From your local machine:
chmod 400 your-key-pair.pem
ssh -i your-key-pair.pem ubuntu@<EC2-PUBLIC-IP>
```

### 3.2 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 3.3 Install Docker

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

### 3.4 Install Docker Compose

```bash
# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### 3.5 Install Git

```bash
sudo apt install git -y
git --version
```

---

## Step 4: Clone and Configure Application

### 4.1 Clone Repository

```bash
cd /home/ubuntu
git clone https://github.com/LMS-SLNCity/LMS-SLNCity-V1.git
cd LMS-SLNCity-V1
```

### 4.2 Create Production Environment File

```bash
# Create .env file for production
cat > .env << 'EOF'
# Environment
NODE_ENV=production
ENV=production

# Database Configuration (RDS)
DB_HOST=<RDS-ENDPOINT>
DB_PORT=5432
DB_NAME=lms_slncity
DB_USER=lms_user
DB_PASSWORD=<RDS-PASSWORD>

# Backend Configuration
PORT=5002
JWT_SECRET=<GENERATE-STRONG-SECRET>

# Frontend Configuration
VITE_API_BASE_URL=http://<EC2-PUBLIC-IP>:5002/api

# CORS Configuration
CORS_ORIGIN=http://<EC2-PUBLIC-IP>

EOF
```

### 4.3 Generate JWT Secret

```bash
# Generate a strong JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy the output and replace <GENERATE-STRONG-SECRET> in .env file
```

### 4.4 Update Environment Variables

```bash
# Edit .env file with actual values
nano .env

# Replace:
# <RDS-ENDPOINT> with your RDS endpoint
# <RDS-PASSWORD> with your RDS password
# <GENERATE-STRONG-SECRET> with generated JWT secret
# <EC2-PUBLIC-IP> with your EC2 public IP
```

---

## Step 5: Create Production Docker Compose File

```bash
# Create docker-compose.prod.yml
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  backend:
    build:
      context: ./server
      dockerfile: Dockerfile.prod
    container_name: lms-backend
    restart: always
    environment:
      NODE_ENV: production
      PORT: 5002
      DB_HOST: ${DB_HOST}
      DB_PORT: ${DB_PORT}
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "5002:5002"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - lms-network

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
    depends_on:
      - backend
    networks:
      - lms-network

networks:
  lms-network:
    driver: bridge
EOF
```

---

## Step 6: Create Production Dockerfiles

### 6.1 Backend Production Dockerfile

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

### 6.2 Frontend Production Dockerfile

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

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
EOF
```

---

## Step 7: Initialize Database

### 7.1 Connect to RDS from EC2

```bash
# Install PostgreSQL client
sudo apt install postgresql-client -y

# Connect to RDS
psql -h <RDS-ENDPOINT> -U lms_user -d lms_slncity

# You'll be prompted for password
```

### 7.2 Run Database Initialization

```bash
# From EC2, run init script
psql -h <RDS-ENDPOINT> -U lms_user -d lms_slncity < server/db/init.sql

# Run production seed data
psql -h <RDS-ENDPOINT> -U lms_user -d lms_slncity < server/db/seed-production.sql
```

### 7.3 Verify Database Setup

```bash
# Connect to database
psql -h <RDS-ENDPOINT> -U lms_user -d lms_slncity

# Check tables
\dt

# Check users
SELECT username, role FROM users;

# Exit
\q
```

---

## Step 8: Build and Deploy Application

### 8.1 Build Docker Images

```bash
cd /home/ubuntu/LMS-SLNCity-V1

# Load environment variables
export $(cat .env | xargs)

# Build images
docker-compose -f docker-compose.prod.yml build
```

### 8.2 Start Application

```bash
# Start containers
docker-compose -f docker-compose.prod.yml up -d

# Check container status
docker ps

# Check logs
docker logs lms-backend
docker logs lms-frontend
```

### 8.3 Verify Deployment

```bash
# Test backend health
curl http://localhost:5002/health

# Test frontend
curl http://localhost

# From your browser:
# Visit: http://<EC2-PUBLIC-IP>
```

---

## Step 9: Configure Domain (Optional)

### 9.1 Point Domain to EC2

```bash
# In your domain registrar or Route 53:
# Create A record:
# Name: @ (or subdomain like lms)
# Type: A
# Value: <EC2-PUBLIC-IP>
# TTL: 300
```

### 9.2 Install SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Stop nginx container temporarily
docker stop lms-frontend

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Update nginx configuration to use SSL
# (See SSL configuration section below)

# Restart frontend
docker start lms-frontend
```

---

## Step 10: Setup Monitoring and Backups

### 10.1 Enable CloudWatch Monitoring

```bash
# In AWS Console → EC2 → Monitoring
# Enable detailed monitoring

# In RDS → Monitoring
# Enable Enhanced Monitoring
```

### 10.2 Configure RDS Automated Backups

```bash
# Already configured in Step 1
# Verify in RDS Console:
# - Backup retention: 7 days
# - Backup window: Preferred time
# - Maintenance window: Preferred time
```

### 10.3 Setup Application Logs

```bash
# View logs
docker logs -f lms-backend
docker logs -f lms-frontend

# Setup log rotation
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
```

---

## Maintenance Commands

### Update Application

```bash
cd /home/ubuntu/LMS-SLNCity-V1

# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Database Backup

```bash
# Manual backup
pg_dump -h <RDS-ENDPOINT> -U lms_user -d lms_slncity > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -h <RDS-ENDPOINT> -U lms_user -d lms_slncity < backup_20250110.sql
```

### View Logs

```bash
# Backend logs
docker logs -f lms-backend --tail 100

# Frontend logs
docker logs -f lms-frontend --tail 100

# All logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Restart Services

```bash
# Restart all
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker restart lms-backend
docker restart lms-frontend
```

---

## Troubleshooting

### Backend Cannot Connect to Database

```bash
# Check RDS security group allows EC2 security group
# Check environment variables
docker exec lms-backend env | grep DB_

# Test connection from EC2
psql -h <RDS-ENDPOINT> -U lms_user -d lms_slncity
```

### Frontend Shows API Errors

```bash
# Check VITE_API_BASE_URL in .env
# Rebuild frontend with correct API URL
docker-compose -f docker-compose.prod.yml build frontend
docker-compose -f docker-compose.prod.yml up -d frontend
```

### Out of Memory

```bash
# Check memory usage
free -h
docker stats

# Upgrade EC2 instance type if needed
# AWS Console → EC2 → Actions → Instance Settings → Change Instance Type
```

---

## Security Checklist

- [ ] RDS is not publicly accessible
- [ ] Strong database password used
- [ ] JWT secret is randomly generated and secure
- [ ] EC2 security group restricts SSH to specific IPs
- [ ] SSL certificate installed (for production)
- [ ] Regular backups enabled
- [ ] CloudWatch monitoring enabled
- [ ] Application logs reviewed regularly
- [ ] Database credentials stored securely (AWS Secrets Manager recommended)

---

## Cost Estimation (Monthly)

- **EC2 t3.small**: ~$15-20
- **RDS db.t3.micro**: ~$15-20
- **Storage (50 GB)**: ~$5
- **Data Transfer**: ~$5-10
- **Total**: ~$40-55/month

For production with higher traffic, consider:
- EC2 t3.medium or larger
- RDS db.t3.small or larger
- Load balancer for high availability

---

## Support

For issues or questions:
- GitHub: https://github.com/LMS-SLNCity/LMS-SLNCity-V1
- Email: support@slncity.com

---

**Last Updated**: 2025-01-10


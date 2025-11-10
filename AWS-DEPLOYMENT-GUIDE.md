# AWS Deployment Guide - LMS SLNCity

This guide covers deploying the LMS SLNCity application to AWS using various services.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Database Setup (RDS)](#database-setup-rds)
4. [Backend Deployment (EC2/ECS)](#backend-deployment)
5. [Frontend Deployment (S3 + CloudFront)](#frontend-deployment)
6. [Environment Configuration](#environment-configuration)
7. [Security Best Practices](#security-best-practices)
8. [Monitoring & Logging](#monitoring--logging)

---

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Docker installed (for containerized deployment)
- Domain name (optional but recommended)
- SSL certificate (AWS Certificate Manager)

---

## Architecture Overview

```
┌─────────────────┐
│   CloudFront    │ ← Frontend (React)
│   + S3 Bucket   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Application   │
│   Load Balancer │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   ECS/EC2       │ ← Backend (Node.js)
│   Auto Scaling  │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   RDS           │ ← Database (PostgreSQL)
│   Multi-AZ      │
└─────────────────┘
```

---

## Database Setup (RDS)

### Step 1: Create RDS PostgreSQL Instance

```bash
# Using AWS CLI
aws rds create-db-instance \
    --db-instance-identifier lms-slncity-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 16.1 \
    --master-username lms_user \
    --master-user-password YOUR_SECURE_PASSWORD \
    --allocated-storage 20 \
    --storage-type gp3 \
    --vpc-security-group-ids sg-xxxxxxxxx \
    --db-subnet-group-name your-db-subnet-group \
    --backup-retention-period 7 \
    --preferred-backup-window "03:00-04:00" \
    --preferred-maintenance-window "mon:04:00-mon:05:00" \
    --multi-az \
    --publicly-accessible false \
    --storage-encrypted \
    --enable-cloudwatch-logs-exports '["postgresql"]'
```

### Step 2: Initialize Database Schema

Once RDS instance is available, connect and initialize:

```bash
# Get RDS endpoint
export DB_HOST=$(aws rds describe-db-instances \
    --db-instance-identifier lms-slncity-db \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text)

# Connect to database
psql -h $DB_HOST -U lms_user -d postgres

# Create database
CREATE DATABASE lms_slncity;
\c lms_slncity

# Run initialization scripts
\i server/db/init.sql
\i server/db/run-migrations.sh
\i server/db/seed-production.sql
```

### Step 3: Configure Security Group

Allow inbound PostgreSQL traffic (port 5432) from:
- Backend security group
- Your IP (for management)

---

## Backend Deployment

### Option A: EC2 Deployment

#### 1. Launch EC2 Instance

```bash
# Launch Ubuntu 22.04 LTS instance
aws ec2 run-instances \
    --image-id ami-xxxxxxxxx \
    --instance-type t3.small \
    --key-name your-key-pair \
    --security-group-ids sg-xxxxxxxxx \
    --subnet-id subnet-xxxxxxxxx \
    --iam-instance-profile Name=LMS-Backend-Role \
    --user-data file://deploy/ec2-user-data.sh \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=LMS-Backend}]'
```

#### 2. Setup Script (ec2-user-data.sh)

```bash
#!/bin/bash
# Update system
apt-get update && apt-get upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Clone repository
cd /opt
git clone https://github.com/LMS-SLNCity/LMS-SLNCity-V1.git
cd LMS-SLNCity-V1/server

# Install dependencies
npm install --production

# Create .env file
cat > .env << EOF
NODE_ENV=production
PORT=5002
DB_HOST=${DB_HOST}
DB_PORT=5432
DB_USER=lms_user
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=lms_slncity
JWT_SECRET=${JWT_SECRET}
FRONTEND_URL=https://your-domain.com
EOF

# Start application with PM2
pm2 start npm --name "lms-backend" -- start
pm2 save
pm2 startup
```

### Option B: ECS Deployment (Recommended)

#### 1. Build and Push Docker Image

```bash
# Build backend image
cd server
docker build -t lms-backend:latest .

# Tag for ECR
docker tag lms-backend:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/lms-backend:latest

# Push to ECR
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/lms-backend:latest
```

#### 2. Create ECS Task Definition

```json
{
  "family": "lms-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "lms-backend",
      "image": "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/lms-backend:latest",
      "portMappings": [
        {
          "containerPort": 5002,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "5002"}
      ],
      "secrets": [
        {"name": "DB_HOST", "valueFrom": "arn:aws:secretsmanager:..."},
        {"name": "DB_PASSWORD", "valueFrom": "arn:aws:secretsmanager:..."},
        {"name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:..."}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/lms-backend",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### 3. Create ECS Service

```bash
aws ecs create-service \
    --cluster lms-cluster \
    --service-name lms-backend-service \
    --task-definition lms-backend \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=DISABLED}" \
    --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=lms-backend,containerPort=5002"
```

---

## Frontend Deployment

### Step 1: Build Frontend

```bash
# Set production API URL
export VITE_API_URL=https://api.your-domain.com

# Build
npm run build
```

### Step 2: Create S3 Bucket

```bash
aws s3 mb s3://lms-slncity-frontend
aws s3 website s3://lms-slncity-frontend --index-document index.html --error-document index.html
```

### Step 3: Upload to S3

```bash
aws s3 sync dist/ s3://lms-slncity-frontend --delete
```

### Step 4: Create CloudFront Distribution

```bash
aws cloudfront create-distribution \
    --origin-domain-name lms-slncity-frontend.s3.amazonaws.com \
    --default-root-object index.html
```

---

## Environment Configuration

### Production Environment Variables

Create `.env` files based on `.env.example`:

**Backend (server/.env)**:
```bash
NODE_ENV=production
PORT=5002
DB_HOST=lms-db.xxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_USER=lms_user
DB_PASSWORD=<from-secrets-manager>
DB_NAME=lms_slncity
JWT_SECRET=<from-secrets-manager>
FRONTEND_URL=https://your-domain.com
```

**Frontend (.env)**:
```bash
VITE_API_URL=https://api.your-domain.com
```

---

## Security Best Practices

1. **Use AWS Secrets Manager** for sensitive data
2. **Enable encryption** at rest and in transit
3. **Configure WAF** rules for CloudFront
4. **Set up VPC** with private subnets for backend/database
5. **Use IAM roles** instead of access keys
6. **Enable CloudTrail** for audit logging
7. **Configure Security Groups** with least privilege
8. **Use SSL/TLS** certificates from ACM
9. **Enable MFA** for AWS console access
10. **Regular security updates** and patching

---

## Monitoring & Logging

### CloudWatch Setup

```bash
# Create log groups
aws logs create-log-group --log-group-name /aws/ecs/lms-backend
aws logs create-log-group --log-group-name /aws/rds/lms-slncity

# Create alarms
aws cloudwatch put-metric-alarm \
    --alarm-name lms-backend-cpu-high \
    --alarm-description "Alert when CPU exceeds 80%" \
    --metric-name CPUUtilization \
    --namespace AWS/ECS \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold
```

### Application Monitoring

- **CloudWatch Logs**: Application logs
- **CloudWatch Metrics**: Custom metrics
- **X-Ray**: Distributed tracing
- **RDS Performance Insights**: Database performance

---

## Deployment Checklist

- [ ] RDS instance created and initialized
- [ ] Database schema and migrations applied
- [ ] Production seed data loaded
- [ ] Backend deployed (EC2/ECS)
- [ ] Frontend built and deployed to S3
- [ ] CloudFront distribution configured
- [ ] SSL certificates configured
- [ ] Environment variables set
- [ ] Security groups configured
- [ ] IAM roles and policies created
- [ ] Secrets stored in Secrets Manager
- [ ] CloudWatch alarms configured
- [ ] Backup strategy implemented
- [ ] Domain DNS configured
- [ ] Load testing completed
- [ ] Security audit completed

---

## Support

For issues or questions, contact the development team or refer to the main README.md.


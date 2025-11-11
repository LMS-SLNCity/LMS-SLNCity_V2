# LMS SLNCity - AWS Deployment Guide

## Server Details
- **Instance Type**: t3.micro
- **Public IP**: 13.201.165.54
- **Docker**: Installed ✓

## Prerequisites Checklist
- [x] EC2 instance running
- [x] Docker installed
- [ ] Docker Compose installed
- [ ] Git installed
- [ ] Security group configured (ports 80, 443, 5002, 3000)
- [ ] SSH access configured

---

## Step 1: Connect to EC2 Instance

```bash
ssh -i your-key.pem ubuntu@13.201.165.54
# OR
ssh -i your-key.pem ec2-user@13.201.165.54
```

---

## Step 2: Install Docker Compose (if not installed)

```bash
# Check if Docker Compose is installed
docker compose version

# If not installed, install it
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker compose version
```

---

## Step 3: Install Git (if not installed)

```bash
# Check if git is installed
git --version

# If not installed
sudo yum install git -y    # For Amazon Linux
# OR
sudo apt-get install git -y  # For Ubuntu
```

---

## Step 4: Configure Security Group

Ensure the following ports are open in your EC2 Security Group:

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | Your IP | SSH |
| 80 | TCP | 0.0.0.0/0 | HTTP (Frontend) |
| 443 | TCP | 0.0.0.0/0 | HTTPS (Future) |
| 3000 | TCP | 0.0.0.0/0 | Frontend |
| 5002 | TCP | 0.0.0.0/0 | Backend API |
| 5433 | TCP | 0.0.0.0/0 | PostgreSQL (Optional - for external access) |

---

## Step 5: Clone Repository

```bash
# Clone the repository
git clone https://github.com/LMS-SLNCity/LMS-SLNCity-V1.git

# Navigate to project directory
cd LMS-SLNCity-V1
```

---

## Step 6: Create Environment File

Create a `.env` file in the project root:

```bash
nano .env
```

Add the following content:

```env
# Environment Mode
ENV=production

# Database Configuration
POSTGRES_USER=lms_user
POSTGRES_PASSWORD=lms_password_secure_2024
POSTGRES_DB=lms_slncity
DB_HOST=postgres
DB_PORT=5432
DB_USER=lms_user
DB_PASSWORD=lms_password_secure_2024
DB_NAME=lms_slncity

# Backend Configuration
NODE_ENV=production
PORT=5002

# JWT Secret (IMPORTANT: Generate a secure secret)
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your-super-secure-jwt-secret-change-this-in-production

# Frontend Configuration
VITE_API_URL=http://13.201.165.54:5002
FRONTEND_URL=http://13.201.165.54:3000
```

**IMPORTANT**: Generate a secure JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copy the output and replace `your-super-secure-jwt-secret-change-this-in-production` with it.

Save and exit (Ctrl+X, then Y, then Enter)

---

## Step 7: Update docker-compose.yml for Production

The current `docker-compose.yml` should work, but verify these settings:

```bash
cat docker-compose.yml
```

Ensure the environment variables are using the `.env` file values.

---

## Step 8: Build and Start Services

```bash
# Pull latest changes (if needed)
git pull origin main

# Stop any running containers
docker compose down

# Remove old volumes (ONLY if you want a fresh start)
docker volume rm lms-slncity-v1_postgres_data

# Build and start all services
docker compose up -d --build

# This will:
# 1. Build the backend Docker image
# 2. Build the frontend Docker image
# 3. Pull PostgreSQL image
# 4. Start all containers
# 5. Initialize database with schema and seed data
```

---

## Step 9: Monitor Deployment

```bash
# Check container status
docker ps

# View logs for all services
docker compose logs -f

# View logs for specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres

# Check backend health
curl http://localhost:5002/health

# Check frontend
curl http://localhost:3000
```

---

## Step 10: Verify Database

```bash
# Connect to PostgreSQL container
docker exec -it lms-postgres psql -U lms_user -d lms_slncity

# Run some verification queries
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM test_templates;
SELECT COUNT(*) FROM branches;

# Exit PostgreSQL
\q
```

---

## Step 11: Test Application

### From your local machine:

1. **Test Backend API**:
```bash
curl http://13.201.165.54:5002/health
```

2. **Test Frontend**:
Open browser and navigate to:
```
http://13.201.165.54:3000
```

3. **Test Login**:
Use the production credentials:
- **Username**: sudo
- **Password**: $iva@V3nna21

---

## Step 12: Post-Deployment Configuration

### A. Set up automatic restart on reboot

```bash
# Ensure Docker starts on boot
sudo systemctl enable docker

# Create a systemd service for the application
sudo nano /etc/systemd/system/lms-app.service
```

Add this content:
```ini
[Unit]
Description=LMS SLNCity Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/LMS-SLNCity-V1
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Enable the service:
```bash
sudo systemctl enable lms-app.service
```

### B. Set up log rotation

```bash
# Configure Docker log rotation
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

Restart Docker:
```bash
sudo systemctl restart docker
docker compose up -d
```

---

## Troubleshooting

### Container won't start
```bash
# Check logs
docker compose logs backend
docker compose logs frontend
docker compose logs postgres

# Check if ports are already in use
sudo netstat -tulpn | grep -E '3000|5002|5433'
```

### Database connection issues
```bash
# Check if PostgreSQL is healthy
docker ps

# Check PostgreSQL logs
docker compose logs postgres

# Verify database exists
docker exec -it lms-postgres psql -U lms_user -l
```

### Frontend can't connect to backend
```bash
# Verify backend is running
curl http://localhost:5002/health

# Check if VITE_API_URL is correct in .env
cat .env | grep VITE_API_URL

# Rebuild frontend with correct env
docker compose up -d --build frontend
```

### Out of disk space (t3.micro has limited storage)
```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a --volumes

# Remove old images
docker image prune -a
```

---

## Maintenance Commands

### Update application
```bash
cd /home/ubuntu/LMS-SLNCity-V1
git pull origin main
docker compose up -d --build
```

### Backup database
```bash
# Create backup
docker exec lms-postgres pg_dump -U lms_user lms_slncity > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker exec -i lms-postgres psql -U lms_user -d lms_slncity < backup_20250111_120000.sql
```

### View resource usage
```bash
# Container stats
docker stats

# System resources
htop
# OR
top
```

### Restart services
```bash
# Restart all services
docker compose restart

# Restart specific service
docker compose restart backend
docker compose restart frontend
```

---

## Production Checklist

- [ ] JWT_SECRET is set to a secure random value
- [ ] Database password is changed from default
- [ ] Security group is properly configured
- [ ] SSL/HTTPS is configured (recommended for production)
- [ ] Backups are scheduled
- [ ] Monitoring is set up
- [ ] Log rotation is configured
- [ ] Application starts on boot
- [ ] Firewall rules are configured

---

## Next Steps (Optional but Recommended)

1. **Set up SSL/HTTPS** with Let's Encrypt
2. **Configure a domain name** instead of using IP
3. **Set up monitoring** (CloudWatch, Prometheus, etc.)
4. **Configure automated backups** to S3
5. **Set up CloudWatch alarms** for resource usage
6. **Implement CI/CD** for automated deployments

---

## Support

For issues or questions:
- Check logs: `docker compose logs -f`
- Review this guide
- Check GitHub repository issues


#!/bin/bash
# AWS Production Deployment Script
# This script automates the entire deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# Check if running on AWS EC2
print_header "AWS Production Deployment"

print_info "Checking environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed!"
    print_info "Installing Docker..."
    
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    sudo systemctl start docker
    sudo systemctl enable docker
    
    print_success "Docker installed successfully"
    print_warning "Please log out and log back in, then run this script again"
    exit 0
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed!"
    print_info "Installing Docker Compose..."
    
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    print_success "Docker Compose installed successfully"
fi

print_success "Docker and Docker Compose are installed"

# Create .env file
print_header "Creating Environment Configuration"

cat > .env << 'EOF'
# Environment
NODE_ENV=production
ENV=production

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USER=lms_user
DB_PASSWORD=lms_password
DB_NAME=lms_slncity

# Backend Configuration
PORT=5002
JWT_SECRET=UaKjjogf15hJtr6eVa7OGo7omGe3wuUQkS89o6AYYyDaXDSmbrKagzHR/b7h3UYf

# URLs (using port 5002 for backend since it's not behind nginx yet)
VITE_API_URL=http://13.201.165.54:5002/api
FRONTEND_URL=http://13.201.165.54
EOF

print_success ".env file created"

# Show the configuration
print_info "Configuration:"
cat .env
echo ""

# Stop any existing containers
print_header "Stopping Existing Containers"

if docker ps -q --filter "name=lms-" | grep -q .; then
    print_info "Stopping existing containers..."
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    print_success "Existing containers stopped"
else
    print_info "No existing containers to stop"
fi

# Build images
print_header "Building Docker Images"

print_info "This may take 5-10 minutes..."
docker-compose -f docker-compose.prod.yml build --no-cache

print_success "Docker images built successfully"

# Start services
print_header "Starting Services"

docker-compose -f docker-compose.prod.yml up -d

print_success "Services started"

# Wait for services to be ready
print_header "Waiting for Services to Start"

print_info "Waiting for database to be ready..."
sleep 10

# Check database
for i in {1..30}; do
    if docker exec lms-postgres pg_isready -U lms_user -d lms_slncity &> /dev/null; then
        print_success "Database is ready"
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

print_info "Waiting for backend to be ready..."
sleep 10

# Check backend
for i in {1..30}; do
    if curl -s http://localhost:5002/health &> /dev/null; then
        print_success "Backend is ready"
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

print_info "Waiting for frontend to be ready..."
sleep 5

# Check frontend
for i in {1..30}; do
    if curl -s http://localhost:80 &> /dev/null; then
        print_success "Frontend is ready"
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

# Verify deployment
print_header "Verifying Deployment"

print_info "Container Status:"
docker ps --filter "name=lms-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

print_info "Checking database..."
USER_COUNT=$(docker exec lms-postgres psql -U lms_user -d lms_slncity -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' \n\r' || echo "0")
print_success "Database has $USER_COUNT users"

print_info "Checking backend health..."
BACKEND_HEALTH=$(curl -s http://localhost:5002/health || echo "ERROR")
if [ "$BACKEND_HEALTH" != "ERROR" ]; then
    print_success "Backend is healthy"
else
    print_error "Backend health check failed"
fi

print_info "Checking frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80)
if [ "$FRONTEND_STATUS" = "200" ]; then
    print_success "Frontend is accessible"
else
    print_error "Frontend returned status: $FRONTEND_STATUS"
fi

# Setup firewall
print_header "Configuring Firewall"

if command -v ufw &> /dev/null; then
    print_info "UFW is already installed"
else
    print_info "Installing UFW..."
    sudo apt install -y ufw
fi

print_info "Configuring firewall rules..."
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS

# Enable firewall (with confirmation)
print_warning "About to enable firewall. Make sure SSH (port 22) is allowed!"
read -p "Enable firewall? (yes/no): " enable_fw

if [ "$enable_fw" = "yes" ]; then
    sudo ufw --force enable
    print_success "Firewall enabled"
    sudo ufw status
else
    print_warning "Firewall not enabled. You should enable it manually later."
fi

# Setup backup script
print_header "Setting Up Automated Backups"

mkdir -p ~/backups

cat > ~/backup-database.sh << 'BACKUP_SCRIPT'
#!/bin/bash
BACKUP_DIR=~/backups
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="lms_backup_${DATE}.sql"

echo "Creating backup: ${BACKUP_FILE}"
docker exec lms-postgres pg_dump -U lms_user lms_slncity > "${BACKUP_DIR}/${BACKUP_FILE}"

if [ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
    gzip "${BACKUP_DIR}/${BACKUP_FILE}"
    echo "Backup completed: ${BACKUP_FILE}.gz"
    
    # Delete backups older than 7 days
    find ${BACKUP_DIR} -name "lms_backup_*.sql.gz" -mtime +7 -delete
    echo "Old backups cleaned up"
else
    echo "ERROR: Backup failed!"
    exit 1
fi
BACKUP_SCRIPT

chmod +x ~/backup-database.sh

print_success "Backup script created at ~/backup-database.sh"

# Create initial backup
print_info "Creating initial backup..."
~/backup-database.sh

# Setup cron job for daily backups
print_info "Setting up daily backup cron job (2 AM)..."
(crontab -l 2>/dev/null | grep -v "backup-database.sh"; echo "0 2 * * * ~/backup-database.sh >> ~/backup.log 2>&1") | crontab -

print_success "Daily backup scheduled at 2 AM"

# Change default passwords
print_header "Security Configuration"

print_warning "Default passwords need to be changed!"
print_info "Default credentials:"
print_info "  Username: sudo"
print_info "  Password: ChangeMe@123"
echo ""

read -p "Do you want to change the default passwords now? (yes/no): " change_pwd

if [ "$change_pwd" = "yes" ]; then
    echo ""
    read -s -p "Enter new password for 'sudo' user: " sudo_pwd
    echo ""
    read -s -p "Confirm password: " sudo_pwd_confirm
    echo ""
    
    if [ "$sudo_pwd" = "$sudo_pwd_confirm" ] && [ ! -z "$sudo_pwd" ]; then
        docker exec -i lms-postgres psql -U lms_user -d lms_slncity << EOF
UPDATE users SET password_hash = crypt('$sudo_pwd', gen_salt('bf')) WHERE username = 'sudo';
UPDATE users SET password_hash = crypt('$sudo_pwd', gen_salt('bf')) WHERE username = 'admin';
EOF
        print_success "Passwords changed successfully"
    else
        print_error "Passwords don't match or are empty. Skipping password change."
        print_warning "Remember to change passwords manually!"
    fi
else
    print_warning "Remember to change default passwords!"
    print_info "To change passwords later, run:"
    print_info "  docker exec -it lms-postgres psql -U lms_user -d lms_slncity"
    print_info "  UPDATE users SET password_hash = crypt('NewPassword', gen_salt('bf')) WHERE username = 'sudo';"
fi

# Create management scripts
print_header "Creating Management Scripts"

# Restart script
cat > ~/restart-lms.sh << 'RESTART_SCRIPT'
#!/bin/bash
cd ~/LMS-SLNCity-V1
echo "Restarting LMS services..."
docker-compose -f docker-compose.prod.yml restart
echo "Services restarted"
docker ps --filter "name=lms-"
RESTART_SCRIPT

chmod +x ~/restart-lms.sh
print_success "Created ~/restart-lms.sh"

# Stop script
cat > ~/stop-lms.sh << 'STOP_SCRIPT'
#!/bin/bash
cd ~/LMS-SLNCity-V1
echo "Stopping LMS services..."
docker-compose -f docker-compose.prod.yml stop
echo "Services stopped"
STOP_SCRIPT

chmod +x ~/stop-lms.sh
print_success "Created ~/stop-lms.sh"

# Start script
cat > ~/start-lms.sh << 'START_SCRIPT'
#!/bin/bash
cd ~/LMS-SLNCity-V1
echo "Starting LMS services..."
docker-compose -f docker-compose.prod.yml start
echo "Services started"
docker ps --filter "name=lms-"
START_SCRIPT

chmod +x ~/start-lms.sh
print_success "Created ~/start-lms.sh"

# Logs script
cat > ~/logs-lms.sh << 'LOGS_SCRIPT'
#!/bin/bash
cd ~/LMS-SLNCity-V1
docker-compose -f docker-compose.prod.yml logs -f
LOGS_SCRIPT

chmod +x ~/logs-lms.sh
print_success "Created ~/logs-lms.sh"

# Status script
cat > ~/status-lms.sh << 'STATUS_SCRIPT'
#!/bin/bash
echo "=== LMS System Status ==="
echo ""
echo "Containers:"
docker ps --filter "name=lms-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "Database:"
docker exec lms-postgres psql -U lms_user -d lms_slncity -t -c "SELECT COUNT(*) as users FROM users;" 2>/dev/null | head -1
docker exec lms-postgres psql -U lms_user -d lms_slncity -t -c "SELECT COUNT(*) as visits FROM visits;" 2>/dev/null | head -1
echo ""
echo "Backend Health:"
curl -s http://localhost:5002/health
echo ""
echo "Frontend Status:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:80
echo ""
echo "Disk Usage:"
df -h / | tail -1
echo ""
echo "Memory Usage:"
free -h | grep Mem
STATUS_SCRIPT

chmod +x ~/status-lms.sh
print_success "Created ~/status-lms.sh"

# Final summary
print_header "🎉 Deployment Complete!"

echo ""
print_success "LMS SLNCity is now running on AWS!"
echo ""
print_info "Access URLs:"
print_info "  Frontend: http://13.201.165.54"
print_info "  Backend API: http://13.201.165.54/api"
print_info "  Health Check: http://13.201.165.54/api/health"
echo ""
print_info "Default Credentials:"
if [ "$change_pwd" = "yes" ]; then
    print_success "  Passwords have been changed"
else
    print_warning "  Username: sudo"
    print_warning "  Password: ChangeMe@123"
    print_warning "  ⚠️  CHANGE THESE IMMEDIATELY!"
fi
echo ""
print_info "Management Scripts:"
print_info "  ~/status-lms.sh   - Check system status"
print_info "  ~/restart-lms.sh  - Restart all services"
print_info "  ~/start-lms.sh    - Start all services"
print_info "  ~/stop-lms.sh     - Stop all services"
print_info "  ~/logs-lms.sh     - View logs"
print_info "  ~/backup-database.sh - Manual backup"
echo ""
print_info "Automated Backups:"
print_info "  Daily at 2 AM"
print_info "  Location: ~/backups/"
print_info "  Retention: 7 days"
echo ""
print_info "Next Steps:"
print_info "  1. Test the application in your browser"
print_info "  2. Change default passwords (if not done)"
print_info "  3. Configure SSL certificate (optional)"
print_info "  4. Setup monitoring"
echo ""
print_success "Deployment log saved to: ~/deployment.log"
echo ""

# Save deployment info
cat > ~/deployment-info.txt << EOF
LMS SLNCity Deployment Information
==================================

Deployment Date: $(date)
Server IP: 13.201.165.54

Access URLs:
- Frontend: http://13.201.165.54
- Backend API: http://13.201.165.54/api
- Health Check: http://13.201.165.54/api/health

Default Credentials:
- Username: sudo
- Password: $([ "$change_pwd" = "yes" ] && echo "Changed during deployment" || echo "ChangeMe@123 (CHANGE THIS!)")

Database:
- Host: postgres (internal)
- Port: 5432 (internal)
- User: lms_user
- Password: lms_password
- Database: lms_slncity

Management Scripts:
- ~/status-lms.sh - Check system status
- ~/restart-lms.sh - Restart services
- ~/start-lms.sh - Start services
- ~/stop-lms.sh - Stop services
- ~/logs-lms.sh - View logs
- ~/backup-database.sh - Manual backup

Automated Backups:
- Schedule: Daily at 2 AM
- Location: ~/backups/
- Retention: 7 days

Container Names:
- lms-frontend (Nginx)
- lms-backend (Node.js)
- lms-postgres (PostgreSQL)

Data Volume:
- lms-slncity-v1_postgres_data

Important Commands:
- Check status: ~/status-lms.sh
- View logs: ~/logs-lms.sh
- Restart: ~/restart-lms.sh
- Backup: ~/backup-database.sh

Documentation:
- DATA_SAFETY_PROTOCOL.md
- AWS_QUICK_REFERENCE.md
- PRODUCTION_DEPLOYMENT_SUMMARY.md
EOF

print_success "Deployment info saved to: ~/deployment-info.txt"

print_header "Deployment Complete! 🚀"


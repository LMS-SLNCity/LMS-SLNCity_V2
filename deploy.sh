#!/bin/bash

################################################################################
# LMS SLNCity - Automated Deployment Script
# 
# This script automates the deployment of LMS SLNCity on AWS EC2
# Target: Ubuntu EC2 instance (t3.micro)
# IP: 13.201.165.54
#
# Usage:
#   1. Copy this script to your EC2 instance
#   2. Make it executable: chmod +x deploy.sh
#   3. Run it: ./deploy.sh
#
# What this script does:
#   - Installs Docker and Docker Compose
#   - Clones the repository
#   - Sets up environment variables
#   - Deploys the application
#   - Verifies the deployment
################################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/LMS-SLNCity/LMS-SLNCity-V1.git"
APP_DIR="$HOME/LMS-SLNCity-V1"
EC2_IP="13.201.165.54"

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_command() {
    if command -v $1 &> /dev/null; then
        print_success "$1 is installed"
        return 0
    else
        print_warning "$1 is not installed"
        return 1
    fi
}

################################################################################
# Main Deployment Functions
################################################################################

# Step 1: System Update
update_system() {
    print_header "Step 1: Updating System"
    
    print_info "Updating package lists..."
    sudo apt-get update -y
    
    print_info "Upgrading packages..."
    sudo apt-get upgrade -y
    
    print_success "System updated successfully"
}

# Step 2: Install Docker
install_docker() {
    print_header "Step 2: Installing Docker"
    
    if check_command docker; then
        print_info "Docker is already installed, skipping..."
        return 0
    fi
    
    print_info "Installing Docker prerequisites..."
    sudo apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    print_info "Adding Docker's official GPG key..."
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    print_info "Setting up Docker repository..."
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    print_info "Installing Docker Engine..."
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    print_info "Adding current user to docker group..."
    sudo usermod -aG docker $USER
    
    print_success "Docker installed successfully"
    print_warning "You may need to log out and back in for docker group changes to take effect"
}

# Step 3: Install Docker Compose (standalone)
install_docker_compose() {
    print_header "Step 3: Installing Docker Compose"
    
    if check_command docker-compose; then
        print_info "Docker Compose is already installed, skipping..."
        return 0
    fi
    
    print_info "Docker Compose plugin should be installed with Docker"
    print_info "Testing docker compose command..."
    
    if docker compose version &> /dev/null; then
        print_success "Docker Compose (plugin) is available"
    else
        print_error "Docker Compose is not available"
        exit 1
    fi
}

# Step 4: Clone Repository
clone_repository() {
    print_header "Step 4: Cloning Repository"
    
    if [ -d "$APP_DIR" ]; then
        print_warning "Directory $APP_DIR already exists"
        read -p "Do you want to remove it and clone fresh? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "Removing existing directory..."
            rm -rf "$APP_DIR"
        else
            print_info "Updating existing repository..."
            cd "$APP_DIR"
            git pull origin main
            print_success "Repository updated"
            return 0
        fi
    fi
    
    print_info "Cloning repository from $REPO_URL..."
    git clone "$REPO_URL" "$APP_DIR"
    
    cd "$APP_DIR"
    print_success "Repository cloned successfully"
}

# Step 5: Generate JWT Secret
generate_jwt_secret() {
    print_info "Generating JWT secret..."
    openssl rand -base64 32
}

# Step 6: Create Environment File
create_env_file() {
    print_header "Step 5: Creating Environment File"
    
    cd "$APP_DIR"
    
    if [ -f ".env" ]; then
        print_warning ".env file already exists"
        read -p "Do you want to overwrite it? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Keeping existing .env file"
            return 0
        fi
    fi
    
    print_info "Generating JWT secret..."
    JWT_SECRET=$(generate_jwt_secret)
    
    print_info "Creating .env file..."
    cat > .env << EOF
# ===========================================
# ENVIRONMENT
# ===========================================
ENV=production
NODE_ENV=production

# ===========================================
# SERVER CONFIGURATION
# ===========================================
PORT=5002
FRONTEND_URL=http://${EC2_IP}:3000

# ===========================================
# API CONFIGURATION
# ===========================================
VITE_API_URL=http://${EC2_IP}:5002

# ===========================================
# DATABASE CONFIGURATION
# ===========================================
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=lms_slncity
POSTGRES_USER=lms_user
POSTGRES_PASSWORD=$(openssl rand -base64 16)

# ===========================================
# SECURITY
# ===========================================
JWT_SECRET=${JWT_SECRET}

# ===========================================
# DOCKER CONFIGURATION
# ===========================================
COMPOSE_PROJECT_NAME=lms-slncity
EOF
    
    print_success ".env file created successfully"
    print_info "JWT Secret: ${JWT_SECRET}"
}

# Step 7: Deploy Application
deploy_application() {
    print_header "Step 6: Deploying Application"
    
    cd "$APP_DIR"
    
    print_info "Stopping any existing containers..."
    docker compose down 2>/dev/null || true
    
    print_info "Building and starting containers..."
    print_warning "This may take 5-10 minutes on first run..."
    docker compose up -d --build
    
    print_success "Containers started successfully"
}

# Step 8: Wait for Services
wait_for_services() {
    print_header "Step 7: Waiting for Services to Start"
    
    print_info "Waiting for database to be ready..."
    sleep 10
    
    print_info "Waiting for backend to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:5002/health > /dev/null 2>&1; then
            print_success "Backend is ready"
            break
        fi
        echo -n "."
        sleep 2
    done
    echo ""
    
    print_info "Waiting for frontend to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            print_success "Frontend is ready"
            break
        fi
        echo -n "."
        sleep 2
    done
    echo ""
}

# Step 9: Verify Deployment
verify_deployment() {
    print_header "Step 8: Verifying Deployment"
    
    cd "$APP_DIR"
    
    print_info "Checking container status..."
    docker compose ps
    
    echo ""
    print_info "Checking backend health..."
    BACKEND_HEALTH=$(curl -s http://localhost:5002/health || echo "FAILED")
    if [[ $BACKEND_HEALTH == *"ok"* ]]; then
        print_success "Backend is healthy"
    else
        print_error "Backend health check failed"
    fi
    
    echo ""
    print_info "Checking frontend..."
    FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
    if [ "$FRONTEND_STATUS" == "200" ]; then
        print_success "Frontend is accessible"
    else
        print_error "Frontend is not accessible (HTTP $FRONTEND_STATUS)"
    fi
    
    echo ""
    print_info "Checking database..."
    DB_COUNT=$(docker exec lms-postgres psql -U lms_user -d lms_slncity -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs)
    if [ ! -z "$DB_COUNT" ] && [ "$DB_COUNT" -gt 0 ]; then
        print_success "Database is initialized (${DB_COUNT} users found)"
    else
        print_error "Database check failed"
    fi
}

# Step 10: Display Summary
display_summary() {
    print_header "Deployment Complete!"
    
    echo -e "${GREEN}"
    cat << "EOF"
    ╔════════════════════════════════════════════════════════════════╗
    ║                   🎉 DEPLOYMENT SUCCESSFUL! 🎉                 ║
    ╚════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    echo -e "\n${BLUE}📋 Application Details:${NC}"
    echo -e "   Frontend URL:  ${GREEN}http://${EC2_IP}:3000${NC}"
    echo -e "   Backend API:   ${GREEN}http://${EC2_IP}:5002${NC}"
    echo -e "   Health Check:  ${GREEN}http://${EC2_IP}:5002/health${NC}"
    
    echo -e "\n${BLUE}🔐 Login Credentials:${NC}"
    echo -e "   Username: ${GREEN}sudo${NC}"
    echo -e "   Password: ${GREEN}\$iva@V3nna21${NC}"
    
    echo -e "\n${BLUE}📚 Useful Commands:${NC}"
    echo -e "   View logs:        ${YELLOW}cd $APP_DIR && docker compose logs -f${NC}"
    echo -e "   Stop services:    ${YELLOW}cd $APP_DIR && docker compose down${NC}"
    echo -e "   Restart services: ${YELLOW}cd $APP_DIR && docker compose restart${NC}"
    echo -e "   View status:      ${YELLOW}cd $APP_DIR && docker compose ps${NC}"
    
    echo -e "\n${BLUE}⚠️  Important Next Steps:${NC}"
    echo -e "   1. Open http://${EC2_IP}:3000 in your browser"
    echo -e "   2. Login with the credentials above"
    echo -e "   3. Create additional users through Admin Panel"
    echo -e "   4. Configure your test templates and branches"
    echo -e "   5. Set up regular database backups"
    
    echo -e "\n${BLUE}🔒 Security Reminders:${NC}"
    echo -e "   • Ensure EC2 security group allows ports: 22, 3000, 5002"
    echo -e "   • Consider setting up SSL/HTTPS for production"
    echo -e "   • Set up regular database backups"
    echo -e "   • Monitor application logs regularly"
    
    echo ""
}

################################################################################
# Main Execution
################################################################################

main() {
    clear
    
    echo -e "${BLUE}"
    cat << "EOF"
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║                    LMS SLNCity - Deployment Script                       ║
║                                                                          ║
║              Automated deployment for AWS EC2 (t3.micro)                 ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}\n"
    
    print_info "Target IP: ${EC2_IP}"
    print_info "Installation directory: ${APP_DIR}"
    echo ""
    
    read -p "Press Enter to start deployment or Ctrl+C to cancel..."
    
    # Execute deployment steps
    update_system
    install_docker
    install_docker_compose
    clone_repository
    create_env_file
    deploy_application
    wait_for_services
    verify_deployment
    display_summary
    
    print_success "Deployment script completed!"
}

# Run main function
main


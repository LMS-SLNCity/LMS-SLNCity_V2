#!/bin/bash

################################################################################
# LMS SLNCity - Quick Redeploy Script
# 
# This script quickly redeploys the application after code changes
# Use this when you've pushed updates to GitHub and want to deploy them
#
# Usage:
#   1. Copy this script to your EC2 instance
#   2. Make it executable: chmod +x redeploy.sh
#   3. Run it: ./redeploy.sh
################################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="$HOME/LMS-SLNCity-V1"

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

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

################################################################################
# Main Functions
################################################################################

check_directory() {
    if [ ! -d "$APP_DIR" ]; then
        print_error "Application directory not found: $APP_DIR"
        print_info "Please run deploy.sh first for initial deployment"
        exit 1
    fi
}

backup_env() {
    print_header "Step 1: Backing up environment file"
    
    cd "$APP_DIR"
    
    if [ -f ".env" ]; then
        cp .env .env.backup
        print_success "Environment file backed up to .env.backup"
    else
        print_error ".env file not found!"
        exit 1
    fi
}

pull_latest_code() {
    print_header "Step 2: Pulling latest code from GitHub"
    
    cd "$APP_DIR"
    
    print_info "Fetching latest changes..."
    git fetch origin main
    
    print_info "Pulling latest code..."
    git pull origin main
    
    print_success "Code updated successfully"
}

restore_env() {
    print_header "Step 3: Restoring environment file"
    
    cd "$APP_DIR"
    
    if [ -f ".env.backup" ]; then
        cp .env.backup .env
        print_success "Environment file restored"
    fi
}

stop_services() {
    print_header "Step 4: Stopping services"
    
    cd "$APP_DIR"
    
    print_info "Stopping containers..."
    docker compose down
    
    print_success "Services stopped"
}

rebuild_and_start() {
    print_header "Step 5: Rebuilding and starting services"
    
    cd "$APP_DIR"
    
    print_info "Building and starting containers..."
    print_info "This may take a few minutes..."
    docker compose up -d --build
    
    print_success "Services started"
}

wait_for_services() {
    print_header "Step 6: Waiting for services"
    
    print_info "Waiting for services to be ready..."
    sleep 15
    
    print_info "Checking backend health..."
    for i in {1..30}; do
        if curl -s http://localhost:5002/health > /dev/null 2>&1; then
            print_success "Backend is ready"
            break
        fi
        echo -n "."
        sleep 2
    done
    echo ""
    
    print_info "Checking frontend..."
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

verify_deployment() {
    print_header "Step 7: Verifying deployment"
    
    cd "$APP_DIR"
    
    print_info "Container status:"
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
}

display_summary() {
    print_header "Redeployment Complete!"
    
    echo -e "${GREEN}"
    cat << "EOF"
    ╔════════════════════════════════════════════════════════════════╗
    ║                🎉 REDEPLOYMENT SUCCESSFUL! 🎉                  ║
    ╚════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    echo -e "\n${BLUE}📋 Application is running:${NC}"
    echo -e "   Frontend: ${GREEN}http://$(curl -s ifconfig.me):3000${NC}"
    echo -e "   Backend:  ${GREEN}http://$(curl -s ifconfig.me):5002${NC}"
    
    echo -e "\n${BLUE}📚 Useful Commands:${NC}"
    echo -e "   View logs:    ${YELLOW}cd $APP_DIR && docker compose logs -f${NC}"
    echo -e "   Restart:      ${YELLOW}cd $APP_DIR && docker compose restart${NC}"
    echo -e "   Stop:         ${YELLOW}cd $APP_DIR && docker compose down${NC}"
    
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
║                  LMS SLNCity - Quick Redeploy Script                     ║
║                                                                          ║
║              Pull latest code and restart the application                ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}\n"
    
    print_info "This will:"
    echo "   1. Pull latest code from GitHub"
    echo "   2. Stop current services"
    echo "   3. Rebuild and restart services"
    echo ""
    
    read -p "Press Enter to continue or Ctrl+C to cancel..."
    
    # Execute redeployment steps
    check_directory
    backup_env
    pull_latest_code
    restore_env
    stop_services
    rebuild_and_start
    wait_for_services
    verify_deployment
    display_summary
    
    print_success "Redeployment completed!"
}

# Run main function
main


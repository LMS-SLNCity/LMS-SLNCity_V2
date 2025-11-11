#!/bin/bash

################################################################################
# LMS SLNCity - Deploy to EC2 Helper Script
# 
# This script runs on your LOCAL machine to:
#   1. Copy deployment scripts to EC2
#   2. SSH into EC2 and run the deployment
#
# Prerequisites:
#   - SSH key file (.pem) for EC2 access
#   - EC2 instance running and accessible
#
# Usage:
#   ./deploy-to-ec2.sh /path/to/your-key.pem
################################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EC2_IP="13.201.165.54"
EC2_USER="ubuntu"

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

################################################################################
# Main Functions
################################################################################

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check if SSH key is provided
    if [ -z "$1" ]; then
        print_error "SSH key file not provided"
        echo ""
        echo "Usage: $0 /path/to/your-key.pem"
        echo ""
        echo "Example:"
        echo "  $0 ~/Downloads/my-ec2-key.pem"
        exit 1
    fi
    
    SSH_KEY="$1"
    
    # Check if SSH key exists
    if [ ! -f "$SSH_KEY" ]; then
        print_error "SSH key file not found: $SSH_KEY"
        exit 1
    fi
    
    print_success "SSH key found: $SSH_KEY"
    
    # Check if deployment scripts exist
    if [ ! -f "deploy.sh" ]; then
        print_error "deploy.sh not found in current directory"
        exit 1
    fi
    
    if [ ! -f "redeploy.sh" ]; then
        print_error "redeploy.sh not found in current directory"
        exit 1
    fi
    
    print_success "Deployment scripts found"
    
    # Set correct permissions for SSH key
    chmod 400 "$SSH_KEY"
    print_success "SSH key permissions set"
}

test_connection() {
    print_header "Testing EC2 Connection"
    
    print_info "Attempting to connect to $EC2_USER@$EC2_IP..."
    
    if ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" "echo 'Connection successful'" &> /dev/null; then
        print_success "Successfully connected to EC2 instance"
    else
        print_error "Failed to connect to EC2 instance"
        print_info "Please check:"
        echo "   • EC2 instance is running"
        echo "   • Security group allows SSH (port 22) from your IP"
        echo "   • SSH key is correct"
        echo "   • EC2 IP address is correct: $EC2_IP"
        exit 1
    fi
}

copy_scripts() {
    print_header "Copying Deployment Scripts to EC2"
    
    print_info "Copying deploy.sh..."
    scp -i "$SSH_KEY" -o StrictHostKeyChecking=no deploy.sh "$EC2_USER@$EC2_IP:~/"
    
    print_info "Copying redeploy.sh..."
    scp -i "$SSH_KEY" -o StrictHostKeyChecking=no redeploy.sh "$EC2_USER@$EC2_IP:~/"
    
    print_success "Scripts copied successfully"
    
    print_info "Setting execute permissions..."
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" "chmod +x ~/deploy.sh ~/redeploy.sh"
    
    print_success "Execute permissions set"
}

show_menu() {
    print_header "Deployment Options"
    
    echo "What would you like to do?"
    echo ""
    echo "  1) Full deployment (first time setup)"
    echo "  2) Quick redeploy (update existing deployment)"
    echo "  3) Just copy scripts and exit (manual deployment)"
    echo "  4) Open SSH session"
    echo "  5) Exit"
    echo ""
    read -p "Enter your choice (1-5): " choice
    
    case $choice in
        1)
            run_full_deployment
            ;;
        2)
            run_quick_redeploy
            ;;
        3)
            print_success "Scripts copied. You can now SSH and run them manually."
            print_info "SSH command: ssh -i $SSH_KEY $EC2_USER@$EC2_IP"
            print_info "Then run: ./deploy.sh"
            ;;
        4)
            open_ssh_session
            ;;
        5)
            print_info "Exiting..."
            exit 0
            ;;
        *)
            print_error "Invalid choice"
            show_menu
            ;;
    esac
}

run_full_deployment() {
    print_header "Running Full Deployment"
    
    print_warning "This will perform a complete deployment including:"
    echo "   • System updates"
    echo "   • Docker installation"
    echo "   • Repository cloning"
    echo "   • Application deployment"
    echo ""
    print_warning "This may take 10-15 minutes"
    echo ""
    read -p "Continue? (y/n): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Deployment cancelled"
        show_menu
        return
    fi
    
    print_info "Connecting to EC2 and running deployment..."
    echo ""
    
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -t "$EC2_USER@$EC2_IP" "bash ~/deploy.sh"
    
    echo ""
    print_success "Deployment completed!"
    show_post_deployment_info
}

run_quick_redeploy() {
    print_header "Running Quick Redeploy"
    
    print_info "This will:"
    echo "   • Pull latest code from GitHub"
    echo "   • Rebuild and restart services"
    echo ""
    print_warning "This may take 3-5 minutes"
    echo ""
    read -p "Continue? (y/n): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Redeployment cancelled"
        show_menu
        return
    fi
    
    print_info "Connecting to EC2 and running redeployment..."
    echo ""
    
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -t "$EC2_USER@$EC2_IP" "bash ~/redeploy.sh"
    
    echo ""
    print_success "Redeployment completed!"
    show_post_deployment_info
}

open_ssh_session() {
    print_header "Opening SSH Session"
    
    print_info "Connecting to EC2..."
    print_info "To run deployment manually, execute: ./deploy.sh"
    print_info "To exit SSH session, type: exit"
    echo ""
    
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP"
}

show_post_deployment_info() {
    echo ""
    echo -e "${GREEN}"
    cat << "EOF"
╔════════════════════════════════════════════════════════════════╗
║                    🎉 DEPLOYMENT COMPLETE! 🎉                  ║
╚════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    echo -e "\n${BLUE}📋 Access Your Application:${NC}"
    echo -e "   Frontend: ${GREEN}http://${EC2_IP}:3000${NC}"
    echo -e "   Backend:  ${GREEN}http://${EC2_IP}:5002${NC}"
    
    echo -e "\n${BLUE}🔐 Login Credentials:${NC}"
    echo -e "   Username: ${GREEN}sudo${NC}"
    echo -e "   Password: ${GREEN}\$iva@V3nna21${NC}"
    
    echo -e "\n${BLUE}🔧 Useful Commands:${NC}"
    echo -e "   SSH to EC2:       ${YELLOW}ssh -i $SSH_KEY $EC2_USER@$EC2_IP${NC}"
    echo -e "   View logs:        ${YELLOW}cd ~/LMS-SLNCity-V1 && docker compose logs -f${NC}"
    echo -e "   Restart services: ${YELLOW}cd ~/LMS-SLNCity-V1 && docker compose restart${NC}"
    
    echo -e "\n${BLUE}⚠️  Security Checklist:${NC}"
    echo "   □ Ensure security group allows ports: 22, 3000, 5002"
    echo "   □ Test the application in browser"
    echo "   □ Create additional users through Admin Panel"
    echo "   □ Set up database backups"
    
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
║              LMS SLNCity - Deploy to EC2 Helper Script                   ║
║                                                                          ║
║          This script will help you deploy to your EC2 instance           ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}\n"
    
    print_info "Target EC2: $EC2_USER@$EC2_IP"
    echo ""
    
    # Check prerequisites
    check_prerequisites "$@"
    
    # Test connection
    test_connection
    
    # Copy scripts
    copy_scripts
    
    # Show menu
    show_menu
}

# Run main function
main "$@"


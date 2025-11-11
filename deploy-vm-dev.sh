#!/bin/bash

# VM Development Deployment Script
# This script helps deploy the LMS application to a VM in development mode

set -e  # Exit on any error

echo "=========================================="
echo "LMS VM Development Deployment"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
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
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed!"
    echo "Please install Docker first:"
    echo "  curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "  sudo sh get-docker.sh"
    exit 1
fi
print_success "Docker is installed"

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not available!"
    exit 1
fi
print_success "Docker Compose is available"

# Get VM IP address
VM_IP=<vm ip here>
if [ -z "$VM_IP" ]; then
    print_error "Could not detect VM IP address"
    read -p "Please enter your VM IP address: " VM_IP
fi
print_info "VM IP Address: $VM_IP"

# Ask user to confirm IP
read -p "Is this IP address correct? (y/n): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    read -p "Please enter the correct VM IP address: " VM_IP
fi

echo ""
print_info "Configuring environment for IP: $VM_IP"
echo ""

# Create frontend .env file
cat > .env << EOF
# Frontend Environment Configuration
# VM Development Mode
VITE_API_URL=http://${VM_IP}:5002

# Optional: Gemini API Key (for AI features)
GEMINI_API_KEY=your_gemini_api_key_here
EOF
print_success "Created frontend .env file"

# Create backend .env file
cat > server/.env << EOF
# VM DEVELOPMENT CONFIGURATION
PORT=5002
DB_HOST=postgres
DB_PORT=5432
DB_USER=lms_user
DB_PASSWORD=lms_password
DB_NAME=lms_slncity
NODE_ENV=development

# JWT Secret (Generated: 2025-11-03)
JWT_SECRET=e338cec6670e03b9cab465f4331062c9233e5a61e93f04e77b844d0ff597702a4693ffbfb147008ae78f7a2d35c15c63e7f7bfc02624f2609928e687dec16d95

# Frontend URL for CORS
FRONTEND_URL=http://${VM_IP}:3000
EOF
print_success "Created backend .env file"

echo ""
print_info "Environment files created with VM IP: $VM_IP"
echo ""

# Ask if user wants to deploy now
read -p "Do you want to build and start the services now? (y/n): " deploy_now
if [ "$deploy_now" != "y" ] && [ "$deploy_now" != "Y" ]; then
    print_warning "Deployment cancelled. Run 'docker compose up -d --build' when ready."
    exit 0
fi

echo ""
print_info "Building and starting services..."
echo ""

# Set environment to development
export ENV=development

# Stop any existing containers
if docker compose ps -q | grep -q .; then
    print_info "Stopping existing containers..."
    docker compose down
fi

# Build and start services
print_info "Building Docker images (this may take a few minutes)..."
docker compose build

print_info "Starting services..."
docker compose up -d

echo ""
print_info "Waiting for services to be healthy..."
sleep 10

# Check service status
echo ""
print_info "Service Status:"
docker compose ps

echo ""
echo "=========================================="
print_success "Deployment Complete!"
echo "=========================================="
echo ""
echo "Access the application at:"
echo "  🌐 Frontend: http://${VM_IP}:3000"
echo "  🔌 Backend API: http://${VM_IP}:5002"
echo "  🗄️  PostgreSQL: ${VM_IP}:5433"
echo ""
echo "Default Login Credentials (Development):"
echo "  👤 SUDO:       sudo / admin123"
echo "  👤 Admin:      admin / admin123"
echo "  👤 Reception:  reception / reception123"
echo "  👤 Lab:        lab / lab123"
echo "  👤 Phlebotomy: phlebotomy / phlebotomy123"
echo "  👤 Approver:   approver / approver123"
echo ""
echo "Useful Commands:"
echo "  📋 View logs:        docker compose logs -f"
echo "  🔄 Restart:          docker compose restart"
echo "  🛑 Stop:             docker compose down"
echo "  🔍 Check status:     docker compose ps"
echo ""
print_warning "Note: This is a DEVELOPMENT deployment with test data!"
echo ""

# Check if services are running
if docker compose ps | grep -q "Up"; then
    print_success "Services are running!"
    echo ""
    print_info "Opening application in browser..."
    echo "If browser doesn't open, navigate to: http://${VM_IP}:3000"
else
    print_error "Some services may not be running properly."
    echo "Check logs with: docker compose logs -f"
fi


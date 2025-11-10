#!/bin/bash

# LMS SLNCity V1 - Local Deployment Script
# This script rebuilds and deploys the application locally using Podman

set -e  # Exit on error

echo "🚀 LMS SLNCity V1 - Local Deployment Script"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if podman is installed
if ! command -v podman &> /dev/null; then
    print_error "Podman is not installed. Please install Podman first."
    exit 1
fi

# Check if podman-compose is installed
if ! command -v podman-compose &> /dev/null; then
    print_error "podman-compose is not installed. Please install podman-compose first."
    exit 1
fi

print_success "Podman and podman-compose are installed"
echo ""

# Step 1: Stop existing containers
print_info "Step 1: Stopping existing containers..."
podman-compose down || true
print_success "Containers stopped"
echo ""

# Step 2: Clean up old images (optional)
read -p "Do you want to remove old images to force a clean build? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Removing old images..."
    podman rmi -f localhost/lms-slncity-v1_frontend:latest || true
    podman rmi -f localhost/lms-slncity-v1_backend:latest || true
    print_success "Old images removed"
else
    print_info "Skipping image removal"
fi
echo ""

# Step 3: Build containers
print_info "Step 3: Building containers (this may take a few minutes)..."
podman-compose build --no-cache

if [ $? -eq 0 ]; then
    print_success "Containers built successfully"
else
    print_error "Failed to build containers"
    exit 1
fi
echo ""

# Step 4: Start containers
print_info "Step 4: Starting containers..."
podman-compose up -d

if [ $? -eq 0 ]; then
    print_success "Containers started successfully"
else
    print_error "Failed to start containers"
    exit 1
fi
echo ""

# Step 5: Wait for containers to be healthy
print_info "Step 5: Waiting for containers to be healthy..."
sleep 10

# Check container status
print_info "Checking container status..."
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Step 6: Verify services
print_info "Step 6: Verifying services..."

# Check database
print_info "Checking database connection..."
if podman exec lms-postgres pg_isready -U lms_user -d lms_slncity > /dev/null 2>&1; then
    print_success "Database is ready"
else
    print_error "Database is not ready"
fi

# Check backend
print_info "Checking backend health..."
sleep 5
if curl -s http://localhost:5002/health > /dev/null 2>&1; then
    print_success "Backend is healthy"
else
    print_error "Backend is not responding"
fi

# Check frontend
print_info "Checking frontend..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    print_success "Frontend is accessible"
else
    print_error "Frontend is not accessible"
fi

echo ""
echo "============================================"
print_success "Deployment Complete!"
echo "============================================"
echo ""
echo "📊 Application URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5002"
echo "   Health:   http://localhost:5002/health"
echo ""
echo "🔐 Default Login Credentials:"
echo "   Username: sudo"
echo "   Password: password"
echo ""
echo "📝 Useful Commands:"
echo "   View logs:        podman-compose logs -f"
echo "   Stop containers:  podman-compose down"
echo "   Restart:          podman-compose restart"
echo "   View containers:  podman ps"
echo ""
echo "📚 Documentation:"
echo "   README.md"
echo "   AWS_DEPLOYMENT_GUIDE.md"
echo "   CHANGELOG.md"
echo ""
print_info "Opening application in browser..."
sleep 2

# Try to open browser (works on macOS, Linux with xdg-open, or WSL)
if command -v open &> /dev/null; then
    open http://localhost:3000
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
elif command -v wslview &> /dev/null; then
    wslview http://localhost:3000
else
    print_info "Please open http://localhost:3000 in your browser"
fi

echo ""
print_success "Deployment script completed successfully!"


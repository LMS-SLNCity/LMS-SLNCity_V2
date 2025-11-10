#!/bin/bash
# Rebuild and restart all containers with fresh database

set -e

echo "=========================================="
echo "🔄 Rebuilding LMS Containers"
echo "=========================================="
echo ""

# Stop and remove existing containers
echo "Step 1: Stopping existing containers..."
podman-compose down -v

# Remove old images to force rebuild
echo ""
echo "Step 2: Removing old images..."
podman rmi localhost/lms-slncity-v1_backend:latest localhost/lms-slncity-v1_frontend:latest 2>/dev/null || true

# Rebuild and start containers
echo ""
echo "Step 3: Building and starting containers..."
podman-compose up -d --build

# Wait for services to be healthy
echo ""
echo "Step 4: Waiting for services to be healthy..."
sleep 10

# Check status
echo ""
echo "Step 5: Checking container status..."
podman ps

echo ""
echo "=========================================="
echo "✅ Containers rebuilt successfully!"
echo "=========================================="
echo ""
echo "Services:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend:  http://localhost:5002"
echo "  - Database: localhost:5433"
echo ""
echo "Check logs with:"
echo "  podman logs -f lms-backend"
echo "  podman logs -f lms-frontend"
echo "  podman logs -f lms-postgres"
echo ""


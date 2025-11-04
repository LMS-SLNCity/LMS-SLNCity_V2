# Docker Setup Guide - LMS SLNCity V1

## Current Status

✅ **Completed:**
- Docker/Podman configuration files created
- Backend Dockerfile with health checks
- Frontend Dockerfile with Nginx
- Docker Compose configuration
- All TypeScript errors resolved
- Code pushed to GitHub

⚠️ **Issues:**
- Local PostgreSQL (port 5432) has authentication issues
- Backend port 5001 conflicts with local services
- Need to use Docker-isolated environment

---

## Solution: Complete Docker Environment

### Step 1: Stop All Local Services

```bash
# Stop any running backend/frontend
pkill -f "npm run dev"
pkill -f "node.*server"

# Verify ports are free
lsof -i :5001  # Should be empty
lsof -i :3000  # Should be empty
```

### Step 2: Start Docker Environment

The updated `docker-compose.yml` uses different ports to avoid conflicts:

- **PostgreSQL**: Port 5433 (external) → 5432 (internal)
- **Backend**: Port 5002 (external) → 5001 (internal)
- **Frontend**: Port 3001 (external) → 80 (internal)

```bash
# Start all services
podman-compose up -d --build

# Check status
podman-compose ps

# View logs
podman-compose logs -f
```

### Step 3: Access the Application

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:5002
- **PostgreSQL**: localhost:5433

### Step 4: Run Tests

The test suite is ready at `/Users/ramgopal/LMS-SLNCITY-V1-TEST`

```bash
cd /Users/ramgopal/LMS-SLNCITY-V1-TEST

# Update test configuration to use Docker ports
# Edit backend-tests/test-helper.ts
# Change baseURL to: http://localhost:5002

# Run tests
npm run test:backend
```

---

## Docker Compose Services

### 1. PostgreSQL Database
- **Image**: postgres:16-alpine
- **Container**: lms-postgres
- **Port**: 5433:5432
- **Credentials**:
  - User: lms_user
  - Password: lms_password
  - Database: lms_slncity
- **Init Scripts**:
  - `/docker-entrypoint-initdb.d/01-init.sql` (schema)
  - `/docker-entrypoint-initdb.d/02-seed.sql` (clean seed data)

### 2. Backend API
- **Build**: ./server/Dockerfile
- **Container**: lms-backend
- **Port**: 5002:5001
- **Environment**:
  - DB_HOST=postgres
  - DB_PORT=5432
  - DB_USER=lms_user
  - DB_PASSWORD=lms_password
  - DB_NAME=lms_slncity
- **Health Check**: curl http://localhost:5001/health

### 3. Frontend
- **Build**: ./Dockerfile.frontend (multi-stage with Nginx)
- **Container**: lms-frontend
- **Port**: 3001:80
- **Nginx**: Serves static files + proxies /api to backend

---

## Useful Commands

### Start Services
```bash
podman-compose up -d          # Start in background
podman-compose up             # Start with logs
podman-compose up --build     # Rebuild and start
```

### Stop Services
```bash
podman-compose down           # Stop containers
podman-compose down -v        # Stop and remove volumes (fresh start)
```

### View Logs
```bash
podman-compose logs           # All logs
podman-compose logs backend   # Backend only
podman-compose logs -f        # Follow logs
```

### Execute Commands in Containers
```bash
# Access PostgreSQL
podman exec -it lms-postgres psql -U lms_user -d lms_slncity

# Access backend shell
podman exec -it lms-backend sh

# View backend environment
podman exec lms-backend env | grep DB_
```

### Database Operations
```bash
# Reset database (from host)
podman exec -i lms-postgres psql -U lms_user -d lms_slncity < server/db/clean-seed.sql

# Backup database
podman exec lms-postgres pg_dump -U lms_user lms_slncity > backup.sql

# Restore database
podman exec -i lms-postgres psql -U lms_user -d lms_slncity < backup.sql
```

---

## Troubleshooting

### Port Already in Use
```bash
# Find what's using the port
lsof -i :5001
lsof -i :3000
lsof -i :5432

# Kill the process
kill -9 <PID>
```

### Container Won't Start
```bash
# Check logs
podman-compose logs <service-name>

# Remove and recreate
podman-compose down -v
podman-compose up --build
```

### Database Connection Issues
```bash
# Check if postgres is healthy
podman exec lms-postgres pg_isready -U lms_user

# Check database exists
podman exec lms-postgres psql -U lms_user -l

# Check tables
podman exec lms-postgres psql -U lms_user -d lms_slncity -c "\dt"
```

### Backend Not Responding
```bash
# Check if backend is running
podman exec lms-backend ps aux

# Check backend logs
podman-compose logs backend

# Restart backend
podman-compose restart backend
```

---

## Test Execution with Docker

### Update Test Configuration

Edit `/Users/ramgopal/LMS-SLNCITY-V1-TEST/backend-tests/test-helper.ts`:

```typescript
export class APIClient {
  private baseURL = 'http://localhost:5002';  // Changed from 5001
  // ... rest of the code
}
```

### Run Tests

```bash
cd /Users/ramgopal/LMS-SLNCITY-V1-TEST

# Run all backend tests
npm run test:backend

# Run specific test file
npm run test:backend -- backend-tests/unit/auth.test.ts

# Run with coverage
npm run test:coverage

# Run frontend E2E tests (requires frontend running)
npx playwright test
```

---

## Production Deployment

### Build Production Images

```bash
# Build backend
cd server
podman build -t lms-backend:prod .

# Build frontend
cd ..
podman build -f Dockerfile.frontend -t lms-frontend:prod .
```

### Push to Registry

```bash
# Tag images
podman tag lms-backend:prod your-registry.com/lms-backend:latest
podman tag lms-frontend:prod your-registry.com/lms-frontend:latest

# Push images
podman push your-registry.com/lms-backend:latest
podman push your-registry.com/lms-frontend:latest
```

---

## Environment Variables

Create `.env` file in project root:

```env
# JWT Secret (change in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Database (for docker-compose)
POSTGRES_USER=lms_user
POSTGRES_PASSWORD=lms_password
POSTGRES_DB=lms_slncity

# Ports (optional, defaults in docker-compose.yml)
POSTGRES_PORT=5433
BACKEND_PORT=5002
FRONTEND_PORT=3001
```

---

## Next Steps

1. **Start Docker Environment**
   ```bash
   podman-compose up -d --build
   ```

2. **Verify Services**
   ```bash
   curl http://localhost:5002/health
   curl http://localhost:3001
   ```

3. **Update Test Configuration**
   - Change API URL in test-helper.ts to http://localhost:5002

4. **Run Tests**
   ```bash
   cd /Users/ramgopal/LMS-SLNCITY-V1-TEST
   npm run test:backend
   ```

5. **Achieve 100% Test Pass Rate** 🎯

---

## Summary

- ✅ Docker configuration complete
- ✅ All services containerized
- ✅ Database with clean seed data
- ✅ Health checks configured
- ✅ Nginx reverse proxy for frontend
- ✅ Isolated network for services
- ✅ Ready for testing and deployment

**Status**: Ready to run `podman-compose up -d --build`


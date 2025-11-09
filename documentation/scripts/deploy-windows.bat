@echo off
REM ============================================
REM LMS SLNCity - Windows Deployment Script
REM Sri Lakshmi Narasimha Diagnostic Center
REM ============================================

echo ============================================
echo LMS SLNCity - Windows Deployment
echo Sri Lakshmi Narasimha Diagnostic Center
echo ============================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo Right-click and select "Run as Administrator"
    pause
    exit /b 1
)

echo [1/8] Checking prerequisites...
echo.

REM Check Node.js
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js 18.x from https://nodejs.org/
    pause
    exit /b 1
)
echo ✓ Node.js found: 
node --version

REM Check npm
where npm >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: npm is not installed!
    pause
    exit /b 1
)
echo ✓ npm found:
npm --version

REM Check Docker
where docker >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Docker is not installed!
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo ✓ Docker found:
docker --version

echo.
echo [2/8] Stopping existing containers...
docker stop lms-postgres-dev 2>nul
docker rm lms-postgres-dev 2>nul
docker volume rm lms-slncity-v1_postgres_dev_data 2>nul
echo ✓ Cleaned up old containers

echo.
echo [3/8] Starting PostgreSQL database...
docker run -d ^
  --name lms-postgres-dev ^
  -e POSTGRES_USER=lms_user ^
  -e POSTGRES_PASSWORD=lms_password ^
  -e POSTGRES_DB=lms_slncity ^
  -p 5433:5432 ^
  -v lms-slncity-v1_postgres_dev_data:/var/lib/postgresql/data ^
  postgres:16-alpine

if %errorLevel% neq 0 (
    echo ERROR: Failed to start PostgreSQL container!
    pause
    exit /b 1
)
echo ✓ PostgreSQL container started

echo.
echo [4/8] Waiting for database to be ready (30 seconds)...
timeout /t 30 /nobreak >nul
echo ✓ Database should be ready

echo.
echo [5/8] Initializing database schema...
docker exec -i lms-postgres-dev psql -U lms_user -d lms_slncity < server\db\init.sql
if %errorLevel% neq 0 (
    echo ERROR: Failed to initialize database schema!
    pause
    exit /b 1
)
echo ✓ Database schema initialized

echo.
echo [6/8] Loading development seed data...
docker exec -i lms-postgres-dev psql -U lms_user -d lms_slncity < server\db\seed-development.sql
if %errorLevel% neq 0 (
    echo ERROR: Failed to load seed data!
    pause
    exit /b 1
)
echo ✓ Seed data loaded

echo.
echo [7/8] Installing dependencies...
echo Installing frontend dependencies...
call npm install
if %errorLevel% neq 0 (
    echo ERROR: Failed to install frontend dependencies!
    pause
    exit /b 1
)

echo Installing backend dependencies...
cd server
call npm install
if %errorLevel% neq 0 (
    echo ERROR: Failed to install backend dependencies!
    pause
    exit /b 1
)
cd ..
echo ✓ Dependencies installed

echo.
echo [8/8] Creating startup scripts...

REM Create backend startup script
echo @echo off > start-backend.bat
echo echo Starting LMS Backend Server... >> start-backend.bat
echo cd server >> start-backend.bat
echo set JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars >> start-backend.bat
echo set PORT=5001 >> start-backend.bat
echo npm run dev >> start-backend.bat
echo ✓ Created start-backend.bat

REM Create frontend startup script
echo @echo off > start-frontend.bat
echo echo Starting LMS Frontend... >> start-frontend.bat
echo npm run dev >> start-frontend.bat
echo ✓ Created start-frontend.bat

REM Create combined startup script
echo @echo off > start-all.bat
echo echo ============================================ >> start-all.bat
echo echo LMS SLNCity - Starting All Services >> start-all.bat
echo echo Sri Lakshmi Narasimha Diagnostic Center >> start-all.bat
echo echo ============================================ >> start-all.bat
echo echo. >> start-all.bat
echo echo Starting Backend Server... >> start-all.bat
echo start "LMS Backend" cmd /k start-backend.bat >> start-all.bat
echo timeout /t 5 /nobreak ^>nul >> start-all.bat
echo echo. >> start-all.bat
echo echo Starting Frontend... >> start-all.bat
echo start "LMS Frontend" cmd /k start-frontend.bat >> start-all.bat
echo echo. >> start-all.bat
echo echo ============================================ >> start-all.bat
echo echo All services started! >> start-all.bat
echo echo Backend: http://localhost:5001 >> start-all.bat
echo echo Frontend: http://localhost:5173 >> start-all.bat
echo echo ============================================ >> start-all.bat
echo pause >> start-all.bat
echo ✓ Created start-all.bat

echo.
echo ============================================
echo ✓ DEPLOYMENT COMPLETE!
echo ============================================
echo.
echo Database Status:
docker ps --filter "name=lms-postgres-dev" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.
echo Default Login Credentials:
echo   Username: sudo
echo   Password: Password123
echo.
echo To start the application:
echo   1. Double-click start-all.bat
echo   2. Wait for both servers to start
echo   3. Open browser to http://localhost:5173
echo.
echo To stop the database:
echo   docker stop lms-postgres-dev
echo.
echo To restart everything:
echo   Run this script again (deploy-windows.bat)
echo.
pause


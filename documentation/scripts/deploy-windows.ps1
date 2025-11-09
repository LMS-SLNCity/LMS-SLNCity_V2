# ============================================
# LMS SLNCity - Windows Deployment Script (PowerShell)
# Sri Lakshmi Narasimha Diagnostic Center
# ============================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "LMS SLNCity - Windows Deployment" -ForegroundColor Cyan
Write-Host "Sri Lakshmi Narasimha Diagnostic Center" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click and select 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[1/8] Checking prerequisites..." -ForegroundColor Yellow
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js 18.x from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "✓ npm found: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: npm is not installed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check Docker
try {
    $dockerVersion = docker --version
    Write-Host "✓ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Docker is not installed!" -ForegroundColor Red
    Write-Host "Please install Docker Desktop from https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[2/8] Stopping existing containers..." -ForegroundColor Yellow
docker stop lms-postgres-dev 2>$null
docker rm lms-postgres-dev 2>$null
docker volume rm lms-slncity-v1_postgres_dev_data 2>$null
Write-Host "✓ Cleaned up old containers" -ForegroundColor Green

Write-Host ""
Write-Host "[3/8] Starting PostgreSQL database..." -ForegroundColor Yellow
$dockerRun = docker run -d `
  --name lms-postgres-dev `
  -e POSTGRES_USER=lms_user `
  -e POSTGRES_PASSWORD=lms_password `
  -e POSTGRES_DB=lms_slncity `
  -p 5433:5432 `
  -v lms-slncity-v1_postgres_dev_data:/var/lib/postgresql/data `
  postgres:16-alpine

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to start PostgreSQL container!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✓ PostgreSQL container started" -ForegroundColor Green

Write-Host ""
Write-Host "[4/8] Waiting for database to be ready (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30
Write-Host "✓ Database should be ready" -ForegroundColor Green

Write-Host ""
Write-Host "[5/8] Initializing database schema..." -ForegroundColor Yellow
Get-Content "server\db\init.sql" | docker exec -i lms-postgres-dev psql -U lms_user -d lms_slncity
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to initialize database schema!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✓ Database schema initialized" -ForegroundColor Green

Write-Host ""
Write-Host "[6/8] Loading development seed data..." -ForegroundColor Yellow
Get-Content "server\db\seed-development.sql" | docker exec -i lms-postgres-dev psql -U lms_user -d lms_slncity
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to load seed data!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✓ Seed data loaded" -ForegroundColor Green

Write-Host ""
Write-Host "[7/8] Installing dependencies..." -ForegroundColor Yellow
Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install frontend dependencies!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
Push-Location server
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install backend dependencies!" -ForegroundColor Red
    Pop-Location
    Read-Host "Press Enter to exit"
    exit 1
}
Pop-Location
Write-Host "✓ Dependencies installed" -ForegroundColor Green

Write-Host ""
Write-Host "[8/8] Creating startup scripts..." -ForegroundColor Yellow

# Create backend startup script
@"
@echo off
echo Starting LMS Backend Server...
cd server
set JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
set PORT=5001
npm run dev
"@ | Out-File -FilePath "start-backend.bat" -Encoding ASCII
Write-Host "✓ Created start-backend.bat" -ForegroundColor Green

# Create frontend startup script
@"
@echo off
echo Starting LMS Frontend...
npm run dev
"@ | Out-File -FilePath "start-frontend.bat" -Encoding ASCII
Write-Host "✓ Created start-frontend.bat" -ForegroundColor Green

# Create combined startup script
@"
@echo off
echo ============================================
echo LMS SLNCity - Starting All Services
echo Sri Lakshmi Narasimha Diagnostic Center
echo ============================================
echo.
echo Starting Backend Server...
start "LMS Backend" cmd /k start-backend.bat
timeout /t 5 /nobreak >nul
echo.
echo Starting Frontend...
start "LMS Frontend" cmd /k start-frontend.bat
echo.
echo ============================================
echo All services started!
echo Backend: http://localhost:5001
echo Frontend: http://localhost:5173
echo ============================================
pause
"@ | Out-File -FilePath "start-all.bat" -Encoding ASCII
Write-Host "✓ Created start-all.bat" -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✓ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database Status:" -ForegroundColor Yellow
docker ps --filter "name=lms-postgres-dev" --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}"
Write-Host ""
Write-Host "Default Login Credentials:" -ForegroundColor Yellow
Write-Host "  Username: sudo" -ForegroundColor White
Write-Host "  Password: Password123" -ForegroundColor White
Write-Host ""
Write-Host "To start the application:" -ForegroundColor Yellow
Write-Host "  1. Double-click start-all.bat" -ForegroundColor White
Write-Host "  2. Wait for both servers to start" -ForegroundColor White
Write-Host "  3. Open browser to http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "To stop the database:" -ForegroundColor Yellow
Write-Host "  docker stop lms-postgres-dev" -ForegroundColor White
Write-Host ""
Write-Host "To restart everything:" -ForegroundColor Yellow
Write-Host "  Run this script again (deploy-windows.ps1)" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to exit"


#!/bin/bash

# LMS SLNCity Security Audit Script
# This script checks for common security issues

echo "🔒 LMS SLNCity Security Audit"
echo "=============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

# Function to check and report
check_pass() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    ((PASS++))
}

check_fail() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    ((FAIL++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  WARN:${NC} $1"
    ((WARN++))
}

echo "1. Environment Configuration"
echo "----------------------------"

# Check if .env exists
if [ -f "server/.env" ]; then
    check_pass ".env file exists"
    
    # Check JWT_SECRET
    JWT_SECRET=$(grep JWT_SECRET server/.env | cut -d '=' -f2)
    if [ "$JWT_SECRET" == "CHANGE_THIS_TO_64_CHAR_RANDOM_STRING" ] || [ -z "$JWT_SECRET" ]; then
        check_fail "JWT_SECRET not configured or using default value"
    elif [ ${#JWT_SECRET} -lt 32 ]; then
        check_warn "JWT_SECRET is too short (should be at least 64 characters)"
    else
        check_pass "JWT_SECRET is configured"
    fi
    
    # Check DB_PASSWORD
    DB_PASSWORD=$(grep DB_PASSWORD server/.env | cut -d '=' -f2)
    if [ "$DB_PASSWORD" == "CHANGE_THIS_TO_STRONG_PASSWORD" ] || [ -z "$DB_PASSWORD" ]; then
        check_fail "DB_PASSWORD not configured or using default value"
    elif [ ${#DB_PASSWORD} -lt 12 ]; then
        check_warn "DB_PASSWORD is too short (should be at least 12 characters)"
    else
        check_pass "DB_PASSWORD is configured"
    fi
    
    # Check NODE_ENV
    NODE_ENV=$(grep NODE_ENV server/.env | cut -d '=' -f2)
    if [ "$NODE_ENV" == "production" ]; then
        check_pass "NODE_ENV is set to production"
    else
        check_warn "NODE_ENV is not set to production"
    fi
else
    check_fail ".env file not found"
fi

echo ""
echo "2. File Permissions"
echo "-------------------"

# Check .env permissions
if [ -f "server/.env" ]; then
    PERMS=$(stat -f "%A" server/.env 2>/dev/null || stat -c "%a" server/.env 2>/dev/null)
    if [ "$PERMS" == "600" ] || [ "$PERMS" == "400" ]; then
        check_pass ".env file has secure permissions ($PERMS)"
    else
        check_warn ".env file permissions are $PERMS (should be 600 or 400)"
        echo "  Fix with: chmod 600 server/.env"
    fi
fi

echo ""
echo "3. Dependencies"
echo "---------------"

# Check if security packages are installed
if [ -f "server/package.json" ]; then
    if grep -q "helmet" server/package.json; then
        check_pass "helmet package is installed"
    else
        check_fail "helmet package is not installed"
    fi
    
    if grep -q "express-rate-limit" server/package.json; then
        check_pass "express-rate-limit package is installed"
    else
        check_fail "express-rate-limit package is not installed"
    fi
    
    if grep -q "express-validator" server/package.json; then
        check_pass "express-validator package is installed"
    else
        check_warn "express-validator package is not installed"
    fi
fi

echo ""
echo "4. Code Security"
echo "----------------"

# Check for hardcoded secrets
if grep -r "your-secret-key-change-in-production" server/src/ 2>/dev/null; then
    check_warn "Found hardcoded default secret in code (should use env variable)"
else
    check_pass "No hardcoded default secrets found"
fi

# Check for console.log with sensitive data
if grep -r "console.log.*password" server/src/ 2>/dev/null | grep -v "password_hash"; then
    check_warn "Found console.log statements that may log passwords"
else
    check_pass "No obvious password logging found"
fi

echo ""
echo "5. Database Security"
echo "--------------------"

# Check if PostgreSQL is listening on localhost only
if command -v psql &> /dev/null; then
    if sudo -u postgres psql -c "SHOW listen_addresses;" 2>/dev/null | grep -q "localhost"; then
        check_pass "PostgreSQL is listening on localhost only"
    else
        check_warn "PostgreSQL may be listening on all interfaces"
    fi
else
    check_warn "PostgreSQL not found or not accessible"
fi

echo ""
echo "6. Firewall Configuration"
echo "-------------------------"

# Check UFW status
if command -v ufw &> /dev/null; then
    if sudo ufw status | grep -q "Status: active"; then
        check_pass "UFW firewall is active"
        
        # Check if only necessary ports are open
        if sudo ufw status | grep -q "80/tcp"; then
            check_pass "Port 80 (HTTP) is open"
        fi
        
        if sudo ufw status | grep -q "443/tcp"; then
            check_pass "Port 443 (HTTPS) is open"
        fi
        
        if sudo ufw status | grep -q "5432"; then
            check_warn "Port 5432 (PostgreSQL) is open - should be localhost only"
        fi
    else
        check_fail "UFW firewall is not active"
    fi
else
    check_warn "UFW firewall not found"
fi

echo ""
echo "7. SSL/TLS Configuration"
echo "------------------------"

# Check if SSL certificates exist
if [ -d "/etc/letsencrypt/live" ]; then
    check_pass "Let's Encrypt directory exists"
    
    # Check certificate expiry
    if command -v certbot &> /dev/null; then
        EXPIRY=$(sudo certbot certificates 2>/dev/null | grep "Expiry Date" | head -1)
        if [ -n "$EXPIRY" ]; then
            check_pass "SSL certificate found: $EXPIRY"
        fi
    fi
else
    check_warn "Let's Encrypt certificates not found"
fi

echo ""
echo "8. Nginx Configuration"
echo "----------------------"

# Check if Nginx is installed and running
if command -v nginx &> /dev/null; then
    check_pass "Nginx is installed"
    
    if systemctl is-active --quiet nginx; then
        check_pass "Nginx is running"
    else
        check_fail "Nginx is not running"
    fi
    
    # Check if security headers are configured
    if [ -f "/etc/nginx/sites-available/lms-slncity" ]; then
        if grep -q "Strict-Transport-Security" /etc/nginx/sites-available/lms-slncity; then
            check_pass "HSTS header is configured"
        else
            check_warn "HSTS header not found in Nginx config"
        fi
        
        if grep -q "X-Frame-Options" /etc/nginx/sites-available/lms-slncity; then
            check_pass "X-Frame-Options header is configured"
        else
            check_warn "X-Frame-Options header not found in Nginx config"
        fi
    fi
else
    check_warn "Nginx is not installed"
fi

echo ""
echo "9. Process Management"
echo "---------------------"

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    check_pass "PM2 is installed"
    
    # Check if application is running
    if pm2 list | grep -q "lms-backend"; then
        if pm2 list | grep "lms-backend" | grep -q "online"; then
            check_pass "Application is running"
        else
            check_fail "Application is not running"
        fi
    else
        check_warn "Application not found in PM2"
    fi
else
    check_warn "PM2 is not installed"
fi

echo ""
echo "10. Backup Configuration"
echo "------------------------"

# Check if backup script exists
if [ -f "/usr/local/bin/backup-lms.sh" ]; then
    check_pass "Backup script exists"
else
    check_warn "Backup script not found"
fi

# Check if cron job for backup exists
if crontab -l 2>/dev/null | grep -q "backup"; then
    check_pass "Backup cron job is configured"
else
    check_warn "Backup cron job not found"
fi

echo ""
echo "=============================="
echo "Security Audit Summary"
echo "=============================="
echo -e "${GREEN}✅ Passed: $PASS${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARN${NC}"
echo -e "${RED}❌ Failed: $FAIL${NC}"
echo ""

if [ $FAIL -gt 0 ]; then
    echo -e "${RED}⚠️  CRITICAL: You have $FAIL failed security checks!${NC}"
    echo "Please fix these issues before deploying to production."
    exit 1
elif [ $WARN -gt 0 ]; then
    echo -e "${YELLOW}⚠️  You have $WARN warnings. Consider addressing these for better security.${NC}"
    exit 0
else
    echo -e "${GREEN}✅ All security checks passed!${NC}"
    exit 0
fi


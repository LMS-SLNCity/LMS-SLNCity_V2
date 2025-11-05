# LMS Database Setup Guide

This directory contains database setup scripts for both **development** and **production** environments.

## 🎯 Quick Start

### Development Environment (with test data)
```bash
# Option 1: Using Docker (Recommended)
podman-compose -f docker-compose.dev.yml up -d

# Option 2: Using local PostgreSQL
cd server/db
./setup-development.sh
```

### Production Environment (clean, no test data)
```bash
# Option 1: Using Docker
podman-compose -f docker-compose.prod.yml up -d

# Option 2: Using local PostgreSQL
cd server/db
./setup-production.sh
```

---

## 📁 File Structure

```
server/db/
├── init.sql                    # Database schema (tables, functions, triggers)
├── seed-development.sql        # Development seed data (with test data)
├── seed-production.sql         # Production seed data (essential only)
├── setup-development.sh        # Development setup script
├── setup-production.sh         # Production setup script
├── setup.sh                    # Interactive setup (choose dev/prod)
└── README.md                   # This file
```

---

## 🔧 Development Environment

### What's Included:
- ✅ 6 staff users (sudo, admin, reception, phlebo, labtech, approver)
- ✅ 5 test templates (CBC, LFT, RFT, LIPID, THYROID)
- ✅ 5 B2B clients with logins
- ✅ 5 sample patients
- ✅ 3 sample visits
- ✅ 2 ledger entries
- ✅ Sample branches, signatories, referral doctors

### Default Credentials:
**Staff Users** (Password: `Password123`):
- `sudo` / `Password123` (SUDO role)
- `admin` / `Password123` (ADMIN role)
- `reception` / `Password123` (RECEPTION role)
- `phlebo` / `Password123` (PHLEBOTOMY role)
- `labtech` / `Password123` (LAB role)
- `approver` / `Password123` (APPROVER role)

**B2B Clients** (Password: `Client123`):
- Client ID: `1` / `Client123` (City Diagnostic Center)
- Client ID: `2` / `Client123` (Apollo Diagnostics)
- Client ID: `3` / `Client123` (Max Healthcare)
- Client ID: `4` / `Client123` (Fortis Hospital)
- Client ID: `5` / `Client123` (Medanta Clinic)

### Setup Commands:
```bash
# Using Docker (Recommended)
podman stop lms-postgres-dev 2>/dev/null || true
podman rm lms-postgres-dev 2>/dev/null || true
podman volume rm lms-slncity-v1_postgres_dev_data 2>/dev/null || true
podman-compose -f docker-compose.dev.yml up -d

# Wait for database to be ready
sleep 10

# Verify setup
podman exec lms-postgres-dev psql -U lms_user -d lms_slncity -c "SELECT COUNT(*) FROM users;"
```

---

## 🚀 Production Environment

### What's Included:
- ✅ 2 essential users (sudo, admin)
- ✅ 3 sample test templates (replace with your actual tests)
- ✅ 1 default branch (update with your info)
- ✅ 1 default signatory (update with your info)
- ❌ NO test data
- ❌ NO sample visits
- ❌ NO B2B clients (add as needed)

### Default Credentials:
**⚠️ CHANGE THESE IMMEDIATELY AFTER DEPLOYMENT!**

**Staff Users** (Password: `ChangeMe@123`):
- `sudo` / `ChangeMe@123` (SUDO role)
- `admin` / `ChangeMe@123` (ADMIN role)

### Setup Commands:
```bash
# Using Docker
podman-compose -f docker-compose.prod.yml up -d

# Wait for database to be ready
sleep 10

# Verify setup
podman exec lms-postgres-prod psql -U lms_user -d lms_slncity -c "SELECT COUNT(*) FROM users;"
```

### Post-Deployment Checklist:
- [ ] Change all default passwords
- [ ] Add your actual test templates
- [ ] Update branch information
- [ ] Update signatory information
- [ ] Add B2B clients as needed
- [ ] Configure SSL certificates
- [ ] Set up firewall rules
- [ ] Configure backup schedule
- [ ] Set up monitoring and alerts
- [ ] Test all functionality

---

## 🔄 Resetting Database

### Development:
```bash
# Stop and remove container
podman stop lms-postgres-dev
podman rm lms-postgres-dev
podman volume rm lms-slncity-v1_postgres_dev_data

# Restart with fresh data
podman-compose -f docker-compose.dev.yml up -d
```

### Production:
```bash
# ⚠️ WARNING: This will delete ALL data!
podman stop lms-postgres-prod
podman rm lms-postgres-prod
podman volume rm lms-slncity-v1_postgres_prod_data

# Restart with fresh data
podman-compose -f docker-compose.prod.yml up -d
```

---

## 🔍 Troubleshooting

### Login Not Working?

**Problem**: Users can't log in after restarting database

**Solution**: The password hashes might be incorrect. Run:
```bash
# For development
podman exec lms-postgres-dev psql -U lms_user -d lms_slncity -c "
UPDATE users SET password_hash = '\$2a\$10\$RZHRKSweExF8e6RaEFfEGe3RfHZtYSPsybDIfDZSZEz6JAZn7DVmi' 
WHERE username IN ('sudo', 'admin');
"

# Test login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"sudo","password":"Password123"}'
```

### Database Connection Failed?

**Problem**: Backend can't connect to database

**Solution**: Check if PostgreSQL is running:
```bash
podman ps | grep postgres
podman logs lms-postgres-dev
```

### Port Already in Use?

**Problem**: Port 5433 (dev) or 5432 (prod) already in use

**Solution**: 
```bash
# Find what's using the port
lsof -i :5433

# Stop the process or change the port in docker-compose
```

---

## 📊 Database Schema

The database includes:
- **Users & Authentication**: users, role_permissions
- **Test Management**: test_templates, antibiotics
- **Client Management**: clients, client_prices, b2b_client_logins
- **Patient Management**: patients, referral_doctors
- **Visit Management**: visits, visit_tests
- **Financial**: ledger_entries
- **Audit & Compliance**: audit_logs, audit_log_retention_policies, audit_log_cleanup_history, patient_report_access_logs
- **Configuration**: branches, signatories

---

## 🔐 Security Notes

### Development:
- Uses simple passwords for convenience
- All test data is publicly known
- **DO NOT use in production!**

### Production:
- Default passwords MUST be changed
- Use strong passwords (min 12 characters, mixed case, numbers, symbols)
- Enable SSL/TLS for database connections
- Restrict database access to backend server only
- Set up regular backups
- Enable audit logging
- Monitor for suspicious activity

---

## 📝 Maintenance

### Backup Database:
```bash
# Development
podman exec lms-postgres-dev pg_dump -U lms_user lms_slncity > backup-dev-$(date +%Y%m%d).sql

# Production
podman exec lms-postgres-prod pg_dump -U lms_user lms_slncity > backup-prod-$(date +%Y%m%d).sql
```

### Restore Database:
```bash
# Development
podman exec -i lms-postgres-dev psql -U lms_user -d lms_slncity < backup-dev-20241105.sql

# Production
podman exec -i lms-postgres-prod psql -U lms_user -d lms_slncity < backup-prod-20241105.sql
```

---

## 🆘 Support

If you encounter issues:
1. Check the logs: `podman logs lms-postgres-dev`
2. Verify database is running: `podman ps`
3. Test connection: `podman exec lms-postgres-dev psql -U lms_user -d lms_slncity -c "SELECT 1;"`
4. Check this README for troubleshooting steps


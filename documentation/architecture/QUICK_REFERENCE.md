# 🏥 LMS SLNCity - Quick Reference Guide

**Sri Lakshmi Narasimha City Diagnostic Center**

---

## 🚀 Quick Start

### Start the Application

**Option 1: Using Scripts**
```bash
# Start all services (database, backend, frontend)
./start-all.sh
```

**Option 2: Manual Start**
```bash
# Terminal 1: Start Database
podman start lms-postgres

# Terminal 2: Start Backend
cd server && npm run dev

# Terminal 3: Start Frontend
npm run dev
```

**Access URLs**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5001
- Database: localhost:5432

---

## 👥 Default Users

| Username | Password | Role | Purpose |
|----------|----------|------|---------|
| `sudo` | `sudo123` | SUDO | Full system access |
| `admin` | `admin123` | ADMIN | Administrative tasks |
| `reception` | `reception123` | RECEPTION | Patient registration |
| `phlebo` | `phlebo123` | PHLEBOTOMY | Sample collection |
| `labtech` | `labtech123` | LAB | Result entry |
| `approver` | `approver123` | APPROVER | Result approval |

---

## 📋 Common Tasks

### 1. Register a New Patient & Create Visit
```
1. Login as RECEPTION
2. Click "New Visit"
3. Search patient by phone/name OR click "New Patient"
4. Fill patient details
5. Select tests from left panel (double-click to add)
6. Review selected tests on right panel
7. Enter payment details
8. Click "Register Visit"
9. Print receipt with QR code
```

### 2. Collect Sample
```
1. Login as PHLEBOTOMY
2. Go to "Phlebotomy" section
3. Find patient in pending list
4. Click "Collect Sample"
5. Verify sample type
6. Mark as collected
```

### 3. Enter Test Results
```
1. Login as LAB
2. Go to "Laboratory" section
3. Select test from queue
4. Enter results based on test type:
   - Single Value: Enter one result
   - Multi-Parameter: Enter all parameters
   - Culture: Enter organism + sensitivity
5. Click "Save Results"
6. Click "Submit for Approval"
```

### 4. Approve Results
```
1. Login as APPROVER
2. Go to "Approver" section
3. Review test results
4. Check against normal ranges
5. Decision:
   - Click "Approve" → Ready for printing
   - Click "Reject" → Enter reason, back to lab
```

### 5. Print Report
```
1. Login as any role with access
2. Go to "Reports" or search by visit code
3. Click "View Report"
4. Review report
5. Click "Print" or "Download PDF"
```

### 6. Manage B2B Client
```
1. Login as ADMIN
2. Go to "Admin Panel" → "B2B Clients"
3. Click "Add Client"
4. Fill client details:
   - Name, type, contact
   - Credit limit, credit period
   - Portal login credentials
5. Click "Save"
6. Set custom pricing (optional)
```

### 7. Record B2B Payment
```
1. Login as ADMIN
2. Go to "B2B Financial Management"
3. Find client in list
4. Click "Settle"
5. Enter payment amount and mode
6. Click "Confirm Settlement"
```

### 8. Add New User
```
1. Login as ADMIN
2. Go to "Admin Panel" → "User Management"
3. Click "Add User"
4. Fill username, password, role
5. Click "Create User"
6. Click "Edit Permissions" to customize
7. Upload signature (if APPROVER role)
```

### 9. Create Test Template
```
1. Login as ADMIN
2. Go to "Admin Panel" → "Test Templates"
3. Click "Add Test"
4. Fill details:
   - Name, code, department
   - Sample type, TAT, price
   - Test type (Single/Multi/Culture)
   - Parameters, units, normal ranges
5. Click "Save"
```

### 10. View Audit Logs
```
1. Login as SUDO or ADMIN
2. Go to "Admin Panel" → "Audit Logs"
3. Filter by:
   - Date range
   - User
   - Action type
4. View detailed logs
5. Export if needed
```

---

## 🔑 Permission Quick Reference

### What Each Role Can Do

**SUDO (Super Admin)**
- ✅ Everything (all permissions)
- ✅ Cannot be deleted or edited

**ADMIN**
- ✅ User management (except SUDO)
- ✅ Test templates
- ✅ B2B clients
- ✅ Pricing
- ✅ Audit logs
- ❌ Cannot edit approved reports

**RECEPTION**
- ✅ Patient registration
- ✅ Visit creation
- ✅ Payment collection
- ❌ Cannot access other modules

**PHLEBOTOMY**
- ✅ Sample collection
- ✅ View pending samples
- ❌ Cannot enter results

**LAB (Lab Technician)**
- ✅ Result entry
- ✅ View test queue
- ❌ Cannot approve results

**APPROVER (Pathologist)**
- ✅ Result approval/rejection
- ✅ Digital signature on reports
- ❌ Cannot enter results

---

## 🗄️ Database Quick Reference

### Key Tables

**patients** - Patient demographics
**visits** - Patient visits/registrations
**visit_tests** - Tests linked to visits
**test_templates** - Available tests catalog
**users** - System users (staff)
**user_permissions** - Custom user permissions
**clients** - B2B corporate clients
**client_ledger** - B2B financial transactions
**result_rejections** - Rejected results tracking
**audit_logs** - System audit trail

### Test Status Flow
```
PENDING → IN_PROGRESS → AWAITING_APPROVAL → APPROVED
                              ↓
                          REJECTED → IN_PROGRESS
```

### Transaction Types (B2B)
- **INVOICE** - New visit charges
- **PAYMENT** - Payment received
- **CREDIT_NOTE** - Refunds/discounts
- **DEBIT_NOTE** - Additional charges
- **OPENING_BALANCE** - Initial balance

---

## 🔧 Troubleshooting

### Database Not Starting
```bash
# Check if container exists
podman ps -a | grep lms-postgres

# Start container
podman start lms-postgres

# Check logs
podman logs lms-postgres
```

### Backend Not Starting
```bash
# Check Node version (should be 18+)
node --version

# Install dependencies
cd server && npm install

# Check environment variables
cat server/.env

# Start with logs
cd server && npm run dev
```

### Frontend Not Starting
```bash
# Check Node version
node --version

# Install dependencies
npm install

# Clear cache
rm -rf node_modules/.vite

# Start
npm run dev
```

### Permission Errors
```bash
# Reset database permissions
cd server
psql -h localhost -p 5433 -U lms_user -d lms_slncity -f db/add-role-permissions.sql
```

### Signature Not Showing
```bash
# Check if file exists
ls -la server/public/signatures/

# Check backend CORS settings
# Should have: crossOriginResourcePolicy: { policy: "cross-origin" }

# Restart backend
cd server && npm run dev
```

---

## 📊 Database Maintenance

### Backup Database
```bash
# Full backup
podman exec lms-postgres pg_dump -U lms_user lms_slncity > backup_$(date +%Y%m%d).sql

# Backup with compression
podman exec lms-postgres pg_dump -U lms_user lms_slncity | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restore Database
```bash
# Restore from backup
podman exec -i lms-postgres psql -U lms_user lms_slncity < backup_20250108.sql

# Restore from compressed backup
gunzip -c backup_20250108.sql.gz | podman exec -i lms-postgres psql -U lms_user lms_slncity
```

### Run Migration
```bash
cd server
psql -h localhost -p 5433 -U lms_user -d lms_slncity -f db/migrations/006_add_user_permissions.sql
```

### Clean Old Audit Logs (Login logs older than 90 days)
```bash
cd server
psql -h localhost -p 5433 -U lms_user -d lms_slncity -c "DELETE FROM audit_logs WHERE action = 'LOGIN' AND created_at < NOW() - INTERVAL '90 days';"
```

---

## 🌐 API Testing

### Test Authentication
```bash
# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"sudo","password":"sudo123"}'

# Response: {"token":"eyJhbGc...","user":{...}}
```

### Test API with Token
```bash
# Get all users
curl http://localhost:5001/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📱 Client Portal Access

### B2B Client Login
```
URL: http://localhost:5173/client-login
Username: [client username]
Password: [client password]
```

### Client Portal Features
- View outstanding balance
- View transaction history
- Request new visits
- Download reports

---

## 🎯 Performance Tips

### Speed Up Database Queries
- Indexes already created on key columns
- Use visit_code for quick lookups
- Filter by date range for large datasets

### Optimize Frontend
- Clear browser cache regularly
- Use Chrome/Firefox for best performance
- Close unused tabs

### Backend Performance
- Rate limiting: 100 requests per 15 minutes
- Connection pooling enabled
- JWT tokens cached

---

## 📞 Quick Commands Cheat Sheet

```bash
# Start everything
./start-all.sh

# Stop everything
podman stop lms-postgres
# Ctrl+C in backend terminal
# Ctrl+C in frontend terminal

# View logs
podman logs lms-postgres          # Database logs
cd server && npm run dev          # Backend logs (verbose)
npm run dev                       # Frontend logs

# Database access
psql -h localhost -p 5433 -U lms_user -d lms_slncity

# Git commands
git status                        # Check changes
git add -A                        # Stage all changes
git commit -m "message"           # Commit
git push                          # Push to GitHub

# Run tests
cd server && npm test             # Backend tests
npx playwright test               # Frontend E2E tests
```

---

## 📚 Documentation Files

1. **QUICK_REFERENCE.md** (this file) - Quick reference guide
2. **SYSTEM_FEATURES_DOCUMENTATION.md** - Complete feature documentation
3. **SECURITY_DOCUMENTATION.md** - Security details
4. **DATABASE_SCHEMA_REVIEW.md** - Database design
5. **CLOUD_DEPLOYMENT_SPECS.md** - Cloud deployment guide
6. **BUDGET_DEPLOYMENT_OPTIONS.md** - Cost-effective deployment
7. **WINDOWS-DEPLOYMENT.md** - Windows deployment guide

---

## 🎉 Quick Stats

- **Total Lines of Code**: ~50,000+
- **Database Tables**: 15+
- **API Endpoints**: 60+
- **User Roles**: 6
- **Permissions**: 18
- **Test Coverage**: 57 tests
- **Documentation Pages**: 7

---

**Need more details?** See `SYSTEM_FEATURES_DOCUMENTATION.md` for comprehensive documentation.

**Ready to deploy?** See `CLOUD_DEPLOYMENT_SPECS.md` or `BUDGET_DEPLOYMENT_OPTIONS.md`.

---

*Last Updated: January 2025*


# Changelog - LMS SLNCity V1

All notable changes to this project are documented in this file.

---

## [Unreleased] - 2025-01-10

### ✨ Added

#### 1. **Referral Doctor Designation Feature**
- Added `designation` field to referral doctors (e.g., "MD, General Physician", "MBBS, Cardiologist")
- **Database Changes:**
  - Added `designation VARCHAR(255)` column to `referral_doctors` table in `init.sql`
  - Updated seed data with sample designations
- **Backend API Changes:**
  - Updated `server/src/routes/referralDoctors.ts` to include `designation` in all CRUD operations
  - Updated `server/src/routes/visits.ts` to include `referred_doctor_designation` in visit queries
- **Frontend Changes:**
  - Updated `context/AppContext.tsx` - Added `designation` to ReferralDoctor interface
  - Updated `types.ts` - Added `referred_doctor_designation` to Visit interface
  - Updated `components/admin/ReferralDoctorManagement.tsx`:
    - Added designation input field in add form
    - Added designation input field in edit mode
    - Added designation column to table display
  - Updated `components/CreateVisitForm.tsx` - Shows designation in referral doctor dropdown
  - Updated `components/CreateVisitFormNew.tsx` - Shows designation in referral doctor dropdown
  - Updated `components/TestReport.tsx` - Displays designation next to doctor name in reports

#### 2. **Searchable Dropdown Components**
- Created reusable `SearchableSelect` component (`components/form/SearchableSelect.tsx`)
- **Features:**
  - Real-time search/filter functionality
  - Keyboard navigation (Arrow keys, Enter, Escape)
  - Category grouping support (for units)
  - Click outside to close
  - Responsive design
- **Applied to:**
  - Units dropdown in Test Template management (with category grouping)
  - Referral Doctor dropdown in Create Visit forms
  - B2B Client dropdown in Create Visit forms

#### 3. **Unit Management System**
- Complete unit management system for measurement units
- **Database:**
  - Added `units` table with 38 pre-populated measurement units
  - Categories: Volume, Mass, Concentration, Count, Time, Ratio, Percentage, etc.
- **Backend:**
  - Created `server/src/routes/units.ts` with full CRUD operations
  - Endpoints: GET all, GET active, GET by ID, POST, PATCH, DELETE
- **Frontend:**
  - Created `components/admin/UnitManagement.tsx` for admin management
  - Updated test template forms to use unit dropdowns instead of text input
  - Units display in test reports

#### 4. **AWS Deployment Documentation**
- Created comprehensive `AWS_DEPLOYMENT_GUIDE.md`
- **Includes:**
  - Step-by-step EC2 setup instructions
  - RDS PostgreSQL configuration
  - Docker deployment guide
  - Security group configuration
  - SSL certificate setup
  - Monitoring and backup procedures
  - Cost estimation
  - Troubleshooting guide

### 🐛 Fixed

#### 1. **Audit Logs Error**
- **Issue:** Audit logs API was failing with "column does not exist" error
- **Root Cause:** Query was selecting `old_values` and `new_values` columns that don't exist in the database schema
- **Fix:** Removed non-existent columns from SELECT query in `server/src/routes/auditLogs.ts`
- **File Changed:** `server/src/routes/auditLogs.ts` (lines 22-36)

#### 2. **Duplicate "Dr." Prefix in Reports**
- **Issue:** Reports were showing "Dr. Dr. Name" when doctor name already contained "Dr." prefix
- **Fix:** Removed automatic "Dr." prefix concatenation in `components/TestReport.tsx`
- **Now:** Displays doctor name as-is from database (e.g., "Dr. Suresh Reddy, MD, General Physician")

#### 3. **Microbiology Report Layout Optimization**
- **Issue:** Microbiology reports were wasting space by showing test name row and parameter headers before Culture & Sensitivity report
- **Fix:** Updated `components/TestReport.tsx` to skip test name row for microbiology tests
- **Result:** Culture & Sensitivity report now starts immediately, saving vertical space

#### 4. **Units Not Loading in Test Templates**
- **Issue:** Units dropdown was showing "Loading units..." indefinitely
- **Root Cause:** Frontend container was using cached build without latest code changes
- **Fix:** Rebuilt frontend container with `--no-cache` flag to ensure latest code is included

### 🔄 Changed

#### 1. **Database Schema Updates**
- Added `designation` column to `referral_doctors` table
- Updated `init.sql` to include designation field
- Updated seed data files with sample designations

#### 2. **API Response Format**
- Referral doctors API now returns designation field:
  ```json
  {
    "id": 5,
    "name": "Dr. Suresh Reddy",
    "designation": "MD, General Physician"
  }
  ```
- Visits API now includes `referred_doctor_designation` field

#### 3. **UI/UX Improvements**
- Referral doctor dropdowns now show: "Dr. Name, Designation"
- Test reports show doctor designation next to name
- Searchable dropdowns improve usability for large lists
- Microbiology reports are more compact and readable

### 📝 Documentation

#### 1. **AWS Deployment Guide**
- Complete step-by-step deployment instructions
- Architecture diagram
- Security best practices
- Cost estimation
- Maintenance procedures

#### 2. **Changelog**
- Comprehensive changelog documenting all changes
- Organized by category (Added, Fixed, Changed, etc.)
- Includes file paths and line numbers for technical reference

---

## Database Migrations

### Migration: Add Designation to Referral Doctors

```sql
-- Add designation column
ALTER TABLE referral_doctors 
ADD COLUMN IF NOT EXISTS designation VARCHAR(255);

-- Update existing records (optional)
UPDATE referral_doctors 
SET designation = 'MD, General Physician' 
WHERE name = 'Dr. Suresh Reddy';

UPDATE referral_doctors 
SET designation = 'MBBS, Cardiologist' 
WHERE name = 'Dr. Lakshmi Devi';

UPDATE referral_doctors 
SET designation = 'MD, Pediatrician' 
WHERE name = 'Dr. Venkat Rao';
```

**Status:** ✅ Applied to development database
**Date:** 2025-01-10

---

## Files Changed

### Backend Files
1. `server/db/init.sql` - Added designation column to referral_doctors table
2. `server/db/seed-development.sql` - Added sample designations
3. `server/src/routes/referralDoctors.ts` - Updated all endpoints to handle designation
4. `server/src/routes/visits.ts` - Updated queries to include designation
5. `server/src/routes/auditLogs.ts` - Fixed column selection query
6. `server/src/routes/units.ts` - Created unit management endpoints

### Frontend Files
1. `context/AppContext.tsx` - Added designation to ReferralDoctor interface
2. `types.ts` - Added referred_doctor_designation to Visit interface
3. `components/admin/ReferralDoctorManagement.tsx` - Added designation input and display
4. `components/CreateVisitForm.tsx` - Updated dropdown to show designation
5. `components/CreateVisitFormNew.tsx` - Updated dropdown to show designation
6. `components/TestReport.tsx` - Fixed duplicate "Dr." and added designation display, optimized microbiology layout
7. `components/form/SearchableSelect.tsx` - Created reusable searchable dropdown component
8. `components/admin/TestTemplateFormModal.tsx` - Applied SearchableSelect to units dropdown
9. `components/admin/UnitManagement.tsx` - Created unit management interface

### Documentation Files
1. `AWS_DEPLOYMENT_GUIDE.md` - Created comprehensive deployment guide
2. `CHANGELOG.md` - Created this changelog

---

## Testing Checklist

### ✅ Completed Tests

- [x] Referral doctor designation shows in management table
- [x] Designation can be added when creating new referral doctor
- [x] Designation can be edited for existing referral doctors
- [x] Designation shows in referral doctor dropdown (Create Visit forms)
- [x] Designation shows in test reports next to doctor name
- [x] No duplicate "Dr." prefix in reports
- [x] Audit logs API working without errors
- [x] Microbiology reports show Culture & Sensitivity directly
- [x] Searchable dropdowns work for units, referral doctors, and B2B clients
- [x] Units load properly in test template forms
- [x] All containers build and run successfully

### 🔄 Pending Tests (Production)

- [ ] Test on AWS EC2 instance
- [ ] Test with RDS PostgreSQL
- [ ] Load testing with multiple concurrent users
- [ ] SSL certificate installation and HTTPS access
- [ ] Backup and restore procedures
- [ ] Monitoring and alerting setup

---

## Known Issues

### None at this time

All reported issues have been resolved in this release.

---

## Upgrade Instructions

### From Previous Version

1. **Backup Database:**
   ```bash
   podman exec lms-postgres pg_dump -U lms_user -d lms_slncity > backup_$(date +%Y%m%d).sql
   ```

2. **Pull Latest Changes:**
   ```bash
   git pull origin main
   ```

3. **Run Database Migration:**
   ```bash
   podman exec lms-postgres psql -U lms_user -d lms_slncity -c "ALTER TABLE referral_doctors ADD COLUMN IF NOT EXISTS designation VARCHAR(255);"
   ```

4. **Rebuild Containers:**
   ```bash
   podman-compose down
   podman-compose build --no-cache
   podman-compose up -d
   ```

5. **Verify Deployment:**
   ```bash
   # Check containers
   podman ps
   
   # Check backend health
   curl http://localhost:5002/health
   
   # Check frontend
   curl http://localhost:3000
   ```

6. **Test Application:**
   - Login with admin credentials
   - Test referral doctor management
   - Test visit creation with referral doctor
   - Generate and verify test report
   - Check audit logs

---

## Contributors

- **Development Team:** LMS SLNCity Development Team
- **Testing:** QA Team
- **Documentation:** Technical Writing Team

---

## Support

For issues, questions, or feature requests:
- **GitHub Issues:** https://github.com/LMS-SLNCity/LMS-SLNCity-V1/issues
- **Email:** support@slncity.com
- **Documentation:** See README.md and AWS_DEPLOYMENT_GUIDE.md

---

**Last Updated:** 2025-01-10
**Version:** 1.0.0-beta


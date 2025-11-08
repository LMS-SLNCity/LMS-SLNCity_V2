-- ============================================================================
-- SCHEMA IMPROVEMENTS - HIGH PRIORITY
-- Purpose: Add missing indexes, constraints, and fields for better performance
-- Date: 2025-11-08
-- ============================================================================

-- ============================================================================
-- 1. ADD INDEXES ON PATIENTS TABLE (HIGH PRIORITY)
-- Purpose: Improve patient search performance
-- ============================================================================

-- Index on phone for search queries (only non-null values)
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone) WHERE phone IS NOT NULL;

-- Index on name for search queries
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);

-- Index on lowercase name for case-insensitive search
CREATE INDEX IF NOT EXISTS idx_patients_name_lower ON patients(LOWER(name));

-- Index on email for search queries (only non-null values)
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email) WHERE email IS NOT NULL;

COMMENT ON INDEX idx_patients_phone IS 'Improves patient search by phone number';
COMMENT ON INDEX idx_patients_name IS 'Improves patient search by name';
COMMENT ON INDEX idx_patients_name_lower IS 'Improves case-insensitive patient search by name';

-- ============================================================================
-- 2. ADD VISIT STATUS FIELD (HIGH PRIORITY)
-- Purpose: Track overall visit workflow status
-- ============================================================================

-- Add status column to visits table
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE' 
CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED'));

-- Create index for efficient status queries
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);

-- Update existing visits to ACTIVE status
UPDATE visits SET status = 'ACTIVE' WHERE status IS NULL;

COMMENT ON COLUMN visits.status IS 'Overall visit status: ACTIVE (in progress), COMPLETED (all tests done), CANCELLED (visit cancelled)';

-- ============================================================================
-- 3. ADD ON DELETE RESTRICT TO TEST TEMPLATE REFERENCE (HIGH PRIORITY)
-- Purpose: Prevent deletion of test templates that are used in visits
-- ============================================================================

-- Drop existing foreign key constraint
ALTER TABLE visit_tests 
DROP CONSTRAINT IF EXISTS visit_tests_test_template_id_fkey;

-- Add new constraint with ON DELETE RESTRICT
ALTER TABLE visit_tests 
ADD CONSTRAINT visit_tests_test_template_id_fkey 
FOREIGN KEY (test_template_id) 
REFERENCES test_templates(id) 
ON DELETE RESTRICT;

COMMENT ON CONSTRAINT visit_tests_test_template_id_fkey ON visit_tests IS 'Prevents deletion of test templates that are used in visits';

-- ============================================================================
-- 4. ADD AGE VALIDATION CONSTRAINTS (MEDIUM PRIORITY)
-- Purpose: Prevent invalid age data entry
-- ============================================================================

-- Add check constraints for age fields
ALTER TABLE patients 
DROP CONSTRAINT IF EXISTS check_age_years,
DROP CONSTRAINT IF EXISTS check_age_months,
DROP CONSTRAINT IF EXISTS check_age_days;

ALTER TABLE patients 
ADD CONSTRAINT check_age_years CHECK (age_years >= 0 AND age_years <= 150),
ADD CONSTRAINT check_age_months CHECK (age_months >= 0 AND age_months < 12),
ADD CONSTRAINT check_age_days CHECK (age_days >= 0 AND age_days < 31);

COMMENT ON CONSTRAINT check_age_years ON patients IS 'Ensures age in years is between 0 and 150';
COMMENT ON CONSTRAINT check_age_months ON patients IS 'Ensures age in months is between 0 and 11';
COMMENT ON CONSTRAINT check_age_days ON patients IS 'Ensures age in days is between 0 and 30';

-- ============================================================================
-- 5. ADD AUTOMATIC UPDATED_AT TRIGGERS (MEDIUM PRIORITY)
-- Purpose: Automatically update updated_at timestamp on record changes
-- ============================================================================

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates updated_at timestamp when a record is modified';

-- Apply trigger to all tables with updated_at column
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_templates_updated_at ON test_templates;
CREATE TRIGGER update_test_templates_updated_at 
BEFORE UPDATE ON test_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_branches_updated_at ON branches;
CREATE TRIGGER update_branches_updated_at 
BEFORE UPDATE ON branches
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_antibiotics_updated_at ON antibiotics;
CREATE TRIGGER update_antibiotics_updated_at 
BEFORE UPDATE ON antibiotics
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at 
BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_prices_updated_at ON client_prices;
CREATE TRIGGER update_client_prices_updated_at 
BEFORE UPDATE ON client_prices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
CREATE TRIGGER update_patients_updated_at 
BEFORE UPDATE ON patients
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_referral_doctors_updated_at ON referral_doctors;
CREATE TRIGGER update_referral_doctors_updated_at 
BEFORE UPDATE ON referral_doctors
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_signatories_updated_at ON signatories;
CREATE TRIGGER update_signatories_updated_at 
BEFORE UPDATE ON signatories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_visits_updated_at ON visits;
CREATE TRIGGER update_visits_updated_at 
BEFORE UPDATE ON visits
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_visit_tests_updated_at ON visit_tests;
CREATE TRIGGER update_visit_tests_updated_at 
BEFORE UPDATE ON visit_tests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_b2b_client_logins_updated_at ON b2b_client_logins;
CREATE TRIGGER update_b2b_client_logins_updated_at 
BEFORE UPDATE ON b2b_client_logins
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_role_permissions_updated_at ON role_permissions;
CREATE TRIGGER update_role_permissions_updated_at 
BEFORE UPDATE ON role_permissions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_audit_log_retention_policies_updated_at ON audit_log_retention_policies;
CREATE TRIGGER update_audit_log_retention_policies_updated_at 
BEFORE UPDATE ON audit_log_retention_policies
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. ADD SOFT DELETE FIELDS (MEDIUM PRIORITY)
-- Purpose: Enable soft delete for critical tables
-- ============================================================================

-- Add soft delete fields to patients table
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

-- Add soft delete fields to visits table
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

-- Add soft delete fields to test_templates table
ALTER TABLE test_templates 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

-- Add soft delete fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

-- Create indexes for soft delete queries
CREATE INDEX IF NOT EXISTS idx_patients_is_deleted ON patients(is_deleted);
CREATE INDEX IF NOT EXISTS idx_visits_is_deleted ON visits(is_deleted);
CREATE INDEX IF NOT EXISTS idx_test_templates_is_deleted ON test_templates(is_deleted);
CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON users(is_deleted);

COMMENT ON COLUMN patients.is_deleted IS 'Soft delete flag - true if patient record is deleted';
COMMENT ON COLUMN visits.is_deleted IS 'Soft delete flag - true if visit record is deleted';
COMMENT ON COLUMN test_templates.is_deleted IS 'Soft delete flag - true if test template is deleted';
COMMENT ON COLUMN users.is_deleted IS 'Soft delete flag - true if user is deleted';

-- ============================================================================
-- 7. CREATE VIEWS FOR ACTIVE RECORDS (MEDIUM PRIORITY)
-- Purpose: Easy querying of non-deleted records
-- ============================================================================

-- View for active patients
CREATE OR REPLACE VIEW active_patients AS
SELECT * FROM patients WHERE is_deleted = false;

-- View for active visits
CREATE OR REPLACE VIEW active_visits AS
SELECT * FROM visits WHERE is_deleted = false;

-- View for active test templates
CREATE OR REPLACE VIEW active_test_templates AS
SELECT * FROM test_templates WHERE is_deleted = false;

-- View for active users
CREATE OR REPLACE VIEW active_users AS
SELECT * FROM users WHERE is_deleted = false;

COMMENT ON VIEW active_patients IS 'Shows only non-deleted patient records';
COMMENT ON VIEW active_visits IS 'Shows only non-deleted visit records';
COMMENT ON VIEW active_test_templates IS 'Shows only non-deleted test template records';
COMMENT ON VIEW active_users IS 'Shows only non-deleted user records';

-- ============================================================================
-- 8. ADD ADDITIONAL USEFUL FIELDS (LOW PRIORITY)
-- Purpose: Enhance data tracking and management
-- ============================================================================

-- Add notes field to visits table
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN visits.notes IS 'Internal notes about the visit (not visible to patient)';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('patients', 'visits', 'visit_tests')
ORDER BY tablename, indexname;

-- Verify constraints were added
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid IN ('patients'::regclass, 'visits'::regclass, 'visit_tests'::regclass)
ORDER BY table_name, constraint_name;

-- Verify triggers were created
SELECT
    trigger_name,
    event_object_table AS table_name,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%updated_at%'
ORDER BY table_name, trigger_name;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================


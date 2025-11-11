-- ============================================================================
-- COMPREHENSIVE SCHEMA UPDATE TO MATCH LOCAL DEVELOPMENT
-- Purpose: Update VM database to include all features from local development
-- ============================================================================

-- ============================================================================
-- 1. UPDATE RESULT_REJECTIONS TABLE
-- ============================================================================

-- Drop old result_rejections table if it exists (old structure)
DROP TABLE IF EXISTS result_rejections CASCADE;

-- Create new result_rejections table with complete structure
CREATE TABLE result_rejections (
    id SERIAL PRIMARY KEY,
    visit_test_id INTEGER NOT NULL REFERENCES visit_tests(id) ON DELETE CASCADE,
    rejected_by_user_id INTEGER NOT NULL REFERENCES users(id),
    rejected_by_username VARCHAR(255) NOT NULL,
    rejection_reason TEXT NOT NULL,
    old_results JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_CORRECTION' CHECK (status IN ('PENDING_CORRECTION', 'CORRECTED', 'RESOLVED')),
    resolved_by_user_id INTEGER REFERENCES users(id),
    resolved_by_username VARCHAR(255),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_result_rejections_visit_test_id ON result_rejections(visit_test_id);
CREATE INDEX IF NOT EXISTS idx_result_rejections_status ON result_rejections(status);

COMMENT ON TABLE result_rejections IS 'Tracks result rejections by approvers with comments for lab technicians';

-- ============================================================================
-- 2. ADD REJECTION TRACKING TO VISIT_TESTS
-- ============================================================================

-- Add rejection tracking columns to visit_tests
ALTER TABLE visit_tests
ADD COLUMN IF NOT EXISTS rejection_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_rejection_at TIMESTAMP;

-- ============================================================================
-- 3. ENHANCE AUDIT_LOGS TABLE
-- ============================================================================

-- Add resource tracking columns to audit_logs
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS resource_id INTEGER,
ADD COLUMN IF NOT EXISTS old_value TEXT,
ADD COLUMN IF NOT EXISTS new_value TEXT,
ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL'));

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);

-- ============================================================================
-- 4. PATIENT EDIT REQUESTS TABLE
-- ============================================================================

-- Create patient_edit_requests table if not exists
CREATE TABLE IF NOT EXISTS patient_edit_requests (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    requested_by_user_id INTEGER NOT NULL REFERENCES users(id),
    requested_by_username VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approved_by_user_id INTEGER REFERENCES users(id),
    approved_by_username VARCHAR(255),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_patient_edit_requests_visit_id ON patient_edit_requests(visit_id);
CREATE INDEX IF NOT EXISTS idx_patient_edit_requests_status ON patient_edit_requests(status);

COMMENT ON TABLE patient_edit_requests IS 'Tracks patient information edit requests requiring admin approval';

-- ============================================================================
-- 5. ADD PATIENT CODE COLUMN
-- ============================================================================

-- Add patient_code to patients table
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS patient_code VARCHAR(50) UNIQUE;

-- Create sequence for patient code generation
CREATE SEQUENCE IF NOT EXISTS patient_code_seq START 1 INCREMENT 1;

-- Function to generate patient code
CREATE OR REPLACE FUNCTION generate_patient_code()
RETURNS VARCHAR AS $$
DECLARE
    v_code VARCHAR;
    v_date_part VARCHAR;
    v_seq_num INTEGER;
BEGIN
    -- Get current date in YYYYMMDD format
    v_date_part := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    -- Get next sequence number
    v_seq_num := NEXTVAL('patient_code_seq');
    
    -- Generate code: P{YYYYMMDD}{SEQUENCE}
    v_code := 'P' || v_date_part || LPAD(v_seq_num::TEXT, 4, '0');
    
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate patient code
CREATE OR REPLACE FUNCTION set_patient_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.patient_code IS NULL OR NEW.patient_code = '' THEN
        NEW.patient_code := generate_patient_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS patient_code_trigger ON patients;
CREATE TRIGGER patient_code_trigger
BEFORE INSERT ON patients
FOR EACH ROW
EXECUTE FUNCTION set_patient_code();

-- ============================================================================
-- 6. ADD UNITS TABLE
-- ============================================================================

-- Create units table if not exists
CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    abbreviation VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert common units if table is empty
INSERT INTO units (name, abbreviation, is_active) VALUES
    ('Milligrams per deciliter', 'mg/dL', true),
    ('Grams per deciliter', 'g/dL', true),
    ('Millimoles per liter', 'mmol/L', true),
    ('Micromoles per liter', 'µmol/L', true),
    ('International units per liter', 'IU/L', true),
    ('Units per liter', 'U/L', true),
    ('Cells per microliter', 'cells/µL', true),
    ('Percentage', '%', true),
    ('Seconds', 'sec', true),
    ('Millimeters per hour', 'mm/hr', true),
    ('Picograms', 'pg', true),
    ('Femtoliters', 'fL', true),
    ('Nanograms per milliliter', 'ng/mL', true),
    ('Micrograms per deciliter', 'µg/dL', true),
    ('Milliequivalents per liter', 'mEq/L', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 7. ENSURE WAIVERS TABLE EXISTS
-- ============================================================================

-- Create waivers table if not exists (already in init.sql but ensuring it exists)
CREATE TABLE IF NOT EXISTS waivers (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    waived_amount DECIMAL(12, 2) NOT NULL,
    reason TEXT NOT NULL,
    waived_by VARCHAR(255) NOT NULL,
    waived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_waivers_visit_id ON waivers(visit_id);

-- ============================================================================
-- 8. ADD MISSING INDEXES FOR PERFORMANCE
-- ============================================================================

-- Additional indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_patients_patient_code ON patients(patient_code);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_referral_doctors_name ON referral_doctors(name);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_type ON clients(type);
CREATE INDEX IF NOT EXISTS idx_test_templates_code ON test_templates(code);
CREATE INDEX IF NOT EXISTS idx_test_templates_category ON test_templates(category);
CREATE INDEX IF NOT EXISTS idx_test_templates_is_active ON test_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_visits_registration_datetime ON visits(registration_datetime);
CREATE INDEX IF NOT EXISTS idx_visit_tests_test_template_id ON visit_tests(test_template_id);
CREATE INDEX IF NOT EXISTS idx_visit_tests_collected_at ON visit_tests(collected_at);
CREATE INDEX IF NOT EXISTS idx_visit_tests_approved_at ON visit_tests(approved_at);

-- ============================================================================
-- 9. UPDATE EXISTING DATA
-- ============================================================================

-- Set rejection_count to 0 for existing visit_tests if NULL
UPDATE visit_tests SET rejection_count = 0 WHERE rejection_count IS NULL;

-- Generate patient codes for existing patients without codes
UPDATE patients 
SET patient_code = 'P' || TO_CHAR(created_at, 'YYYYMMDD') || LPAD(id::TEXT, 4, '0')
WHERE patient_code IS NULL OR patient_code = '';

-- ============================================================================
-- 10. VERIFY SCHEMA
-- ============================================================================

-- Output verification message
DO $$
BEGIN
    RAISE NOTICE '✅ Schema update completed successfully!';
    RAISE NOTICE '✅ Result rejections table updated';
    RAISE NOTICE '✅ Visit tests rejection tracking added';
    RAISE NOTICE '✅ Audit logs enhanced';
    RAISE NOTICE '✅ Patient edit requests table created';
    RAISE NOTICE '✅ Patient codes added';
    RAISE NOTICE '✅ Units table created';
    RAISE NOTICE '✅ All indexes created';
    RAISE NOTICE '✅ Database schema is now up to date!';
END $$;


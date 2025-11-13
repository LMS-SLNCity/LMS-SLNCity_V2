-- Create tables for LMS SLNCity Diagnostic Center

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('SUDO', 'ADMIN', 'RECEPTION', 'PHLEBOTOMY', 'LAB', 'APPROVER')),
    is_active BOOLEAN DEFAULT true,
    signature_image_url VARCHAR(500),
    branch_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test Templates table
CREATE TABLE test_templates (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    b2b_price DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('standard', 'culture')),
    parameters JSONB DEFAULT '{"fields": []}',
    default_antibiotic_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    sample_type VARCHAR(100),
    tat_hours INTEGER DEFAULT 24,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Branches table
CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Antibiotics table
CREATE TABLE antibiotics (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    abbreviation VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients table
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('PATIENT', 'REFERRAL_LAB', 'INTERNAL')),
    balance DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client Prices table
CREATE TABLE client_prices (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    test_template_id INTEGER NOT NULL REFERENCES test_templates(id) ON DELETE CASCADE,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, test_template_id)
);

-- Patients table
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    salutation VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    age_years INTEGER NOT NULL,
    age_months INTEGER DEFAULT 0,
    age_days INTEGER DEFAULT 0,
    sex VARCHAR(20) NOT NULL,
    guardian_name VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    email VARCHAR(255),
    clinical_history TEXT,
    patient_code VARCHAR(50) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sequence for patient code generation
CREATE SEQUENCE patient_code_seq START 1 INCREMENT 1;

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

CREATE TRIGGER patient_code_trigger
BEFORE INSERT ON patients
FOR EACH ROW
EXECUTE FUNCTION set_patient_code();

-- Referral Doctors table
CREATE TABLE referral_doctors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Signatories table
CREATE TABLE signatories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sequence for visit code generation
CREATE SEQUENCE visit_code_seq START 1 INCREMENT 1;

-- Visits table
CREATE TABLE visits (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    referred_doctor_id INTEGER REFERENCES referral_doctors(id),
    ref_customer_id INTEGER REFERENCES clients(id),
    other_ref_doctor VARCHAR(255),
    other_ref_customer VARCHAR(255),
    registration_datetime TIMESTAMP,
    visit_code VARCHAR(50) UNIQUE NOT NULL DEFAULT '',
    total_cost DECIMAL(12, 2) NOT NULL,
    amount_paid DECIMAL(12, 2) NOT NULL,
    payment_mode VARCHAR(50),
    due_amount DECIMAL(12, 2) NOT NULL,
    branch_id INTEGER REFERENCES branches(id),
    qr_code_token VARCHAR(500),
    qr_code_generated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Function to generate visit code
CREATE OR REPLACE FUNCTION generate_visit_code()
RETURNS VARCHAR AS $$
DECLARE
    v_code VARCHAR;
    v_date_part VARCHAR;
    v_seq_num INTEGER;
BEGIN
    -- Get current date in YYYYMMDD format
    v_date_part := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

    -- Get next sequence number
    v_seq_num := NEXTVAL('visit_code_seq');

    -- Generate code: V{YYYYMMDD}{SEQUENCE}
    v_code := 'V' || v_date_part || LPAD(v_seq_num::TEXT, 4, '0');

    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate visit code
CREATE OR REPLACE FUNCTION set_visit_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.visit_code = '' OR NEW.visit_code IS NULL THEN
        NEW.visit_code := generate_visit_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER visit_code_trigger
BEFORE INSERT ON visits
FOR EACH ROW
EXECUTE FUNCTION set_visit_code();

-- Visit Tests table
CREATE TABLE visit_tests (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    test_template_id INTEGER NOT NULL REFERENCES test_templates(id),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SAMPLE_COLLECTED', 'REJECTED', 'IN_PROGRESS', 'AWAITING_APPROVAL', 'APPROVED', 'COMPLETED')),
    collected_by VARCHAR(255),
    collected_at TIMESTAMP,
    specimen_type VARCHAR(100),
    results JSONB,
    culture_result JSONB,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    rejection_count INTEGER DEFAULT 0,
    last_rejection_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ledger Entries table
CREATE TABLE ledger_entries (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    visit_id INTEGER REFERENCES visits(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('DEBIT', 'CREDIT')),
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- B2B Client Logins table
CREATE TABLE b2b_client_logins (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id)
);

-- Patient Report Access Logs table
CREATE TABLE patient_report_access_logs (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    access_method VARCHAR(50) NOT NULL CHECK (access_method IN ('QR_CODE', 'PHONE_OTP')),
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Role Permissions table
CREATE TABLE role_permissions (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50) NOT NULL UNIQUE CHECK (role IN ('SUDO', 'ADMIN', 'RECEPTION', 'PHLEBOTOMY', 'LAB', 'APPROVER')),
    permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    username VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT NOT NULL,
    resource VARCHAR(255),
    user_id INTEGER REFERENCES users(id),
    ip_address VARCHAR(45),
    user_agent TEXT,
    resource_id INTEGER,
    old_value TEXT,
    new_value TEXT,
    severity VARCHAR(20) DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL'))
);

-- User Permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);

-- Units table for measurement units
CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    symbol VARCHAR(20) NOT NULL,
    category VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_units_category ON units(category);
CREATE INDEX IF NOT EXISTS idx_units_is_active ON units(is_active);

-- Insert default units
INSERT INTO units (name, symbol, category, description) VALUES
-- Concentration units
('Milligrams per deciliter', 'mg/dL', 'Concentration', 'Common unit for blood chemistry'),
('Grams per deciliter', 'g/dL', 'Concentration', 'Used for protein, hemoglobin'),
('Micrograms per deciliter', 'µg/dL', 'Concentration', 'Used for trace elements'),
('Millimoles per liter', 'mmol/L', 'Concentration', 'SI unit for concentration'),
('Micromoles per liter', 'µmol/L', 'Concentration', 'SI unit for small concentrations'),
('Nanograms per milliliter', 'ng/mL', 'Concentration', 'Used for hormones, vitamins'),
('Picograms per milliliter', 'pg/mL', 'Concentration', 'Used for very small concentrations'),
('Milligrams per liter', 'mg/L', 'Concentration', 'Alternative concentration unit'),
('Micrograms per liter', 'µg/L', 'Concentration', 'Used for trace elements'),

-- Count units
('Cells per microliter', 'cells/µL', 'Count', 'Used for blood cell counts'),
('Thousands per microliter', '10³/µL', 'Count', 'Used for WBC, platelet counts'),
('Millions per microliter', '10⁶/µL', 'Count', 'Used for RBC counts'),
('Lakhs per cubic millimeter', 'lakhs/mm³', 'Count', 'Indian unit for cell counts'),
('Cells per cubic millimeter', 'cells/mm³', 'Count', 'Alternative cell count unit'),
('Colony forming units per milliliter', 'CFU/mL', 'Count', 'Used for bacterial counts'),

-- Volume units
('Milliliters', 'mL', 'Volume', 'Common volume unit'),
('Liters', 'L', 'Volume', 'Larger volume unit'),
('Microliters', 'µL', 'Volume', 'Small volume unit'),
('Femtoliters', 'fL', 'Volume', 'Used for cell volumes (MCV)'),

-- Mass units
('Grams', 'g', 'Mass', 'Standard mass unit'),
('Milligrams', 'mg', 'Mass', 'Small mass unit'),
('Micrograms', 'µg', 'Mass', 'Very small mass unit'),
('Picograms', 'pg', 'Mass', 'Used for MCH'),

-- Percentage and ratio
('Percentage', '%', 'Ratio', 'Used for percentages'),
('Ratio', 'ratio', 'Ratio', 'Used for ratios'),

-- Time units
('Seconds', 'sec', 'Time', 'Used for clotting times'),
('Minutes', 'min', 'Time', 'Used for various tests'),
('Hours', 'hr', 'Time', 'Used for glucose tolerance'),

-- Activity units
('Units per liter', 'U/L', 'Activity', 'Enzyme activity'),
('International units per liter', 'IU/L', 'Activity', 'International enzyme units'),
('Millimeters per hour', 'mm/hr', 'Activity', 'Used for ESR'),

-- Other units
('pH units', 'pH', 'Other', 'Acidity/alkalinity'),
('Milliosmoles per kilogram', 'mOsm/kg', 'Other', 'Osmolality'),
('Milliequivalents per liter', 'mEq/L', 'Other', 'Electrolyte concentration'),
('Micrograms per gram creatinine', 'µg/g Cr', 'Other', 'Urine analyte concentration'),
('Milligrams per gram creatinine', 'mg/g Cr', 'Other', 'Urine protein concentration'),
('Milligrams per 24 hours', 'mg/24h', 'Other', 'Urine collection measurement'),
('Grams per 24 hours', 'g/24h', 'Other', 'Urine collection measurement')
ON CONFLICT (name) DO NOTHING;

-- Approvers table
CREATE TABLE IF NOT EXISTS approvers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_category VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, test_category)
);

CREATE INDEX IF NOT EXISTS idx_approvers_user_id ON approvers(user_id);
CREATE INDEX IF NOT EXISTS idx_approvers_test_category ON approvers(test_category);
CREATE INDEX IF NOT EXISTS idx_approvers_is_active ON approvers(is_active);

-- Patient Edit Requests table
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

-- Result Rejections table
CREATE TABLE IF NOT EXISTS result_rejections (
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

-- Waivers table
CREATE TABLE IF NOT EXISTS waivers (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    waived_amount DECIMAL(12, 2) NOT NULL,
    reason TEXT NOT NULL,
    waived_by VARCHAR(255) NOT NULL,
    waived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_waivers_visit_id ON waivers(visit_id);

-- Create indexes for better query performance
CREATE INDEX idx_visits_patient_id ON visits(patient_id);
CREATE INDEX idx_visits_visit_code ON visits(visit_code);
CREATE INDEX idx_visits_branch_id ON visits(branch_id);
CREATE INDEX idx_visits_qr_code_token ON visits(qr_code_token);
CREATE INDEX IF NOT EXISTS idx_visits_registration_datetime ON visits(registration_datetime);
CREATE INDEX idx_visit_tests_visit_id ON visit_tests(visit_id);
CREATE INDEX idx_visit_tests_status ON visit_tests(status);
CREATE INDEX IF NOT EXISTS idx_visit_tests_test_template_id ON visit_tests(test_template_id);
CREATE INDEX IF NOT EXISTS idx_visit_tests_collected_at ON visit_tests(collected_at);
CREATE INDEX IF NOT EXISTS idx_visit_tests_approved_at ON visit_tests(approved_at);
CREATE INDEX idx_client_prices_client_id ON client_prices(client_id);
CREATE INDEX idx_ledger_entries_client_id ON ledger_entries(client_id);
CREATE INDEX idx_b2b_client_logins_client_id ON b2b_client_logins(client_id);
CREATE INDEX idx_patient_report_access_logs_visit_id ON patient_report_access_logs(visit_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
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

-- ============================================================================
-- AUDIT LOG RETENTION POLICIES AND CLEANUP
-- Purpose: Implement NABL-compliant audit logging with retention policies
-- ============================================================================

-- Add retention policy fields to audit_logs table
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS retention_category VARCHAR(50) DEFAULT 'PERMANENT' CHECK (retention_category IN ('LOGIN', 'PERMANENT')),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_retention ON audit_logs(retention_category, expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_timestamp ON audit_logs(action, timestamp);

-- Create audit_log_retention_policies table
CREATE TABLE IF NOT EXISTS audit_log_retention_policies (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) UNIQUE NOT NULL,
    retention_days INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default retention policies (NABL ISO 15189 compliant)
INSERT INTO audit_log_retention_policies (category, retention_days, description) VALUES
('LOGIN', 90, 'Login and authentication logs - retained for 90 days for security monitoring'),
('PERMANENT', -1, 'All other audit logs - retained permanently as per NABL ISO 15189 requirements')
ON CONFLICT (category) DO NOTHING;

-- Create function to automatically set expiry date based on retention policy
CREATE OR REPLACE FUNCTION set_audit_log_expiry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.retention_category = 'LOGIN' THEN
        -- Set expiry to 90 days from now for login logs
        NEW.expires_at := NEW.timestamp + INTERVAL '90 days';
    ELSE
        -- Permanent logs never expire
        NEW.expires_at := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set expiry on insert
DROP TRIGGER IF EXISTS trigger_set_audit_log_expiry ON audit_logs;
CREATE TRIGGER trigger_set_audit_log_expiry
    BEFORE INSERT ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION set_audit_log_expiry();

-- Create function to clean up expired audit logs
CREATE OR REPLACE FUNCTION cleanup_expired_audit_logs()
RETURNS TABLE(deleted_count INTEGER) AS $$
DECLARE
    rows_deleted INTEGER;
BEGIN
    DELETE FROM audit_logs
    WHERE expires_at IS NOT NULL
      AND expires_at < CURRENT_TIMESTAMP;

    GET DIAGNOSTICS rows_deleted = ROW_COUNT;

    RETURN QUERY SELECT rows_deleted;
END;
$$ LANGUAGE plpgsql;

-- Create audit_log_cleanup_history table to track cleanup operations
CREATE TABLE IF NOT EXISTS audit_log_cleanup_history (
    id SERIAL PRIMARY KEY,
    cleanup_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logs_deleted INTEGER NOT NULL,
    retention_category VARCHAR(50),
    executed_by VARCHAR(255),
    notes TEXT
);

-- Add comments for documentation
COMMENT ON TABLE audit_log_retention_policies IS 'Defines retention policies for different categories of audit logs to comply with NABL ISO 15189';
COMMENT ON COLUMN audit_logs.retention_category IS 'Category determining retention policy: LOGIN (90 days) or PERMANENT (indefinite)';
COMMENT ON COLUMN audit_logs.expires_at IS 'Timestamp when this log entry expires and can be deleted. NULL means permanent retention.';
COMMENT ON COLUMN audit_logs.user_agent IS 'Browser/client user agent string for login tracking';
COMMENT ON COLUMN audit_logs.session_id IS 'Session identifier for correlating related actions';
COMMENT ON FUNCTION cleanup_expired_audit_logs() IS 'Deletes audit logs that have passed their retention period. Returns count of deleted logs.';

-- Create view for login activity monitoring
CREATE OR REPLACE VIEW login_activity_summary AS
SELECT
    DATE(timestamp) as login_date,
    action,
    COUNT(*) as attempt_count,
    COUNT(DISTINCT username) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips,
    COUNT(CASE WHEN action = 'LOGIN_SUCCESS' THEN 1 END) as successful_logins,
    COUNT(CASE WHEN action = 'LOGIN_FAILED' THEN 1 END) as failed_logins
FROM audit_logs
WHERE retention_category = 'LOGIN'
  AND action IN ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT')
GROUP BY DATE(timestamp), action
ORDER BY login_date DESC, action;

-- Create view for NABL compliance reporting
CREATE OR REPLACE VIEW nabl_audit_compliance_report AS
SELECT
    retention_category,
    COUNT(*) as total_logs,
    MIN(timestamp) as oldest_log,
    MAX(timestamp) as newest_log,
    COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP THEN 1 END) as expired_logs,
    COUNT(CASE WHEN expires_at IS NULL THEN 1 END) as permanent_logs
FROM audit_logs
GROUP BY retention_category;

COMMENT ON VIEW login_activity_summary IS 'Summary of login activity for security monitoring and compliance reporting';
COMMENT ON VIEW nabl_audit_compliance_report IS 'Compliance report showing audit log retention status per NABL ISO 15189 requirements';

-- ============================================================================
-- B2B BALANCE AUTOMATION
-- Purpose: Automatically manage B2B client balances and ledger entries
-- ============================================================================

-- Function to update client balance when a visit is created or updated
CREATE OR REPLACE FUNCTION update_client_balance_on_visit()
RETURNS TRIGGER AS $$
DECLARE
    balance_change DECIMAL(12, 2);
    old_due DECIMAL(12, 2);
    new_due DECIMAL(12, 2);
BEGIN
    -- Only process if this is a B2B client visit
    IF NEW.ref_customer_id IS NOT NULL THEN

        IF TG_OP = 'INSERT' THEN
            -- New visit: Add due amount to client balance
            IF NEW.due_amount > 0 THEN
                -- Create DEBIT ledger entry
                INSERT INTO ledger_entries (client_id, visit_id, type, amount, description)
                VALUES (
                    NEW.ref_customer_id,
                    NEW.id,
                    'DEBIT',
                    NEW.due_amount,
                    'Visit ' || NEW.visit_code || ' - Outstanding amount'
                );

                -- Increase client balance
                UPDATE clients
                SET balance = balance + NEW.due_amount,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = NEW.ref_customer_id;
            END IF;

        ELSIF TG_OP = 'UPDATE' THEN
            -- Visit updated: Adjust balance based on due amount change
            old_due := OLD.due_amount;
            new_due := NEW.due_amount;
            balance_change := new_due - old_due;

            IF balance_change != 0 THEN
                -- Update client balance
                UPDATE clients
                SET balance = balance + balance_change,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = NEW.ref_customer_id;

                -- Create ledger entry for the adjustment
                IF balance_change > 0 THEN
                    -- Due amount increased (payment was reduced or cost increased)
                    INSERT INTO ledger_entries (client_id, visit_id, type, amount, description)
                    VALUES (
                        NEW.ref_customer_id,
                        NEW.id,
                        'DEBIT',
                        ABS(balance_change),
                        'Visit ' || NEW.visit_code || ' - Balance adjustment (due increased)'
                    );
                ELSE
                    -- Due amount decreased (payment was made)
                    INSERT INTO ledger_entries (client_id, visit_id, type, amount, description)
                    VALUES (
                        NEW.ref_customer_id,
                        NEW.id,
                        'CREDIT',
                        ABS(balance_change),
                        'Visit ' || NEW.visit_code || ' - Payment received'
                    );
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT and UPDATE on visits
DROP TRIGGER IF EXISTS trigger_update_client_balance_on_visit ON visits;
CREATE TRIGGER trigger_update_client_balance_on_visit
AFTER INSERT OR UPDATE OF due_amount, amount_paid ON visits
FOR EACH ROW
EXECUTE FUNCTION update_client_balance_on_visit();

-- Function to handle visit deletion (reverse the balance)
CREATE OR REPLACE FUNCTION reverse_client_balance_on_visit_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if this was a B2B client visit
    IF OLD.ref_customer_id IS NOT NULL AND OLD.due_amount > 0 THEN
        -- Decrease client balance
        UPDATE clients
        SET balance = balance - OLD.due_amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.ref_customer_id;

        -- Create CREDIT ledger entry to reverse the debit
        INSERT INTO ledger_entries (client_id, visit_id, type, amount, description)
        VALUES (
            OLD.ref_customer_id,
            NULL, -- Visit is being deleted
            'CREDIT',
            OLD.due_amount,
            'Visit ' || OLD.visit_code || ' - Deleted/Reversed'
        );
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for DELETE on visits
DROP TRIGGER IF EXISTS trigger_reverse_client_balance_on_visit_delete ON visits;
CREATE TRIGGER trigger_reverse_client_balance_on_visit_delete
BEFORE DELETE ON visits
FOR EACH ROW
EXECUTE FUNCTION reverse_client_balance_on_visit_delete();

-- Create view for B2B client balance reconciliation
CREATE OR REPLACE VIEW b2b_balance_reconciliation AS
SELECT
    c.id as client_id,
    c.name as client_name,
    c.balance as current_balance,
    COALESCE(SUM(CASE WHEN le.type = 'DEBIT' THEN le.amount ELSE 0 END), 0) as total_debits,
    COALESCE(SUM(CASE WHEN le.type = 'CREDIT' THEN le.amount ELSE 0 END), 0) as total_credits,
    COALESCE(SUM(CASE WHEN le.type = 'DEBIT' THEN le.amount ELSE -le.amount END), 0) as calculated_balance,
    COALESCE(SUM(v.due_amount), 0) as total_outstanding_from_visits,
    c.balance - COALESCE(SUM(CASE WHEN le.type = 'DEBIT' THEN le.amount ELSE -le.amount END), 0) as balance_discrepancy
FROM clients c
LEFT JOIN ledger_entries le ON c.id = le.client_id
LEFT JOIN visits v ON c.id = v.ref_customer_id
WHERE c.type = 'REFERRAL_LAB'
GROUP BY c.id, c.name, c.balance;

-- Create indexes for better performance on ledger queries
CREATE INDEX IF NOT EXISTS idx_ledger_entries_type ON ledger_entries(type);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_visit_id ON ledger_entries(visit_id);

COMMENT ON FUNCTION update_client_balance_on_visit() IS 'Automatically updates B2B client balance and creates ledger entries when visits are created or updated';
COMMENT ON FUNCTION reverse_client_balance_on_visit_delete() IS 'Reverses B2B client balance when a visit is deleted';
COMMENT ON VIEW b2b_balance_reconciliation IS 'Shows B2B client balance reconciliation between ledger entries and actual balance';

-- ============================================
-- SEED DATA FOR DEVELOPMENT
-- ============================================
-- Password for all users: "password"
-- Password hash: $2a$10$2bS04Rn1y9ulyoNxDPFV7u6gfG1ZdVWRs9XnsgyAbeQbTkoCtlgTO

-- Insert Users
INSERT INTO users (username, password_hash, role, is_active) VALUES
('sudo', '$2a$10$2bS04Rn1y9ulyoNxDPFV7u6gfG1ZdVWRs9XnsgyAbeQbTkoCtlgTO', 'SUDO', true),
('admin', '$2a$10$2bS04Rn1y9ulyoNxDPFV7u6gfG1ZdVWRs9XnsgyAbeQbTkoCtlgTO', 'ADMIN', true),
('reception', '$2a$10$2bS04Rn1y9ulyoNxDPFV7u6gfG1ZdVWRs9XnsgyAbeQbTkoCtlgTO', 'RECEPTION', true),
('phlebotomy', '$2a$10$2bS04Rn1y9ulyoNxDPFV7u6gfG1ZdVWRs9XnsgyAbeQbTkoCtlgTO', 'PHLEBOTOMY', true),
('lab', '$2a$10$2bS04Rn1y9ulyoNxDPFV7u6gfG1ZdVWRs9XnsgyAbeQbTkoCtlgTO', 'LAB', true),
('approver', '$2a$10$2bS04Rn1y9ulyoNxDPFV7u6gfG1ZdVWRs9XnsgyAbeQbTkoCtlgTO', 'APPROVER', true)
ON CONFLICT (username) DO NOTHING;

-- Insert Branches
INSERT INTO branches (name, address, phone, email, city, state, pincode, is_active) VALUES
('Main Branch', '123 Main Street', '1234567890', 'main@slncity.com', 'Hyderabad', 'Telangana', '500001', true),
('Branch 2', '456 Second Street', '0987654321', 'branch2@slncity.com', 'Hyderabad', 'Telangana', '500002', true)
ON CONFLICT DO NOTHING;

-- Insert Antibiotics
INSERT INTO antibiotics (name, abbreviation, is_active) VALUES
('Amikacin', 'AK', true),
('Amoxicillin', 'AMX', true),
('Azithromycin', 'AZM', true),
('Cefepime', 'CPM', true),
('Ceftriaxone', 'CTR', true),
('Ciprofloxacin', 'CIP', true),
('Clindamycin', 'CD', true),
('Doxycycline', 'DO', true),
('Gentamicin', 'GEN', true),
('Imipenem', 'IPM', true),
('Levofloxacin', 'LEV', true),
('Linezolid', 'LZ', true),
('Meropenem', 'MRP', true),
('Nitrofurantoin', 'NIT', true),
('Penicillin', 'P', true),
('Piperacillin-Tazobactam', 'PIT', true),
('Tetracycline', 'TE', true),
('Vancomycin', 'VA', true)
ON CONFLICT DO NOTHING;

-- Insert Test Templates
INSERT INTO test_templates (code, name, category, price, b2b_price, report_type, sample_type, parameters, default_antibiotic_ids) VALUES
('CBC', 'Complete Blood Count', 'Hematology', 300, 250, 'standard', 'WB EDTA', '{"fields": [{"name": "Hemoglobin", "type": "number", "unit": "g/dL", "reference_range": "13-17"}, {"name": "WBC", "type": "number", "unit": "10³/µL", "reference_range": "4.5-11.0"}, {"name": "Platelets", "type": "number", "unit": "lakhs/mm³", "reference_range": "1.5-4.5"}]}', ARRAY[]::INTEGER[]),
('LFT', 'Liver Function Test', 'Biochemistry', 500, 450, 'standard', 'Serum', '{"fields": [{"name": "Bilirubin", "type": "number", "unit": "mg/dL", "reference_range": "0.1-1.2"}, {"name": "ALT", "type": "number", "unit": "U/L", "reference_range": "7-56"}]}', ARRAY[]::INTEGER[]),
('RFT', 'Renal Function Test', 'Biochemistry', 450, 400, 'standard', 'Serum', '{"fields": [{"name": "Urea", "type": "number", "unit": "mg/dL", "reference_range": "17-43"}, {"name": "Creatinine", "type": "number", "unit": "mg/dL", "reference_range": "0.6-1.2"}]}', ARRAY[]::INTEGER[]),
('LIPID', 'Lipid Profile', 'Biochemistry', 600, 550, 'standard', 'Serum', '{"fields": [{"name": "Total Cholesterol", "type": "number", "unit": "mg/dL", "reference_range": "<200"}, {"name": "Triglycerides", "type": "number", "unit": "mg/dL", "reference_range": "<150"}]}', ARRAY[]::INTEGER[]),
('THYROID', 'Thyroid Profile', 'Hormones', 700, 650, 'standard', 'Serum', '{"fields": [{"name": "T3", "type": "number", "unit": "ng/mL", "reference_range": "0.8-2.0"}, {"name": "T4", "type": "number", "unit": "µg/dL", "reference_range": "5.0-12.0"}, {"name": "TSH", "type": "number", "unit": "µIU/mL", "reference_range": "0.4-4.0"}]}', ARRAY[]::INTEGER[]),
('URINE', 'Urine Routine', 'Clinical Pathology', 200, 150, 'standard', 'Urine', '{"fields": [{"name": "Color", "type": "text", "unit": "", "reference_range": "Pale Yellow"}, {"name": "pH", "type": "number", "unit": "pH", "reference_range": "5.0-7.0"}]}', ARRAY[]::INTEGER[]),
('CULTURE-U', 'Urine Culture & Sensitivity', 'Microbiology', 800, 700, 'culture', 'Urine', '{"fields": []}', ARRAY[1, 6, 11, 14]::INTEGER[])
ON CONFLICT (code) DO NOTHING;

-- Insert Referral Doctors
INSERT INTO referral_doctors (name) VALUES
('Dr. John Doe'),
('Dr. Jane Smith'),
('Dr. Emily Brown'),
('Dr. Michael Johnson')
ON CONFLICT DO NOTHING;

-- Insert Clients
INSERT INTO clients (name, type, balance) VALUES
('CDCMARKAPUR', 'REFERRAL_LAB', 0),
('General Hospital', 'REFERRAL_LAB', 0),
('City Clinic', 'REFERRAL_LAB', 0),
('Walk-in Patient', 'PATIENT', 0)
ON CONFLICT DO NOTHING;

-- Insert Signatories
INSERT INTO signatories (name, title) VALUES
('Dr. Ramesh Kumar', 'MD Pathology'),
('Dr. Priya Sharma', 'MD Microbiology')
ON CONFLICT DO NOTHING;

-- Insert Role Permissions
INSERT INTO role_permissions (role, permissions) VALUES
('SUDO', ARRAY['ALL']),
('ADMIN', ARRAY['MANAGE_USERS', 'MANAGE_TESTS', 'MANAGE_PRICES', 'VIEW_REPORTS', 'MANAGE_BRANCHES']),
('RECEPTION', ARRAY['CREATE_VISIT', 'VIEW_VISITS', 'COLLECT_PAYMENT']),
('PHLEBOTOMY', ARRAY['COLLECT_SAMPLE', 'VIEW_VISITS']),
('LAB', ARRAY['ENTER_RESULTS', 'VIEW_VISITS']),
('APPROVER', ARRAY['APPROVE_RESULTS', 'VIEW_REPORTS'])
ON CONFLICT (role) DO NOTHING;

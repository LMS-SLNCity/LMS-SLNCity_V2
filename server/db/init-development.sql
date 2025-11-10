-- Development Database Initialization Script
-- This script creates the schema and loads development seed data
-- For development environment only - includes test data

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('SUDO', 'ADMIN', 'RECEPTION', 'PHLEBOTOMY', 'LAB', 'APPROVER', 'B2B_CLIENT')),
    is_active BOOLEAN DEFAULT true,
    signature_image_url VARCHAR(500),
    branch_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test Templates table
CREATE TABLE IF NOT EXISTS test_templates (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Branches table
CREATE TABLE IF NOT EXISTS branches (
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
CREATE TABLE IF NOT EXISTS antibiotics (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Units table
CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    salutation VARCHAR(10),
    name VARCHAR(255) NOT NULL,
    age_years INTEGER,
    age_months INTEGER,
    age_days INTEGER,
    sex VARCHAR(10) CHECK (sex IN ('Male', 'Female', 'Other')),
    phone VARCHAR(20),
    address TEXT,
    email VARCHAR(255),
    clinical_history TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients table (B2B)
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Hospital', 'Clinic', 'Diagnostic Center', 'Corporate', 'Other')),
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    balance DECIMAL(12, 2) DEFAULT 0.00,
    credit_limit DECIMAL(12, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- B2B Client Logins table
CREATE TABLE IF NOT EXISTS b2b_client_logins (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, user_id)
);

-- Client Prices table
CREATE TABLE IF NOT EXISTS client_prices (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    test_template_id INTEGER NOT NULL REFERENCES test_templates(id) ON DELETE CASCADE,
    custom_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, test_template_id)
);

-- Referral Doctors table
CREATE TABLE IF NOT EXISTS referral_doctors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Signatories table
CREATE TABLE IF NOT EXISTS signatories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(255) NOT NULL,
    signature_image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Visits table
CREATE TABLE IF NOT EXISTS visits (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    referred_doctor_id INTEGER REFERENCES referral_doctors(id),
    ref_customer_id INTEGER REFERENCES clients(id),
    other_ref_doctor VARCHAR(255),
    other_ref_customer VARCHAR(255),
    registration_datetime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    visit_code VARCHAR(50) UNIQUE NOT NULL,
    total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    payment_mode VARCHAR(50),
    due_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Visit Tests table
CREATE TABLE IF NOT EXISTS visit_tests (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    test_template_id INTEGER NOT NULL REFERENCES test_templates(id),
    test_name VARCHAR(255) NOT NULL,
    test_code VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    sample_type VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'processing', 'completed', 'approved')),
    collected_by INTEGER REFERENCES users(id),
    collected_at TIMESTAMP,
    processed_by INTEGER REFERENCES users(id),
    processed_at TIMESTAMP,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    result_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ledger Entries table
CREATE TABLE IF NOT EXISTS ledger_entries (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    visit_id INTEGER REFERENCES visits(id) ON DELETE SET NULL,
    entry_type VARCHAR(50) NOT NULL CHECK (entry_type IN ('debit', 'credit', 'adjustment')),
    amount DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,
    description TEXT,
    reference_number VARCHAR(100),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    username VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    details TEXT,
    resource VARCHAR(255),
    user_id INTEGER REFERENCES users(id),
    ip_address VARCHAR(45),
    user_agent TEXT,
    retention_category VARCHAR(50) DEFAULT 'PERMANENT',
    expires_at TIMESTAMP,
    session_id VARCHAR(255)
);

-- Patient Report Access Logs table
CREATE TABLE IF NOT EXISTS patient_report_access_logs (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    access_token VARCHAR(255)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_visit_code ON visits(visit_code);
CREATE INDEX IF NOT EXISTS idx_visits_registration_datetime ON visits(registration_datetime);
CREATE INDEX IF NOT EXISTS idx_visit_tests_visit_id ON visit_tests(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_tests_status ON visit_tests(status);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_client_id ON ledger_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_username ON audit_logs(username);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);

-- Create sequence for visit codes
CREATE SEQUENCE IF NOT EXISTS visit_code_seq START 1;

-- Create function to generate visit code
CREATE OR REPLACE FUNCTION generate_visit_code()
RETURNS VARCHAR(50) AS $$
DECLARE
    next_val INTEGER;
    visit_code VARCHAR(50);
BEGIN
    next_val := nextval('visit_code_seq');
    visit_code := 'V' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(next_val::TEXT, 4, '0');
    RETURN visit_code;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate visit code
CREATE OR REPLACE FUNCTION set_visit_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.visit_code IS NULL OR NEW.visit_code = '' THEN
        NEW.visit_code := generate_visit_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_visit_code ON visits;
CREATE TRIGGER trigger_set_visit_code
    BEFORE INSERT ON visits
    FOR EACH ROW
    EXECUTE FUNCTION set_visit_code();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_templates_updated_at ON test_templates;
CREATE TRIGGER update_test_templates_updated_at BEFORE UPDATE ON test_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_visits_updated_at ON visits;
CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_visit_tests_updated_at ON visit_tests;
CREATE TRIGGER update_visit_tests_updated_at BEFORE UPDATE ON visit_tests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO lms_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO lms_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO lms_user;

-- Development initialization complete
SELECT 'Development database schema initialized successfully' AS status;


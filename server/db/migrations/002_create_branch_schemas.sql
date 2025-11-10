-- Drop old public schema tables (they will be replaced by branch schemas)
-- NOTE: test_templates, role_permissions, and signatures remain in public schema as global tables
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.visit_tests CASCADE;
DROP TABLE IF EXISTS public.visits CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;
DROP TABLE IF EXISTS public.client_prices CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.referral_doctors CASCADE;
DROP TABLE IF EXISTS public.signatories CASCADE;
DROP TABLE IF EXISTS public.ledger_entries CASCADE;
DROP TABLE IF EXISTS public.b2b_client_logins CASCADE;
DROP TABLE IF EXISTS public.patient_report_access_logs CASCADE;

-- Create schemas for each branch
CREATE SCHEMA IF NOT EXISTS branch_1;
CREATE SCHEMA IF NOT EXISTS branch_2;
CREATE SCHEMA IF NOT EXISTS branch_3;

-- Grant permissions
GRANT USAGE ON SCHEMA branch_1 TO lms_user;
GRANT USAGE ON SCHEMA branch_2 TO lms_user;
GRANT USAGE ON SCHEMA branch_3 TO lms_user;

GRANT CREATE ON SCHEMA branch_1 TO lms_user;
GRANT CREATE ON SCHEMA branch_2 TO lms_user;
GRANT CREATE ON SCHEMA branch_3 TO lms_user;

-- Create patients table in each schema
CREATE TABLE IF NOT EXISTS branch_1.patients (
    id SERIAL PRIMARY KEY,
    salutation VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    age_years INTEGER NOT NULL,
    age_months INTEGER DEFAULT 0,
    age_days INTEGER DEFAULT 0,
    sex VARCHAR(20) NOT NULL,
    guardian_name VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    email VARCHAR(255),
    clinical_history TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branch_2.patients AS TABLE branch_1.patients WITH NO DATA;
CREATE TABLE IF NOT EXISTS branch_3.patients AS TABLE branch_1.patients WITH NO DATA;

-- Create visits table in each schema
CREATE TABLE IF NOT EXISTS branch_1.visits (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES branch_1.patients(id) ON DELETE CASCADE,
    referred_doctor_id INTEGER,
    ref_customer_id INTEGER,
    other_ref_doctor VARCHAR(255),
    other_ref_customer VARCHAR(255),
    registration_datetime TIMESTAMP,
    visit_code VARCHAR(50) UNIQUE NOT NULL,
    total_cost DECIMAL(12, 2) NOT NULL,
    amount_paid DECIMAL(12, 2) NOT NULL,
    payment_mode VARCHAR(50),
    due_amount DECIMAL(12, 2) NOT NULL,
    qr_code_token VARCHAR(500),
    qr_code_generated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branch_2.visits AS TABLE branch_1.visits WITH NO DATA;
CREATE TABLE IF NOT EXISTS branch_3.visits AS TABLE branch_1.visits WITH NO DATA;

-- Create visit_tests table in each schema
CREATE TABLE IF NOT EXISTS branch_1.visit_tests (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER NOT NULL REFERENCES branch_1.visits(id) ON DELETE CASCADE,
    test_template_id INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SAMPLE_COLLECTED', 'IN_PROGRESS', 'AWAITING_APPROVAL', 'APPROVED', 'COMPLETED')),
    collected_by VARCHAR(255),
    collected_at TIMESTAMP,
    specimen_type VARCHAR(100),
    results JSONB,
    culture_result JSONB,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branch_2.visit_tests AS TABLE branch_1.visit_tests WITH NO DATA;
CREATE TABLE IF NOT EXISTS branch_3.visit_tests AS TABLE branch_1.visit_tests WITH NO DATA;

-- Create clients table in each schema
CREATE TABLE IF NOT EXISTS branch_1.clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('PATIENT', 'REFERRAL_LAB', 'INTERNAL')),
    balance DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branch_2.clients AS TABLE branch_1.clients WITH NO DATA;
CREATE TABLE IF NOT EXISTS branch_3.clients AS TABLE branch_1.clients WITH NO DATA;

-- Create client_prices table in each schema
CREATE TABLE IF NOT EXISTS branch_1.client_prices (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES branch_1.clients(id) ON DELETE CASCADE,
    test_template_id INTEGER NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branch_2.client_prices AS TABLE branch_1.client_prices WITH NO DATA;
CREATE TABLE IF NOT EXISTS branch_3.client_prices AS TABLE branch_1.client_prices WITH NO DATA;

-- Create referral_doctors table in each schema
CREATE TABLE IF NOT EXISTS branch_1.referral_doctors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branch_2.referral_doctors AS TABLE branch_1.referral_doctors WITH NO DATA;
CREATE TABLE IF NOT EXISTS branch_3.referral_doctors AS TABLE branch_1.referral_doctors WITH NO DATA;

-- Create signatories table in each schema
CREATE TABLE IF NOT EXISTS branch_1.signatories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branch_2.signatories AS TABLE branch_1.signatories WITH NO DATA;
CREATE TABLE IF NOT EXISTS branch_3.signatories AS TABLE branch_1.signatories WITH NO DATA;

-- Create test_templates table in each schema
CREATE TABLE IF NOT EXISTS branch_1.test_templates (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branch_2.test_templates AS TABLE branch_1.test_templates WITH NO DATA;
CREATE TABLE IF NOT EXISTS branch_3.test_templates AS TABLE branch_1.test_templates WITH NO DATA;

-- Create ledger_entries table in each schema
CREATE TABLE IF NOT EXISTS branch_1.ledger_entries (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES branch_1.clients(id) ON DELETE CASCADE,
    visit_id INTEGER REFERENCES branch_1.visits(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('DEBIT', 'CREDIT')),
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branch_2.ledger_entries AS TABLE branch_1.ledger_entries WITH NO DATA;
CREATE TABLE IF NOT EXISTS branch_3.ledger_entries AS TABLE branch_1.ledger_entries WITH NO DATA;

-- Create audit_logs table in each schema
CREATE TABLE IF NOT EXISTS branch_1.audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branch_2.audit_logs AS TABLE branch_1.audit_logs WITH NO DATA;
CREATE TABLE IF NOT EXISTS branch_3.audit_logs AS TABLE branch_1.audit_logs WITH NO DATA;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_branch_1_patients_phone ON branch_1.patients(phone);
CREATE INDEX IF NOT EXISTS idx_branch_1_patients_name ON branch_1.patients(name);
CREATE INDEX IF NOT EXISTS idx_branch_1_visits_visit_code ON branch_1.visits(visit_code);
CREATE INDEX IF NOT EXISTS idx_branch_1_visits_patient_id ON branch_1.visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_branch_1_visit_tests_visit_id ON branch_1.visit_tests(visit_id);
CREATE INDEX IF NOT EXISTS idx_branch_1_clients_name ON branch_1.clients(name);

CREATE INDEX IF NOT EXISTS idx_branch_2_patients_phone ON branch_2.patients(phone);
CREATE INDEX IF NOT EXISTS idx_branch_2_patients_name ON branch_2.patients(name);
CREATE INDEX IF NOT EXISTS idx_branch_2_visits_visit_code ON branch_2.visits(visit_code);
CREATE INDEX IF NOT EXISTS idx_branch_2_visits_patient_id ON branch_2.visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_branch_2_visit_tests_visit_id ON branch_2.visit_tests(visit_id);
CREATE INDEX IF NOT EXISTS idx_branch_2_clients_name ON branch_2.clients(name);

CREATE INDEX IF NOT EXISTS idx_branch_3_patients_phone ON branch_3.patients(phone);
CREATE INDEX IF NOT EXISTS idx_branch_3_patients_name ON branch_3.patients(name);
CREATE INDEX IF NOT EXISTS idx_branch_3_visits_visit_code ON branch_3.visits(visit_code);
CREATE INDEX IF NOT EXISTS idx_branch_3_visits_patient_id ON branch_3.visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_branch_3_visit_tests_visit_id ON branch_3.visit_tests(visit_id);
CREATE INDEX IF NOT EXISTS idx_branch_3_clients_name ON branch_3.clients(name);


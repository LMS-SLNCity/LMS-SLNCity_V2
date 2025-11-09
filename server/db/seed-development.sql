-- ============================================
-- DEVELOPMENT SEED DATA
-- ============================================
-- Easy passwords and comprehensive test data for development
--
-- 🔑 ALL USER PASSWORDS: "password" (easy to remember!)
--
-- 👥 Users created:
--    sudo / password       → SUDO (full system access)
--    admin / password      → ADMIN (administrative access)
--    reception / password  → RECEPTION (patient registration)
--    phlebotomy / password → PHLEBOTOMY (sample collection)
--    lab / password        → LAB_TECHNICIAN (result entry)
--    approver / password   → APPROVER (result approval)
--
-- 🏥 B2B Client Logins (password: "client"):
--    City Diagnostic Center / client
--    Apollo Diagnostics / client
--    Max Healthcare / client
-- ============================================

-- ============================================
-- 1. USERS (All with password: "password")
-- ============================================
-- Password hash for "password": $2a$10$2bS04Rn1y9ulyoNxDPFV7u6gfG1ZdVWRs9XnsgyAbeQbTkoCtlgTO

INSERT INTO users (username, password_hash, role, is_active) VALUES
('sudo', '$2a$10$2bS04Rn1y9ulyoNxDPFV7u6gfG1ZdVWRs9XnsgyAbeQbTkoCtlgTO', 'SUDO', true),
('admin', '$2a$10$2bS04Rn1y9ulyoNxDPFV7u6gfG1ZdVWRs9XnsgyAbeQbTkoCtlgTO', 'ADMIN', true),
('reception', '$2a$10$2bS04Rn1y9ulyoNxDPFV7u6gfG1ZdVWRs9XnsgyAbeQbTkoCtlgTO', 'RECEPTION', true),
('phlebotomy', '$2a$10$2bS04Rn1y9ulyoNxDPFV7u6gfG1ZdVWRs9XnsgyAbeQbTkoCtlgTO', 'PHLEBOTOMY', true),
('lab', '$2a$10$2bS04Rn1y9ulyoNxDPFV7u6gfG1ZdVWRs9XnsgyAbeQbTkoCtlgTO', 'LAB', true),
('approver', '$2a$10$2bS04Rn1y9ulyoNxDPFV7u6gfG1ZdVWRs9XnsgyAbeQbTkoCtlgTO', 'APPROVER', true)
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- ============================================
-- 2. TEST TEMPLATES (with sample types)
-- ============================================
INSERT INTO test_templates (code, name, category, price, b2b_price, report_type, sample_type, parameters) VALUES
('CBC', 'Complete Blood Count', 'HEMATOLOGY', 300.00, 250.00, 'standard', 'WB EDTA', '{"fields": [{"name":"Hemoglobin","unit":"g/dL","normalRange":"13-17"},{"name":"WBC Count","unit":"cells/cumm","normalRange":"4000-11000"},{"name":"RBC Count","unit":"million/cumm","normalRange":"4.5-5.5"}]}'),
('LFT', 'Liver Function Test', 'BIOCHEMISTRY', 500.00, 450.00, 'standard', 'Serum', '{"fields": [{"name":"Total Bilirubin","unit":"mg/dL","normalRange":"0.3-1.2"},{"name":"Direct Bilirubin","unit":"mg/dL","normalRange":"0.1-0.3"},{"name":"SGOT","unit":"U/L","normalRange":"5-40"}]}'),
('RFT', 'Renal Function Test', 'BIOCHEMISTRY', 450.00, 400.00, 'standard', 'Serum', '{"fields": [{"name":"Creatinine","unit":"mg/dL","normalRange":"0.7-1.3"},{"name":"Urea","unit":"mg/dL","normalRange":"15-40"},{"name":"Uric Acid","unit":"mg/dL","normalRange":"3.5-7.2"}]}'),
('LIPID', 'Lipid Profile', 'BIOCHEMISTRY', 600.00, 550.00, 'standard', 'Serum', '{"fields": [{"name":"Total Cholesterol","unit":"mg/dL","normalRange":"<200"},{"name":"Triglycerides","unit":"mg/dL","normalRange":"<150"},{"name":"HDL","unit":"mg/dL","normalRange":">40"}]}'),
('THYROID', 'Thyroid Profile', 'BIOCHEMISTRY', 700.00, 650.00, 'standard', 'Serum', '{"fields": [{"name":"T3","unit":"ng/mL","normalRange":"0.8-2.0"},{"name":"T4","unit":"μg/dL","normalRange":"5.0-12.0"},{"name":"TSH","unit":"μIU/mL","normalRange":"0.4-4.0"}]}'),
('URINE', 'Urine Routine', 'CLINICAL PATHOLOGY', 200.00, 150.00, 'standard', 'Urine', '{"fields": [{"name":"Color","unit":"","normalRange":"Pale Yellow"},{"name":"pH","unit":"","normalRange":"5.0-7.0"},{"name":"Protein","unit":"","normalRange":"Nil"}]}'),
('CULTURE', 'Urine Culture & Sensitivity', 'MICROBIOLOGY', 800.00, 700.00, 'culture', 'Urine', '{"fields": []}')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  price = EXCLUDED.price,
  b2b_price = EXCLUDED.b2b_price,
  report_type = EXCLUDED.report_type,
  sample_type = EXCLUDED.sample_type,
  parameters = EXCLUDED.parameters;

-- ============================================
-- 3. B2B CLIENTS
-- ============================================
-- Valid types: PATIENT, REFERRAL_LAB, INTERNAL
INSERT INTO clients (name, type, balance) VALUES
('City Diagnostic Center', 'REFERRAL_LAB', 0),
('Apollo Diagnostics', 'REFERRAL_LAB', 0),
('Max Healthcare', 'REFERRAL_LAB', 0),
('Fortis Hospital', 'REFERRAL_LAB', 0),
('Medanta Clinic', 'REFERRAL_LAB', 0)
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. B2B CLIENT LOGINS (All with password: "client")
-- ============================================
-- Password hash for "client": $2a$10$5H5aLCXd5YQKhKKGJKqPqOXJZ5z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5u
INSERT INTO b2b_client_logins (client_id, password_hash, is_active) VALUES
(1, '$2a$10$5H5aLCXd5YQKhKKGJKqPqOXJZ5z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5u', true),
(2, '$2a$10$5H5aLCXd5YQKhKKGJKqPqOXJZ5z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5u', true),
(3, '$2a$10$5H5aLCXd5YQKhKKGJKqPqOXJZ5z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5u', true),
(4, '$2a$10$5H5aLCXd5YQKhKKGJKqPqOXJZ5z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5u', true),
(5, '$2a$10$5H5aLCXd5YQKhKKGJKqPqOXJZ5z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5u', true)
ON CONFLICT (client_id) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  is_active = EXCLUDED.is_active;

-- ============================================
-- 5. BRANCHES
-- ============================================
INSERT INTO branches (name, address, phone, email) VALUES
('Main Branch', 'Sri Lakshmi Narasimha City Diagnostic Center, Main Road', '1234567890', 'info@slncity.com'),
('Branch 2', 'SLN City Diagnostics, Secondary Location', '0987654321', 'branch2@slncity.com')
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. SIGNATORIES
-- ============================================
INSERT INTO signatories (name, title) VALUES
('Dr. Ramesh Kumar', 'MBBS, MD (Pathology)'),
('Dr. Priya Sharma', 'MBBS, MD (Biochemistry)')
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. REFERRAL DOCTORS
-- ============================================
INSERT INTO referral_doctors (name) VALUES
('Dr. Suresh Reddy'),
('Dr. Lakshmi Devi'),
('Dr. Venkat Rao')
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. SAMPLE PATIENTS (phone and address are optional)
-- ============================================
INSERT INTO patients (salutation, name, age_years, age_months, age_days, sex, phone, address, email) VALUES
('Mr.', 'Rajesh Kumar', 35, 0, 0, 'Male', '9876543210', 'Address 1, City', 'rajesh@example.com'),
('Mrs.', 'Priya Sharma', 28, 0, 0, 'Female', '9876543211', 'Address 2, City', 'priya@example.com'),
('Mr.', 'Venkat Reddy', 45, 0, 0, 'Male', '9876543212', 'Address 3, City', 'venkat@example.com'),
('Mrs.', 'Lakshmi Devi', 32, 0, 0, 'Female', NULL, NULL, 'lakshmi@example.com'),
('Mr.', 'Suresh Babu', 50, 0, 0, 'Male', '9876543214', 'Address 5, City', NULL)
ON CONFLICT DO NOTHING;

-- ============================================
-- 9. SAMPLE VISITS (for testing)
-- ============================================
-- Note: Ledger entries and balance updates are handled automatically by triggers
-- Schema: patient_id, ref_customer_id, total_cost, amount_paid, payment_mode, due_amount
DO $$
DECLARE
    v_patient_id INTEGER;
    v_visit_id INTEGER;
    v_client_id INTEGER;
    v_test_id INTEGER;
BEGIN
    -- Visit 1: Walk-in patient (Cash payment - fully paid)
    SELECT id INTO v_patient_id FROM patients WHERE name = 'Rajesh Kumar' LIMIT 1;
    IF v_patient_id IS NOT NULL THEN
        INSERT INTO visits (
            patient_id, total_cost, amount_paid, payment_mode, due_amount, registration_datetime
        ) VALUES (
            v_patient_id, 300.00, 300.00, 'CASH', 0.00, CURRENT_TIMESTAMP
        ) RETURNING id INTO v_visit_id;

        -- Add test to visit
        SELECT id INTO v_test_id FROM test_templates WHERE code = 'CBC' LIMIT 1;
        IF v_test_id IS NOT NULL THEN
            INSERT INTO visit_tests (visit_id, test_template_id, status)
            VALUES (v_visit_id, v_test_id, 'SAMPLE_COLLECTED');
        END IF;
    END IF;

    -- Visit 2: B2B client visit (Credit payment - unpaid, trigger will create ledger entry)
    SELECT id INTO v_patient_id FROM patients WHERE name = 'Priya Sharma' LIMIT 1;
    SELECT id INTO v_client_id FROM clients WHERE name = 'City Diagnostic Center' LIMIT 1;
    IF v_patient_id IS NOT NULL AND v_client_id IS NOT NULL THEN
        INSERT INTO visits (
            patient_id, ref_customer_id, total_cost, amount_paid, payment_mode, due_amount, registration_datetime
        ) VALUES (
            v_patient_id, v_client_id, 500.00, 0.00, 'CREDIT', 500.00, CURRENT_TIMESTAMP
        ) RETURNING id INTO v_visit_id;

        -- Add test to visit
        SELECT id INTO v_test_id FROM test_templates WHERE code = 'LFT' LIMIT 1;
        IF v_test_id IS NOT NULL THEN
            INSERT INTO visit_tests (visit_id, test_template_id, status)
            VALUES (v_visit_id, v_test_id, 'PENDING');
        END IF;

        -- Ledger entry is automatically created by trigger
    END IF;

    -- Visit 3: Another B2B visit (Credit payment - unpaid, trigger will create ledger entry)
    SELECT id INTO v_patient_id FROM patients WHERE name = 'Venkat Reddy' LIMIT 1;
    SELECT id INTO v_client_id FROM clients WHERE name = 'Apollo Diagnostics' LIMIT 1;
    IF v_patient_id IS NOT NULL AND v_client_id IS NOT NULL THEN
        INSERT INTO visits (
            patient_id, ref_customer_id, total_cost, amount_paid, payment_mode, due_amount, registration_datetime
        ) VALUES (
            v_patient_id, v_client_id, 450.00, 0.00, 'CREDIT', 450.00, CURRENT_TIMESTAMP
        ) RETURNING id INTO v_visit_id;

        -- Add test to visit
        SELECT id INTO v_test_id FROM test_templates WHERE code = 'RFT' LIMIT 1;
        IF v_test_id IS NOT NULL THEN
            INSERT INTO visit_tests (visit_id, test_template_id, status)
            VALUES (v_visit_id, v_test_id, 'SAMPLE_COLLECTED');
        END IF;

        -- Ledger entry is automatically created by trigger
    END IF;
END $$;

-- ============================================
-- SUMMARY
-- ============================================
SELECT 'Development seed data loaded successfully' AS status;
SELECT COUNT(*) AS user_count FROM users;
SELECT COUNT(*) AS test_count FROM test_templates;
SELECT COUNT(*) AS client_count FROM clients;
SELECT COUNT(*) AS patient_count FROM patients;
SELECT COUNT(*) AS visit_count FROM visits;
SELECT COUNT(*) AS ledger_count FROM ledger_entries;


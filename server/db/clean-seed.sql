-- ============================================================================
-- CLEAN SEED DATA FOR LMS SLNCITY
-- This script drops all data and creates fresh, consistent seed data
-- with proper ledger entries that always tally correctly
-- ============================================================================

-- ============================================================================
-- STEP 1: CLEAR ALL DATA (in reverse order of dependencies)
-- ============================================================================
DELETE FROM audit_logs;
DELETE FROM ledger_entries;
DELETE FROM visit_tests;
DELETE FROM visits;
DELETE FROM client_prices;
DELETE FROM b2b_client_logins;
DELETE FROM patients;
DELETE FROM referral_doctors;
DELETE FROM signatories;
DELETE FROM clients;
DELETE FROM antibiotics;
DELETE FROM test_templates;
DELETE FROM users;

-- Reset sequences
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE test_templates_id_seq RESTART WITH 1;
ALTER SEQUENCE antibiotics_id_seq RESTART WITH 1;
ALTER SEQUENCE clients_id_seq RESTART WITH 1;
ALTER SEQUENCE client_prices_id_seq RESTART WITH 1;
ALTER SEQUENCE patients_id_seq RESTART WITH 1;
ALTER SEQUENCE referral_doctors_id_seq RESTART WITH 1;
ALTER SEQUENCE signatories_id_seq RESTART WITH 1;
ALTER SEQUENCE visits_id_seq RESTART WITH 1;
ALTER SEQUENCE visit_tests_id_seq RESTART WITH 1;
ALTER SEQUENCE ledger_entries_id_seq RESTART WITH 1;
ALTER SEQUENCE audit_logs_id_seq RESTART WITH 1;
ALTER SEQUENCE visit_code_seq RESTART WITH 1;

-- ============================================================================
-- STEP 2: INSERT USERS
-- All passwords are: Password123
-- ============================================================================
INSERT INTO users (username, password_hash, role, is_active) VALUES
('sudo', '$2a$10$oSEV8ODFQCz35c7OiLvwkOz8L0NULCsVbqKjpGmcMAvc2ebnabG7i', 'SUDO', true),
('admin', '$2a$10$mU8N2yb9sdzgVwz9mlV8EuLE442gE1HDfWbfDXj9iZxx7ef4bLXz2', 'ADMIN', true),
('reception', '$2a$10$MHXalBbTRJtoFl5zCkNpAeFbdwibMpdu5l0ks6MgMl3D9j3mIllAi', 'RECEPTION', true),
('phlebo', '$2a$10$3YFVmtnRZrq0vdA0MMkggezyYvLdH9Q1uX22U3dOTpuaudhcFvke.', 'PHLEBOTOMY', true),
('labtech', '$2a$10$zuxMB35YXHngnd817dlQNu6BPpOOhWBhHcAnKwcoH0fMeAlrUS0j2', 'LAB', true),
('approver', '$2a$10$Bn7b0iHbbU98UJPU0e0WK.DA7a/8OlSXPHVp/SeGNrkaIJRLnDHUu', 'APPROVER', true);

-- ============================================================================
-- STEP 3: INSERT TEST TEMPLATES
-- ============================================================================
INSERT INTO test_templates (name, code, category, default_price, tat_hours, specimen_type, method, fields) VALUES
('Complete Blood Count', 'CBC', 'HEMATOLOGY', 300.00, 24, 'Blood', 'Automated Analyzer', '[{"name":"Hemoglobin","unit":"g/dL","normalRange":"13-17"},{"name":"WBC Count","unit":"cells/μL","normalRange":"4000-11000"}]'),
('Liver Function Test', 'LFT', 'BIOCHEMISTRY', 500.00, 24, 'Serum', 'Automated Analyzer', '[{"name":"Total Bilirubin","unit":"mg/dL","normalRange":"0.3-1.2"},{"name":"SGOT","unit":"U/L","normalRange":"5-40"}]'),
('Kidney Function Test', 'KFT', 'BIOCHEMISTRY', 450.00, 24, 'Serum', 'Automated Analyzer', '[{"name":"Creatinine","unit":"mg/dL","normalRange":"0.7-1.3"},{"name":"Urea","unit":"mg/dL","normalRange":"15-40"}]'),
('Lipid Profile', 'LIPID', 'BIOCHEMISTRY', 600.00, 24, 'Serum', 'Automated Analyzer', '[{"name":"Total Cholesterol","unit":"mg/dL","normalRange":"<200"},{"name":"Triglycerides","unit":"mg/dL","normalRange":"<150"}]'),
('Thyroid Profile', 'THYROID', 'BIOCHEMISTRY', 700.00, 48, 'Serum', 'ELISA', '[{"name":"TSH","unit":"μIU/mL","normalRange":"0.4-4.0"},{"name":"T3","unit":"ng/mL","normalRange":"0.8-2.0"}]'),
('Blood Culture', 'CULTURE', 'MICROBIOLOGY', 800.00, 72, 'Blood', 'Culture Method', '[{"name":"Organism","unit":"","normalRange":"No Growth"}]'),
('Urine Routine', 'URINE', 'CLINICAL_PATHOLOGY', 200.00, 12, 'Urine', 'Microscopy', '[{"name":"Color","unit":"","normalRange":"Pale Yellow"},{"name":"pH","unit":"","normalRange":"5.0-7.0"}]'),
('HbA1c', 'HBA1C', 'BIOCHEMISTRY', 400.00, 24, 'Blood', 'HPLC', '[{"name":"HbA1c","unit":"%","normalRange":"<5.7"}]');

-- ============================================================================
-- STEP 4: INSERT ANTIBIOTICS
-- ============================================================================
INSERT INTO antibiotics (name, code) VALUES
('Amoxicillin', 'AMX'),
('Ciprofloxacin', 'CIP'),
('Azithromycin', 'AZM'),
('Ceftriaxone', 'CTR'),
('Gentamicin', 'GEN');

-- ============================================================================
-- STEP 5: INSERT CLIENTS (B2B Customers)
-- ============================================================================
INSERT INTO clients (name, type, balance) VALUES
('Walk-in Patients', 'PATIENT', 0.00),           -- ID: 1 (for direct patients)
('City Diagnostic Center', 'REFERRAL_LAB', 0.00), -- ID: 2 (B2B client)
('Apollo Diagnostics', 'REFERRAL_LAB', 0.00),     -- ID: 3 (B2B client)
('Max Healthcare', 'REFERRAL_LAB', 0.00);         -- ID: 4 (B2B client)

-- ============================================================================
-- STEP 6: INSERT B2B CLIENT LOGINS
-- Password for all B2B clients: Client123
-- ============================================================================
INSERT INTO b2b_client_logins (client_id, password_hash, is_active) VALUES
(2, '$2a$10$oSEV8ODFQCz35c7OiLvwkOz8L0NULCsVbqKjpGmcMAvc2ebnabG7i', true),
(3, '$2a$10$oSEV8ODFQCz35c7OiLvwkOz8L0NULCsVbqKjpGmcMAvc2ebnabG7i', true),
(4, '$2a$10$oSEV8ODFQCz35c7OiLvwkOz8L0NULCsVbqKjpGmcMAvc2ebnabG7i', true);

-- ============================================================================
-- STEP 7: INSERT CLIENT PRICES (Special pricing for B2B clients)
-- ============================================================================
INSERT INTO client_prices (client_id, test_template_id, price) VALUES
-- City Diagnostic Center (ID: 2) - 10% discount
(2, 1, 270.00), (2, 2, 450.00), (2, 3, 405.00), (2, 4, 540.00),
-- Apollo Diagnostics (ID: 3) - 15% discount
(3, 1, 255.00), (3, 2, 425.00), (3, 3, 382.50), (3, 4, 510.00),
-- Max Healthcare (ID: 4) - 20% discount
(4, 1, 240.00), (4, 2, 400.00), (4, 3, 360.00), (4, 4, 480.00);

-- ============================================================================
-- STEP 8: INSERT REFERRAL DOCTORS
-- ============================================================================
INSERT INTO referral_doctors (name) VALUES
('Dr. Rajesh Kumar'),
('Dr. Priya Sharma'),
('Dr. Amit Patel'),
('Dr. Neha Singh');

-- ============================================================================
-- STEP 9: INSERT SIGNATORIES
-- ============================================================================
INSERT INTO signatories (name, title) VALUES
('DR MISBHA LATEEFA, MD', 'Consultant Pathologist'),
('DR ASHA KIRAN, MBBS, MD', 'Consultant Pathologist'),
('T.V. SUBBARAO', 'M.Sc., Bio-Chemist');

-- ============================================================================
-- STEP 10: INSERT PATIENTS
-- ============================================================================
INSERT INTO patients (salutation, name, age_years, age_months, age_days, sex, phone, address, email, clinical_history) VALUES
('Mr.', 'Ramesh Kumar', 45, 0, 0, 'MALE', '9876543210', 'Hyderabad, Telangana', 'ramesh@example.com', 'Routine checkup'),
('Mrs.', 'Lakshmi Devi', 38, 0, 0, 'FEMALE', '9876543211', 'Hyderabad, Telangana', 'lakshmi@example.com', 'Diabetes follow-up'),
('Mr.', 'Suresh Reddy', 52, 0, 0, 'MALE', '9876543212', 'Hyderabad, Telangana', 'suresh@example.com', 'Hypertension'),
('Mrs.', 'Padma Rani', 42, 0, 0, 'FEMALE', '9876543213', 'Hyderabad, Telangana', 'padma@example.com', 'Thyroid disorder'),
('Mr.', 'Venkat Rao', 35, 0, 0, 'MALE', '9876543214', 'Hyderabad, Telangana', 'venkat@example.com', 'Pre-employment checkup'),
('Mrs.', 'Sita Mahalakshmi', 48, 0, 0, 'FEMALE', '9876543215', 'Hyderabad, Telangana', 'sita@example.com', 'Annual health checkup'),
('Mr.', 'Krishna Murthy', 60, 0, 0, 'MALE', '9876543216', 'Hyderabad, Telangana', 'krishna@example.com', 'Kidney function monitoring'),
('Mrs.', 'Radha Krishna', 55, 0, 0, 'FEMALE', '9876543217', 'Hyderabad, Telangana', 'radha@example.com', 'Lipid profile check');

-- ============================================================================
-- STEP 11: INSERT VISITS WITH PROPER FLOW
-- ============================================================================

-- Walk-in patient visits (fully paid, no ledger entries)
INSERT INTO visits (patient_id, referred_doctor_id, ref_customer_id, registration_datetime, total_cost, amount_paid, payment_mode, due_amount) VALUES
(1, 1, 1, NOW() - INTERVAL '10 days', 300.00, 300.00, 'CASH', 0.00),
(5, 2, 1, NOW() - INTERVAL '8 days', 600.00, 600.00, 'CARD', 0.00);

-- City Diagnostic Center (ID: 2) - B2B Client with credit
INSERT INTO visits (patient_id, referred_doctor_id, ref_customer_id, registration_datetime, total_cost, amount_paid, payment_mode, due_amount) VALUES
(2, NULL, 2, NOW() - INTERVAL '7 days', 270.00, 0.00, 'CREDIT', 270.00),  -- Visit ID: 3
(3, NULL, 2, NOW() - INTERVAL '6 days', 450.00, 0.00, 'CREDIT', 450.00),  -- Visit ID: 4
(4, NULL, 2, NOW() - INTERVAL '5 days', 405.00, 0.00, 'CREDIT', 405.00);  -- Visit ID: 5

-- Apollo Diagnostics (ID: 3) - B2B Client with credit
INSERT INTO visits (patient_id, referred_doctor_id, ref_customer_id, registration_datetime, total_cost, amount_paid, payment_mode, due_amount) VALUES
(6, NULL, 3, NOW() - INTERVAL '4 days', 255.00, 0.00, 'CREDIT', 255.00),  -- Visit ID: 6
(7, NULL, 3, NOW() - INTERVAL '3 days', 425.00, 0.00, 'CREDIT', 425.00);  -- Visit ID: 7

-- Max Healthcare (ID: 4) - B2B Client with credit
INSERT INTO visits (patient_id, referred_doctor_id, ref_customer_id, registration_datetime, total_cost, amount_paid, payment_mode, due_amount) VALUES
(8, NULL, 4, NOW() - INTERVAL '2 days', 240.00, 0.00, 'CREDIT', 240.00);  -- Visit ID: 8

-- ============================================================================
-- STEP 12: INSERT LEDGER ENTRIES (MUST TALLY WITH VISITS)
-- ============================================================================

-- City Diagnostic Center (ID: 2)
-- DEBITS: 270 + 450 + 405 = 1125.00
INSERT INTO ledger_entries (client_id, visit_id, type, amount, description, created_at) VALUES
(2, 3, 'DEBIT', 270.00, 'Visit for patient Lakshmi Devi - CBC', NOW() - INTERVAL '7 days'),
(2, 4, 'DEBIT', 450.00, 'Visit for patient Suresh Reddy - LFT', NOW() - INTERVAL '6 days'),
(2, 5, 'DEBIT', 405.00, 'Visit for patient Padma Rani - KFT', NOW() - INTERVAL '5 days');

-- CREDITS: 500.00 (partial payment)
INSERT INTO ledger_entries (client_id, visit_id, type, amount, description, created_at) VALUES
(2, NULL, 'CREDIT', 500.00, 'CASH - Partial payment received', NOW() - INTERVAL '3 days');

-- Balance for City Diagnostic Center: 1125.00 - 500.00 = 625.00

-- Apollo Diagnostics (ID: 3)
-- DEBITS: 255 + 425 = 680.00
INSERT INTO ledger_entries (client_id, visit_id, type, amount, description, created_at) VALUES
(3, 6, 'DEBIT', 255.00, 'Visit for patient Sita Mahalakshmi - CBC', NOW() - INTERVAL '4 days'),
(3, 7, 'DEBIT', 425.00, 'Visit for patient Krishna Murthy - LFT', NOW() - INTERVAL '3 days');

-- CREDITS: 680.00 (full payment)
INSERT INTO ledger_entries (client_id, visit_id, type, amount, description, created_at) VALUES
(3, NULL, 'CREDIT', 680.00, 'CARD - Full payment received', NOW() - INTERVAL '1 day');

-- Balance for Apollo Diagnostics: 680.00 - 680.00 = 0.00

-- Max Healthcare (ID: 4)
-- DEBITS: 240.00
INSERT INTO ledger_entries (client_id, visit_id, type, amount, description, created_at) VALUES
(4, 8, 'DEBIT', 240.00, 'Visit for patient Radha Krishna - CBC', NOW() - INTERVAL '2 days');

-- CREDITS: 0.00 (no payment yet)
-- Balance for Max Healthcare: 240.00 - 0.00 = 240.00

-- ============================================================================
-- STEP 13: UPDATE CLIENT BALANCES (Trigger should do this, but ensure consistency)
-- ============================================================================
UPDATE clients SET balance = 625.00 WHERE id = 2;  -- City Diagnostic Center
UPDATE clients SET balance = 0.00 WHERE id = 3;    -- Apollo Diagnostics (fully paid)
UPDATE clients SET balance = 240.00 WHERE id = 4;  -- Max Healthcare

-- ============================================================================
-- STEP 14: INSERT VISIT TESTS
-- ============================================================================
INSERT INTO visit_tests (visit_id, test_template_id, status, collected_by, collected_at, specimen_type, results, approved_by, approved_at) VALUES
-- Walk-in visits
(1, 1, 'APPROVED', 'phlebo', NOW() - INTERVAL '10 days', 'Blood', '{"Hemoglobin": "14.5", "WBC Count": "7500"}', 'approver', NOW() - INTERVAL '9 days'),
(2, 4, 'APPROVED', 'phlebo', NOW() - INTERVAL '8 days', 'Serum', '{"Total Cholesterol": "180", "Triglycerides": "120"}', 'approver', NOW() - INTERVAL '7 days'),

-- City Diagnostic Center visits
(3, 1, 'APPROVED', 'phlebo', NOW() - INTERVAL '7 days', 'Blood', '{"Hemoglobin": "12.8", "WBC Count": "6800"}', 'approver', NOW() - INTERVAL '6 days'),
(4, 2, 'APPROVED', 'phlebo', NOW() - INTERVAL '6 days', 'Serum', '{"Total Bilirubin": "0.9", "SGOT": "32"}', 'approver', NOW() - INTERVAL '5 days'),
(5, 3, 'APPROVED', 'phlebo', NOW() - INTERVAL '5 days', 'Serum', '{"Creatinine": "1.0", "Urea": "28"}', 'approver', NOW() - INTERVAL '4 days'),

-- Apollo Diagnostics visits
(6, 1, 'APPROVED', 'phlebo', NOW() - INTERVAL '4 days', 'Blood', '{"Hemoglobin": "13.2", "WBC Count": "7200"}', 'approver', NOW() - INTERVAL '3 days'),
(7, 2, 'APPROVED', 'phlebo', NOW() - INTERVAL '3 days', 'Serum', '{"Total Bilirubin": "0.8", "SGOT": "28"}', 'approver', NOW() - INTERVAL '2 days'),

-- Max Healthcare visits
(8, 1, 'APPROVED', 'phlebo', NOW() - INTERVAL '2 days', 'Blood', '{"Hemoglobin": "15.1", "WBC Count": "8100"}', 'approver', NOW() - INTERVAL '1 day');

-- ============================================================================
-- STEP 15: VERIFICATION QUERIES
-- ============================================================================

-- Verify ledger balances match client balances
DO $$
DECLARE
    client_record RECORD;
    calculated_balance DECIMAL(12, 2);
    stored_balance DECIMAL(12, 2);
BEGIN
    FOR client_record IN SELECT id, name, balance FROM clients WHERE type != 'PATIENT' LOOP
        -- Calculate balance from ledger
        SELECT COALESCE(SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE -amount END), 0)
        INTO calculated_balance
        FROM ledger_entries
        WHERE client_id = client_record.id;
        
        stored_balance := client_record.balance;
        
        IF ABS(calculated_balance - stored_balance) > 0.01 THEN
            RAISE WARNING '⚠️  LEDGER MISMATCH for %: Calculated=%, Stored=%', 
                client_record.name, calculated_balance, stored_balance;
        ELSE
            RAISE NOTICE '✅ Ledger OK for %: Balance=%', client_record.name, stored_balance;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT '============================================' as "SEED DATA SUMMARY";
SELECT COUNT(*) as "Total Users" FROM users;
SELECT COUNT(*) as "Total Test Templates" FROM test_templates;
SELECT COUNT(*) as "Total Clients" FROM clients;
SELECT COUNT(*) as "Total B2B Logins" FROM b2b_client_logins;
SELECT COUNT(*) as "Total Patients" FROM patients;
SELECT COUNT(*) as "Total Visits" FROM visits;
SELECT COUNT(*) as "Total Ledger Entries" FROM ledger_entries;
SELECT COUNT(*) as "Total Visit Tests" FROM visit_tests;

SELECT '============================================' as "CLIENT BALANCES";
SELECT id, name, type, balance FROM clients ORDER BY id;

SELECT '============================================' as "LEDGER SUMMARY";
SELECT 
    c.id,
    c.name,
    COUNT(le.id) as "Entries",
    SUM(CASE WHEN le.type = 'DEBIT' THEN le.amount ELSE 0 END) as "Total Debits",
    SUM(CASE WHEN le.type = 'CREDIT' THEN le.amount ELSE 0 END) as "Total Credits",
    SUM(CASE WHEN le.type = 'DEBIT' THEN le.amount ELSE -le.amount END) as "Calculated Balance",
    c.balance as "Stored Balance"
FROM clients c
LEFT JOIN ledger_entries le ON c.id = le.client_id
WHERE c.type != 'PATIENT'
GROUP BY c.id, c.name, c.balance
ORDER BY c.id;


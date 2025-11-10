-- Migrate existing data from public schema to branch schemas

-- Migrate patients
INSERT INTO branch_1.patients (id, salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history, created_at, updated_at)
SELECT id, salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history, created_at, updated_at
FROM public.patients WHERE branch_id = 1 OR branch_id IS NULL;

INSERT INTO branch_2.patients (id, salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history, created_at, updated_at)
SELECT id, salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history, created_at, updated_at
FROM public.patients WHERE branch_id = 2;

INSERT INTO branch_3.patients (id, salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history, created_at, updated_at)
SELECT id, salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history, created_at, updated_at
FROM public.patients WHERE branch_id = 3;

-- Reset sequences for patients
SELECT setval('branch_1.patients_id_seq', (SELECT MAX(id) FROM branch_1.patients) + 1);
SELECT setval('branch_2.patients_id_seq', (SELECT MAX(id) FROM branch_2.patients) + 1);
SELECT setval('branch_3.patients_id_seq', (SELECT MAX(id) FROM branch_3.patients) + 1);

-- Migrate visits
INSERT INTO branch_1.visits (id, patient_id, referred_doctor_id, ref_customer_id, other_ref_doctor, other_ref_customer, registration_datetime, visit_code, total_cost, amount_paid, payment_mode, due_amount, qr_code_token, qr_code_generated_at, created_at, updated_at)
SELECT id, patient_id, referred_doctor_id, ref_customer_id, other_ref_doctor, other_ref_customer, registration_datetime, visit_code, total_cost, amount_paid, payment_mode, due_amount, qr_code_token, qr_code_generated_at, created_at, updated_at
FROM public.visits WHERE branch_id = 1 OR branch_id IS NULL;

INSERT INTO branch_2.visits (id, patient_id, referred_doctor_id, ref_customer_id, other_ref_doctor, other_ref_customer, registration_datetime, visit_code, total_cost, amount_paid, payment_mode, due_amount, qr_code_token, qr_code_generated_at, created_at, updated_at)
SELECT id, patient_id, referred_doctor_id, ref_customer_id, other_ref_doctor, other_ref_customer, registration_datetime, visit_code, total_cost, amount_paid, payment_mode, due_amount, qr_code_token, qr_code_generated_at, created_at, updated_at
FROM public.visits WHERE branch_id = 2;

INSERT INTO branch_3.visits (id, patient_id, referred_doctor_id, ref_customer_id, other_ref_doctor, other_ref_customer, registration_datetime, visit_code, total_cost, amount_paid, payment_mode, due_amount, qr_code_token, qr_code_generated_at, created_at, updated_at)
SELECT id, patient_id, referred_doctor_id, ref_customer_id, other_ref_doctor, other_ref_customer, registration_datetime, visit_code, total_cost, amount_paid, payment_mode, due_amount, qr_code_token, qr_code_generated_at, created_at, updated_at
FROM public.visits WHERE branch_id = 3;

-- Reset sequences for visits
SELECT setval('branch_1.visits_id_seq', (SELECT MAX(id) FROM branch_1.visits) + 1);
SELECT setval('branch_2.visits_id_seq', (SELECT MAX(id) FROM branch_2.visits) + 1);
SELECT setval('branch_3.visits_id_seq', (SELECT MAX(id) FROM branch_3.visits) + 1);

-- Migrate visit_tests
INSERT INTO branch_1.visit_tests (id, visit_id, test_template_id, status, result_value, result_unit, reference_range, approved_by, approved_at, created_at, updated_at)
SELECT vt.id, vt.visit_id, vt.test_template_id, vt.status, vt.result_value, vt.result_unit, vt.reference_range, vt.approved_by, vt.approved_at, vt.created_at, vt.updated_at
FROM public.visit_tests vt
JOIN public.visits v ON vt.visit_id = v.id
WHERE v.branch_id = 1 OR v.branch_id IS NULL;

INSERT INTO branch_2.visit_tests (id, visit_id, test_template_id, status, result_value, result_unit, reference_range, approved_by, approved_at, created_at, updated_at)
SELECT vt.id, vt.visit_id, vt.test_template_id, vt.status, vt.result_value, vt.result_unit, vt.reference_range, vt.approved_by, vt.approved_at, vt.created_at, vt.updated_at
FROM public.visit_tests vt
JOIN public.visits v ON vt.visit_id = v.id
WHERE v.branch_id = 2;

INSERT INTO branch_3.visit_tests (id, visit_id, test_template_id, status, result_value, result_unit, reference_range, approved_by, approved_at, created_at, updated_at)
SELECT vt.id, vt.visit_id, vt.test_template_id, vt.status, vt.result_value, vt.result_unit, vt.reference_range, vt.approved_by, vt.approved_at, vt.created_at, vt.updated_at
FROM public.visit_tests vt
JOIN public.visits v ON vt.visit_id = v.id
WHERE v.branch_id = 3;

-- Reset sequences for visit_tests
SELECT setval('branch_1.visit_tests_id_seq', (SELECT MAX(id) FROM branch_1.visit_tests) + 1);
SELECT setval('branch_2.visit_tests_id_seq', (SELECT MAX(id) FROM branch_2.visit_tests) + 1);
SELECT setval('branch_3.visit_tests_id_seq', (SELECT MAX(id) FROM branch_3.visit_tests) + 1);

-- Migrate clients
INSERT INTO branch_1.clients (id, name, contact_person, phone, email, address, city, state, pincode, is_active, created_at, updated_at)
SELECT id, name, contact_person, phone, email, address, city, state, pincode, is_active, created_at, updated_at
FROM public.clients WHERE branch_id = 1 OR branch_id IS NULL;

INSERT INTO branch_2.clients (id, name, contact_person, phone, email, address, city, state, pincode, is_active, created_at, updated_at)
SELECT id, name, contact_person, phone, email, address, city, state, pincode, is_active, created_at, updated_at
FROM public.clients WHERE branch_id = 2;

INSERT INTO branch_3.clients (id, name, contact_person, phone, email, address, city, state, pincode, is_active, created_at, updated_at)
SELECT id, name, contact_person, phone, email, address, city, state, pincode, is_active, created_at, updated_at
FROM public.clients WHERE branch_id = 3;

-- Reset sequences for clients
SELECT setval('branch_1.clients_id_seq', (SELECT MAX(id) FROM branch_1.clients) + 1);
SELECT setval('branch_2.clients_id_seq', (SELECT MAX(id) FROM branch_2.clients) + 1);
SELECT setval('branch_3.clients_id_seq', (SELECT MAX(id) FROM branch_3.clients) + 1);

-- Migrate client_prices
INSERT INTO branch_1.client_prices (id, client_id, test_template_id, price, created_at, updated_at)
SELECT cp.id, cp.client_id, cp.test_template_id, cp.price, cp.created_at, cp.updated_at
FROM public.client_prices cp
JOIN public.clients c ON cp.client_id = c.id
WHERE c.branch_id = 1 OR c.branch_id IS NULL;

INSERT INTO branch_2.client_prices (id, client_id, test_template_id, price, created_at, updated_at)
SELECT cp.id, cp.client_id, cp.test_template_id, cp.price, cp.created_at, cp.updated_at
FROM public.client_prices cp
JOIN public.clients c ON cp.client_id = c.id
WHERE c.branch_id = 2;

INSERT INTO branch_3.client_prices (id, client_id, test_template_id, price, created_at, updated_at)
SELECT cp.id, cp.client_id, cp.test_template_id, cp.price, cp.created_at, cp.updated_at
FROM public.client_prices cp
JOIN public.clients c ON cp.client_id = c.id
WHERE c.branch_id = 3;

-- Reset sequences for client_prices
SELECT setval('branch_1.client_prices_id_seq', (SELECT MAX(id) FROM branch_1.client_prices) + 1);
SELECT setval('branch_2.client_prices_id_seq', (SELECT MAX(id) FROM branch_2.client_prices) + 1);
SELECT setval('branch_3.client_prices_id_seq', (SELECT MAX(id) FROM branch_3.client_prices) + 1);

-- Migrate referral_doctors
INSERT INTO branch_1.referral_doctors (id, name, phone, email, address, city, state, pincode, is_active, created_at, updated_at)
SELECT id, name, phone, email, address, city, state, pincode, is_active, created_at, updated_at
FROM public.referral_doctors WHERE branch_id = 1 OR branch_id IS NULL;

INSERT INTO branch_2.referral_doctors (id, name, phone, email, address, city, state, pincode, is_active, created_at, updated_at)
SELECT id, name, phone, email, address, city, state, pincode, is_active, created_at, updated_at
FROM public.referral_doctors WHERE branch_id = 2;

INSERT INTO branch_3.referral_doctors (id, name, phone, email, address, city, state, pincode, is_active, created_at, updated_at)
SELECT id, name, phone, email, address, city, state, pincode, is_active, created_at, updated_at
FROM public.referral_doctors WHERE branch_id = 3;

-- Reset sequences for referral_doctors
SELECT setval('branch_1.referral_doctors_id_seq', (SELECT MAX(id) FROM branch_1.referral_doctors) + 1);
SELECT setval('branch_2.referral_doctors_id_seq', (SELECT MAX(id) FROM branch_2.referral_doctors) + 1);
SELECT setval('branch_3.referral_doctors_id_seq', (SELECT MAX(id) FROM branch_3.referral_doctors) + 1);

-- Migrate signatories
INSERT INTO branch_1.signatories (id, name, qualification, signature_image_url, is_active, created_at, updated_at)
SELECT id, name, qualification, signature_image_url, is_active, created_at, updated_at
FROM public.signatories WHERE branch_id = 1 OR branch_id IS NULL;

INSERT INTO branch_2.signatories (id, name, qualification, signature_image_url, is_active, created_at, updated_at)
SELECT id, name, qualification, signature_image_url, is_active, created_at, updated_at
FROM public.signatories WHERE branch_id = 2;

INSERT INTO branch_3.signatories (id, name, qualification, signature_image_url, is_active, created_at, updated_at)
SELECT id, name, qualification, signature_image_url, is_active, created_at, updated_at
FROM public.signatories WHERE branch_id = 3;

-- Reset sequences for signatories
SELECT setval('branch_1.signatories_id_seq', (SELECT MAX(id) FROM branch_1.signatories) + 1);
SELECT setval('branch_2.signatories_id_seq', (SELECT MAX(id) FROM branch_2.signatories) + 1);
SELECT setval('branch_3.signatories_id_seq', (SELECT MAX(id) FROM branch_3.signatories) + 1);

-- Migrate test_templates
INSERT INTO branch_1.test_templates (id, name, category, price, unit, reference_range, is_active, created_at, updated_at)
SELECT id, name, category, price, unit, reference_range, is_active, created_at, updated_at
FROM public.test_templates WHERE branch_id = 1 OR branch_id IS NULL;

INSERT INTO branch_2.test_templates (id, name, category, price, unit, reference_range, is_active, created_at, updated_at)
SELECT id, name, category, price, unit, reference_range, is_active, created_at, updated_at
FROM public.test_templates WHERE branch_id = 2;

INSERT INTO branch_3.test_templates (id, name, category, price, unit, reference_range, is_active, created_at, updated_at)
SELECT id, name, category, price, unit, reference_range, is_active, created_at, updated_at
FROM public.test_templates WHERE branch_id = 3;

-- Reset sequences for test_templates
SELECT setval('branch_1.test_templates_id_seq', (SELECT MAX(id) FROM branch_1.test_templates) + 1);
SELECT setval('branch_2.test_templates_id_seq', (SELECT MAX(id) FROM branch_2.test_templates) + 1);
SELECT setval('branch_3.test_templates_id_seq', (SELECT MAX(id) FROM branch_3.test_templates) + 1);

-- Migrate ledger_entries
INSERT INTO branch_1.ledger_entries (id, visit_id, entry_type, amount, description, created_at, updated_at)
SELECT le.id, le.visit_id, le.entry_type, le.amount, le.description, le.created_at, le.updated_at
FROM public.ledger_entries le
JOIN public.visits v ON le.visit_id = v.id
WHERE v.branch_id = 1 OR v.branch_id IS NULL;

INSERT INTO branch_2.ledger_entries (id, visit_id, entry_type, amount, description, created_at, updated_at)
SELECT le.id, le.visit_id, le.entry_type, le.amount, le.description, le.created_at, le.updated_at
FROM public.ledger_entries le
JOIN public.visits v ON le.visit_id = v.id
WHERE v.branch_id = 2;

INSERT INTO branch_3.ledger_entries (id, visit_id, entry_type, amount, description, created_at, updated_at)
SELECT le.id, le.visit_id, le.entry_type, le.amount, le.description, le.created_at, le.updated_at
FROM public.ledger_entries le
JOIN public.visits v ON le.visit_id = v.id
WHERE v.branch_id = 3;

-- Reset sequences for ledger_entries
SELECT setval('branch_1.ledger_entries_id_seq', (SELECT MAX(id) FROM branch_1.ledger_entries) + 1);
SELECT setval('branch_2.ledger_entries_id_seq', (SELECT MAX(id) FROM branch_2.ledger_entries) + 1);
SELECT setval('branch_3.ledger_entries_id_seq', (SELECT MAX(id) FROM branch_3.ledger_entries) + 1);

-- Migrate audit_logs
INSERT INTO branch_1.audit_logs (id, user_id, action, description, created_at)
SELECT id, user_id, action, description, created_at
FROM public.audit_logs WHERE branch_id = 1 OR branch_id IS NULL;

INSERT INTO branch_2.audit_logs (id, user_id, action, description, created_at)
SELECT id, user_id, action, description, created_at
FROM public.audit_logs WHERE branch_id = 2;

INSERT INTO branch_3.audit_logs (id, user_id, action, description, created_at)
SELECT id, user_id, action, description, created_at
FROM public.audit_logs WHERE branch_id = 3;

-- Reset sequences for audit_logs
SELECT setval('branch_1.audit_logs_id_seq', (SELECT MAX(id) FROM branch_1.audit_logs) + 1);
SELECT setval('branch_2.audit_logs_id_seq', (SELECT MAX(id) FROM branch_2.audit_logs) + 1);
SELECT setval('branch_3.audit_logs_id_seq', (SELECT MAX(id) FROM branch_3.audit_logs) + 1);


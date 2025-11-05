-- Production Seed Data
-- This file contains ONLY essential data for production deployment
-- No test data, no sample visits, no dummy clients

-- ============================================
-- 1. ESSENTIAL USERS (with secure passwords)
-- ============================================
-- Default password for all users: ChangeMe@123
-- IMPORTANT: Change these passwords immediately after deployment!

INSERT INTO users (username, password_hash, role, is_active) VALUES
('sudo', '$2a$10$RZHRKSweExF8e6RaEFfEGe3RfHZtYSPsybDIfDZSZEz6JAZn7DVmi', 'SUDO', true),
('admin', '$2a$10$RZHRKSweExF8e6RaEFfEGe3RfHZtYSPsybDIfDZSZEz6JAZn7DVmi', 'ADMIN', true)
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- ============================================
-- 2. ESSENTIAL TEST TEMPLATES
-- ============================================
-- Add your lab's actual test templates here
-- These are just examples - replace with your real tests

INSERT INTO test_templates (code, name, category, price, b2b_price, report_type, parameters) VALUES
('CBC', 'Complete Blood Count', 'HEMATOLOGY', 300.00, 250.00, 'standard', '{"fields": [{"name":"Hemoglobin","unit":"g/dL","normalRange":"13-17"}]}'),
('LFT', 'Liver Function Test', 'BIOCHEMISTRY', 500.00, 450.00, 'standard', '{"fields": [{"name":"Total Bilirubin","unit":"mg/dL","normalRange":"0.3-1.2"}]}'),
('RFT', 'Renal Function Test', 'BIOCHEMISTRY', 450.00, 400.00, 'standard', '{"fields": [{"name":"Creatinine","unit":"mg/dL","normalRange":"0.7-1.3"}]}')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  price = EXCLUDED.price,
  b2b_price = EXCLUDED.b2b_price,
  report_type = EXCLUDED.report_type,
  parameters = EXCLUDED.parameters;

-- ============================================
-- 3. DEFAULT BRANCH
-- ============================================
INSERT INTO branches (name, address, phone, email) VALUES
('Main Branch', 'Sri Lakshmi Narasimha City Diagnostic Center, Main Road', '1234567890', 'info@slncity.com')
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. DEFAULT SIGNATORY
-- ============================================
INSERT INTO signatories (name, title) VALUES
('Dr. Default Signatory', 'MBBS, MD')
ON CONFLICT DO NOTHING;

-- ============================================
-- PRODUCTION DEPLOYMENT NOTES:
-- ============================================
-- 1. Change all default passwords immediately after deployment
-- 2. Add your actual test templates
-- 3. Add your actual branch information
-- 4. Add your actual signatory information
-- 5. Set up B2B clients as needed
-- 6. Configure backup schedule
-- 7. Set up SSL certificates
-- 8. Configure firewall rules
-- 9. Set up monitoring and alerts
-- 10. Test all functionality before going live

SELECT 'Production seed data loaded successfully' AS status;
SELECT COUNT(*) AS user_count FROM users;
SELECT COUNT(*) AS test_count FROM test_templates;
SELECT COUNT(*) AS branch_count FROM branches;
SELECT COUNT(*) AS signatory_count FROM signatories;


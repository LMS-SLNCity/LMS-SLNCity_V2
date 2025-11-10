-- Migration: Add branch_id to tables for branch isolation
-- This migration adds branch_id foreign key to tables that need branch isolation
-- Each branch has its own: users, patients, clients, referral doctors, signatories, test prices, etc.

-- Add branch_id to test_templates table (each branch has own pricing)
ALTER TABLE test_templates ADD COLUMN branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE;
CREATE INDEX idx_test_templates_branch_id ON test_templates(branch_id);

-- Add branch_id to patients table
ALTER TABLE patients ADD COLUMN branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE;
CREATE INDEX idx_patients_branch_id ON patients(branch_id);

-- Add branch_id to clients table
ALTER TABLE clients ADD COLUMN branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE;
CREATE INDEX idx_clients_branch_id ON clients(branch_id);

-- Add branch_id to referral_doctors table
ALTER TABLE referral_doctors ADD COLUMN branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE;
CREATE INDEX idx_referral_doctors_branch_id ON referral_doctors(branch_id);

-- Add branch_id to signatories table
ALTER TABLE signatories ADD COLUMN branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE;
CREATE INDEX idx_signatories_branch_id ON signatories(branch_id);

-- Add branch_id to ledger_entries table
ALTER TABLE ledger_entries ADD COLUMN branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE;
CREATE INDEX idx_ledger_entries_branch_id ON ledger_entries(branch_id);

-- Add branch_id to audit_logs table for audit trail per branch
ALTER TABLE audit_logs ADD COLUMN branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE;
CREATE INDEX idx_audit_logs_branch_id ON audit_logs(branch_id);

-- Add index for users branch_id if not exists
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);

-- Add index for visits branch_id if not exists (already exists but ensure it's there)
CREATE INDEX IF NOT EXISTS idx_visits_branch_id ON visits(branch_id);

-- Add constraint to ensure users have a branch_id (except SUDO users)
-- This will be enforced at application level

-- Add constraint to ensure visits have a branch_id
ALTER TABLE visits ADD CONSTRAINT visits_branch_id_not_null CHECK (branch_id IS NOT NULL);

-- Migration complete
-- Next: Update all routes to filter by branch_id
-- Next: Create branch context middleware
-- Next: Update seed data to assign branch_id to all records


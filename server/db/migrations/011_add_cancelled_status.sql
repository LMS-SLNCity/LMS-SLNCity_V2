-- Migration: Add CANCELLED status to visit_tests table
-- This allows tests to be cancelled (not performed) by admins

-- Drop the existing CHECK constraint
ALTER TABLE visit_tests DROP CONSTRAINT IF EXISTS visit_tests_status_check;

-- Add the new CHECK constraint with CANCELLED status
ALTER TABLE visit_tests ADD CONSTRAINT visit_tests_status_check 
CHECK (status IN ('PENDING', 'SAMPLE_COLLECTED', 'REJECTED', 'CANCELLED', 'IN_PROGRESS', 'AWAITING_APPROVAL', 'APPROVED', 'PRINTED', 'COMPLETED'));


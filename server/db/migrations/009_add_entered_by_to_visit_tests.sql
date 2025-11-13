-- Migration: Add entered_by and entered_at fields to visit_tests table
-- This tracks who entered the test results (lab technician)

ALTER TABLE visit_tests
ADD COLUMN IF NOT EXISTS entered_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS entered_at TIMESTAMP;

-- Add comment for documentation
COMMENT ON COLUMN visit_tests.entered_by IS 'Username of the lab technician who entered the test results';
COMMENT ON COLUMN visit_tests.entered_at IS 'Timestamp when the test results were entered';


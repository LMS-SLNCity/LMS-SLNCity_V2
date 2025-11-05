-- Migration: Make phone and address optional in patients table
-- Reason: Not all patients provide phone numbers or addresses

-- Remove NOT NULL constraint from phone column
ALTER TABLE patients ALTER COLUMN phone DROP NOT NULL;

-- Remove NOT NULL constraint from address column
ALTER TABLE patients ALTER COLUMN address DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN patients.phone IS 'Patient phone number (optional)';
COMMENT ON COLUMN patients.address IS 'Patient address (optional)';


-- Migration: Add TAT (Turnaround Time) to test templates
-- Description: Add tat_hours field to store expected turnaround time for each test

-- Add tat_hours column to test_templates table
ALTER TABLE test_templates
ADD COLUMN IF NOT EXISTS tat_hours INTEGER DEFAULT 24;

-- Add comment to explain the column
COMMENT ON COLUMN test_templates.tat_hours IS 'Expected turnaround time in hours for test completion';

-- Update existing test templates with realistic TAT values based on test category
UPDATE test_templates SET tat_hours = 2 WHERE category = 'Hematology' AND tat_hours = 24;
UPDATE test_templates SET tat_hours = 4 WHERE category = 'Biochemistry' AND tat_hours = 24;
UPDATE test_templates SET tat_hours = 24 WHERE category = 'Serology' AND tat_hours = 24;
UPDATE test_templates SET tat_hours = 48 WHERE category = 'Microbiology' AND tat_hours = 24;
UPDATE test_templates SET tat_hours = 72 WHERE category = 'Culture' AND tat_hours = 24;
UPDATE test_templates SET tat_hours = 6 WHERE category = 'Immunology' AND tat_hours = 24;

-- Create index for faster queries filtering by TAT
CREATE INDEX IF NOT EXISTS idx_test_templates_tat_hours ON test_templates(tat_hours);


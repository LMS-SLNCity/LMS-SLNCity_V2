-- Migration: Add sample_type to test_templates table
-- This allows admins to set default sample type for each test template
-- Phlebotomy can verify and update if needed during collection

-- Add sample_type column to test_templates
ALTER TABLE test_templates
ADD COLUMN IF NOT EXISTS sample_type VARCHAR(100);

-- Add comment
COMMENT ON COLUMN test_templates.sample_type IS 'Default sample type for this test (e.g., WB EDTA, Serum, Urine). Phlebotomy can verify/update during collection.';

-- Update existing templates with common sample types based on category
UPDATE test_templates
SET sample_type = CASE
    WHEN LOWER(category) LIKE '%hematology%' OR LOWER(category) LIKE '%blood%' THEN 'WB EDTA'
    WHEN LOWER(category) LIKE '%biochemistry%' OR LOWER(category) LIKE '%chemistry%' THEN 'Serum'
    WHEN LOWER(category) LIKE '%microbiology%' OR LOWER(category) LIKE '%culture%' THEN 'Urine'
    WHEN LOWER(category) LIKE '%serology%' OR LOWER(category) LIKE '%immunology%' THEN 'Serum'
    WHEN LOWER(category) LIKE '%urine%' THEN 'Urine'
    WHEN LOWER(category) LIKE '%stool%' THEN 'Stool'
    ELSE 'Serum'
END
WHERE sample_type IS NULL;


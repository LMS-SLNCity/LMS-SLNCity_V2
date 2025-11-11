-- Migration: Add constraints to prevent duplicate test templates and visit tests
-- Date: 2025-11-11
-- Purpose: Prevent duplicate test templates and duplicate tests in same visit

-- ============================================================================
-- CONSTRAINT 1: Prevent duplicate test template codes (case-insensitive)
-- ============================================================================
-- This prevents creating tests with same code like "CULTURE" and "culture"
CREATE UNIQUE INDEX IF NOT EXISTS idx_test_templates_code_unique
ON test_templates (LOWER(code));

COMMENT ON INDEX idx_test_templates_code_unique IS
'Ensures test template codes are unique (case-insensitive)';

-- ============================================================================
-- CONSTRAINT 2: Prevent duplicate test template names within same category
-- ============================================================================
-- This prevents creating tests with same name in same category
CREATE UNIQUE INDEX IF NOT EXISTS idx_test_templates_name_category_unique
ON test_templates (LOWER(name), LOWER(category));

COMMENT ON INDEX idx_test_templates_name_category_unique IS
'Ensures test template names are unique within each category (case-insensitive)';

-- ============================================================================
-- CONSTRAINT 3: Prevent duplicate tests in same visit
-- ============================================================================
-- This prevents adding the same test template multiple times to one visit
-- If a patient needs the same test again, create a new visit
ALTER TABLE visit_tests
ADD CONSTRAINT IF NOT EXISTS unique_test_per_visit
UNIQUE (visit_id, test_template_id);

COMMENT ON CONSTRAINT unique_test_per_visit ON visit_tests IS
'Ensures each test template can only be added once per visit. For repeat tests, create a new visit.';


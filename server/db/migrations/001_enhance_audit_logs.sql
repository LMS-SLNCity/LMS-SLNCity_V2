-- Migration: Enhance audit logs table for better filtering and tracking
-- Date: 2025-11-03

-- Add new columns to audit_logs table
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS resource VARCHAR(100),
ADD COLUMN IF NOT EXISTS resource_id INTEGER,
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45),
ADD COLUMN IF NOT EXISTS old_values JSONB,
ADD COLUMN IF NOT EXISTS new_values JSONB;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Create a new table for patient edit requests (for admin approval)
CREATE TABLE IF NOT EXISTS patient_edit_requests (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    requested_by_user_id INTEGER NOT NULL REFERENCES users(id),
    requested_by_username VARCHAR(255) NOT NULL,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('NAME_CHANGE', 'CRITICAL_INFO_CHANGE', 'GENERAL_EDIT')),
    old_values JSONB NOT NULL,
    new_values JSONB NOT NULL,
    reason TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by_user_id INTEGER REFERENCES users(id),
    reviewed_by_username VARCHAR(255),
    review_comment TEXT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patient_edit_requests_patient_id ON patient_edit_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_edit_requests_status ON patient_edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_patient_edit_requests_requested_by ON patient_edit_requests(requested_by_user_id);

-- Create a new table for result rejection/comments
CREATE TABLE IF NOT EXISTS result_rejections (
    id SERIAL PRIMARY KEY,
    visit_test_id INTEGER NOT NULL REFERENCES visit_tests(id) ON DELETE CASCADE,
    rejected_by_user_id INTEGER NOT NULL REFERENCES users(id),
    rejected_by_username VARCHAR(255) NOT NULL,
    rejection_reason TEXT NOT NULL,
    old_results JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_CORRECTION' CHECK (status IN ('PENDING_CORRECTION', 'CORRECTED', 'RESOLVED')),
    resolved_by_user_id INTEGER REFERENCES users(id),
    resolved_by_username VARCHAR(255),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_result_rejections_visit_test_id ON result_rejections(visit_test_id);
CREATE INDEX IF NOT EXISTS idx_result_rejections_status ON result_rejections(status);

-- Add rejection tracking to visit_tests
ALTER TABLE visit_tests
ADD COLUMN IF NOT EXISTS rejection_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_rejection_at TIMESTAMP;

COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system actions';
COMMENT ON TABLE patient_edit_requests IS 'Tracks patient information edit requests requiring admin approval';
COMMENT ON TABLE result_rejections IS 'Tracks result rejections by approvers with comments for lab technicians';


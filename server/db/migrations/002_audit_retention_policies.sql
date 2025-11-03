-- Migration: Audit Log Retention Policies and Login Logging
-- Purpose: Implement NABL-compliant audit logging with retention policies
-- Date: 2025-11-03

-- Add retention policy fields to audit_logs table
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS retention_category VARCHAR(50) DEFAULT 'PERMANENT' CHECK (retention_category IN ('LOGIN', 'PERMANENT')),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_retention ON audit_logs(retention_category, expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_timestamp ON audit_logs(action, timestamp);

-- Create audit_log_retention_policies table
CREATE TABLE IF NOT EXISTS audit_log_retention_policies (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) UNIQUE NOT NULL,
    retention_days INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default retention policies (NABL ISO 15189 compliant)
INSERT INTO audit_log_retention_policies (category, retention_days, description) VALUES
('LOGIN', 90, 'Login and authentication logs - retained for 90 days for security monitoring'),
('PERMANENT', -1, 'All other audit logs - retained permanently as per NABL ISO 15189 requirements')
ON CONFLICT (category) DO NOTHING;

-- Create function to automatically set expiry date based on retention policy
CREATE OR REPLACE FUNCTION set_audit_log_expiry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.retention_category = 'LOGIN' THEN
        -- Set expiry to 90 days from now for login logs
        NEW.expires_at := NEW.timestamp + INTERVAL '90 days';
    ELSE
        -- Permanent logs never expire
        NEW.expires_at := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set expiry on insert
DROP TRIGGER IF EXISTS trigger_set_audit_log_expiry ON audit_logs;
CREATE TRIGGER trigger_set_audit_log_expiry
    BEFORE INSERT ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION set_audit_log_expiry();

-- Create function to clean up expired audit logs
CREATE OR REPLACE FUNCTION cleanup_expired_audit_logs()
RETURNS TABLE(deleted_count INTEGER) AS $$
DECLARE
    rows_deleted INTEGER;
BEGIN
    DELETE FROM audit_logs
    WHERE expires_at IS NOT NULL
      AND expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS rows_deleted = ROW_COUNT;
    
    RETURN QUERY SELECT rows_deleted;
END;
$$ LANGUAGE plpgsql;

-- Create audit_log_cleanup_history table to track cleanup operations
CREATE TABLE IF NOT EXISTS audit_log_cleanup_history (
    id SERIAL PRIMARY KEY,
    cleanup_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logs_deleted INTEGER NOT NULL,
    retention_category VARCHAR(50),
    executed_by VARCHAR(255),
    notes TEXT
);

-- Add comments for documentation
COMMENT ON TABLE audit_log_retention_policies IS 'Defines retention policies for different categories of audit logs to comply with NABL ISO 15189';
COMMENT ON COLUMN audit_logs.retention_category IS 'Category determining retention policy: LOGIN (90 days) or PERMANENT (indefinite)';
COMMENT ON COLUMN audit_logs.expires_at IS 'Timestamp when this log entry expires and can be deleted. NULL means permanent retention.';
COMMENT ON COLUMN audit_logs.user_agent IS 'Browser/client user agent string for login tracking';
COMMENT ON COLUMN audit_logs.session_id IS 'Session identifier for correlating related actions';
COMMENT ON FUNCTION cleanup_expired_audit_logs() IS 'Deletes audit logs that have passed their retention period. Returns count of deleted logs.';

-- Create view for login activity monitoring
CREATE OR REPLACE VIEW login_activity_summary AS
SELECT 
    DATE(timestamp) as login_date,
    action,
    COUNT(*) as attempt_count,
    COUNT(DISTINCT username) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips,
    COUNT(CASE WHEN action = 'LOGIN_SUCCESS' THEN 1 END) as successful_logins,
    COUNT(CASE WHEN action = 'LOGIN_FAILED' THEN 1 END) as failed_logins
FROM audit_logs
WHERE retention_category = 'LOGIN'
  AND action IN ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT')
GROUP BY DATE(timestamp), action
ORDER BY login_date DESC, action;

-- Create view for NABL compliance reporting
CREATE OR REPLACE VIEW nabl_audit_compliance_report AS
SELECT 
    retention_category,
    COUNT(*) as total_logs,
    MIN(timestamp) as oldest_log,
    MAX(timestamp) as newest_log,
    COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP THEN 1 END) as expired_logs,
    COUNT(CASE WHEN expires_at IS NULL THEN 1 END) as permanent_logs
FROM audit_logs
GROUP BY retention_category;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT ON login_activity_summary TO lms_user;
-- GRANT SELECT ON nabl_audit_compliance_report TO lms_user;

COMMENT ON VIEW login_activity_summary IS 'Summary of login activity for security monitoring and compliance reporting';
COMMENT ON VIEW nabl_audit_compliance_report IS 'Compliance report showing audit log retention status per NABL ISO 15189 requirements';


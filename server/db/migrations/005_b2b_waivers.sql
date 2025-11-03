-- Migration: B2B Waivers/Discounts Tracking
-- Purpose: Track waivers and discounts given to B2B clients during settlement

-- Create waivers table
CREATE TABLE IF NOT EXISTS b2b_waivers (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  waiver_amount NUMERIC(10, 2) NOT NULL CHECK (waiver_amount > 0),
  original_balance NUMERIC(10, 2) NOT NULL,
  amount_received NUMERIC(10, 2) NOT NULL,
  payment_mode VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  approved_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

-- Create index for faster queries
CREATE INDEX idx_b2b_waivers_client_id ON b2b_waivers(client_id);
CREATE INDEX idx_b2b_waivers_created_at ON b2b_waivers(created_at);

-- Create view for waiver summary by client
CREATE OR REPLACE VIEW b2b_waiver_summary AS
SELECT 
  c.id as client_id,
  c.name as client_name,
  COUNT(w.id) as total_waivers,
  SUM(w.waiver_amount) as total_waiver_amount,
  SUM(w.original_balance) as total_original_balance,
  SUM(w.amount_received) as total_amount_received,
  MAX(w.created_at) as last_waiver_date
FROM clients c
LEFT JOIN b2b_waivers w ON c.id = w.client_id
WHERE c.type = 'REFERRAL_LAB'
GROUP BY c.id, c.name
ORDER BY total_waiver_amount DESC NULLS LAST;

-- Create view for recent waivers
CREATE OR REPLACE VIEW b2b_recent_waivers AS
SELECT 
  w.id,
  w.client_id,
  c.name as client_name,
  w.waiver_amount,
  w.original_balance,
  w.amount_received,
  w.payment_mode,
  w.reason,
  w.description,
  w.created_at,
  u.username as created_by_username
FROM b2b_waivers w
JOIN clients c ON w.client_id = c.id
LEFT JOIN users u ON w.created_by = u.id
ORDER BY w.created_at DESC;

-- Grant permissions
GRANT SELECT, INSERT ON b2b_waivers TO lms_user;
GRANT USAGE, SELECT ON SEQUENCE b2b_waivers_id_seq TO lms_user;
GRANT SELECT ON b2b_waiver_summary TO lms_user;
GRANT SELECT ON b2b_recent_waivers TO lms_user;

-- Show summary
SELECT 'B2B Waivers table created successfully' as status;


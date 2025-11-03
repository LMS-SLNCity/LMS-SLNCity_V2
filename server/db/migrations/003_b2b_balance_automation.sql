-- Migration: B2B Balance Automation
-- This migration adds triggers to automatically manage B2B client balances and ledger entries

-- Function to update client balance when a visit is created or updated
CREATE OR REPLACE FUNCTION update_client_balance_on_visit()
RETURNS TRIGGER AS $$
DECLARE
    balance_change DECIMAL(12, 2);
    old_due DECIMAL(12, 2);
    new_due DECIMAL(12, 2);
BEGIN
    -- Only process if this is a B2B client visit
    IF NEW.ref_customer_id IS NOT NULL THEN
        
        IF TG_OP = 'INSERT' THEN
            -- New visit: Add due amount to client balance
            IF NEW.due_amount > 0 THEN
                -- Create DEBIT ledger entry
                INSERT INTO ledger_entries (client_id, visit_id, type, amount, description)
                VALUES (
                    NEW.ref_customer_id,
                    NEW.id,
                    'DEBIT',
                    NEW.due_amount,
                    'Visit ' || NEW.visit_code || ' - Outstanding amount'
                );
                
                -- Increase client balance
                UPDATE clients
                SET balance = balance + NEW.due_amount,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = NEW.ref_customer_id;
            END IF;
            
        ELSIF TG_OP = 'UPDATE' THEN
            -- Visit updated: Adjust balance based on due amount change
            old_due := OLD.due_amount;
            new_due := NEW.due_amount;
            balance_change := new_due - old_due;
            
            IF balance_change != 0 THEN
                -- Update client balance
                UPDATE clients
                SET balance = balance + balance_change,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = NEW.ref_customer_id;
                
                -- Create ledger entry for the adjustment
                IF balance_change > 0 THEN
                    -- Due amount increased (payment was reduced or cost increased)
                    INSERT INTO ledger_entries (client_id, visit_id, type, amount, description)
                    VALUES (
                        NEW.ref_customer_id,
                        NEW.id,
                        'DEBIT',
                        ABS(balance_change),
                        'Visit ' || NEW.visit_code || ' - Balance adjustment (due increased)'
                    );
                ELSE
                    -- Due amount decreased (payment was made)
                    INSERT INTO ledger_entries (client_id, visit_id, type, amount, description)
                    VALUES (
                        NEW.ref_customer_id,
                        NEW.id,
                        'CREDIT',
                        ABS(balance_change),
                        'Visit ' || NEW.visit_code || ' - Payment received'
                    );
                END IF;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_client_balance_on_visit ON visits;

-- Create trigger for INSERT and UPDATE on visits
CREATE TRIGGER trigger_update_client_balance_on_visit
AFTER INSERT OR UPDATE OF due_amount, amount_paid ON visits
FOR EACH ROW
EXECUTE FUNCTION update_client_balance_on_visit();

-- Function to handle visit deletion (reverse the balance)
CREATE OR REPLACE FUNCTION reverse_client_balance_on_visit_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if this was a B2B client visit
    IF OLD.ref_customer_id IS NOT NULL AND OLD.due_amount > 0 THEN
        -- Decrease client balance
        UPDATE clients
        SET balance = balance - OLD.due_amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.ref_customer_id;
        
        -- Create CREDIT ledger entry to reverse the debit
        INSERT INTO ledger_entries (client_id, visit_id, type, amount, description)
        VALUES (
            OLD.ref_customer_id,
            NULL, -- Visit is being deleted
            'CREDIT',
            OLD.due_amount,
            'Visit ' || OLD.visit_code || ' - Deleted/Reversed'
        );
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_reverse_client_balance_on_visit_delete ON visits;

-- Create trigger for DELETE on visits
CREATE TRIGGER trigger_reverse_client_balance_on_visit_delete
BEFORE DELETE ON visits
FOR EACH ROW
EXECUTE FUNCTION reverse_client_balance_on_visit_delete();

-- Create view for B2B client balance reconciliation
CREATE OR REPLACE VIEW b2b_balance_reconciliation AS
SELECT 
    c.id as client_id,
    c.name as client_name,
    c.balance as current_balance,
    COALESCE(SUM(CASE WHEN le.type = 'DEBIT' THEN le.amount ELSE 0 END), 0) as total_debits,
    COALESCE(SUM(CASE WHEN le.type = 'CREDIT' THEN le.amount ELSE 0 END), 0) as total_credits,
    COALESCE(SUM(CASE WHEN le.type = 'DEBIT' THEN le.amount ELSE -le.amount END), 0) as calculated_balance,
    COALESCE(SUM(v.due_amount), 0) as total_outstanding_from_visits,
    c.balance - COALESCE(SUM(CASE WHEN le.type = 'DEBIT' THEN le.amount ELSE -le.amount END), 0) as balance_discrepancy
FROM clients c
LEFT JOIN ledger_entries le ON c.id = le.client_id
LEFT JOIN visits v ON c.id = v.ref_customer_id
WHERE c.type = 'REFERRAL_LAB'
GROUP BY c.id, c.name, c.balance;

-- Add comments for documentation
COMMENT ON FUNCTION update_client_balance_on_visit() IS 'Automatically updates B2B client balance and creates ledger entries when visits are created or updated';
COMMENT ON FUNCTION reverse_client_balance_on_visit_delete() IS 'Reverses B2B client balance when a visit is deleted';
COMMENT ON VIEW b2b_balance_reconciliation IS 'Shows B2B client balance reconciliation between ledger entries and actual balance';

-- Create index for better performance on ledger queries
CREATE INDEX IF NOT EXISTS idx_ledger_entries_type ON ledger_entries(type);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_visit_id ON ledger_entries(visit_id);

-- Grant necessary permissions (adjust as needed)
-- GRANT SELECT ON b2b_balance_reconciliation TO lms_user;

RAISE NOTICE 'B2B balance automation migration completed successfully';


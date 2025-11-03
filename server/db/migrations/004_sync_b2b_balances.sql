-- Migration: Sync B2B Client Balances
-- Purpose: One-time sync of existing B2B client balances and ledger entries
-- This should be run after installing the balance automation triggers

-- Step 1: Create ledger entries for existing visits that don't have them
INSERT INTO ledger_entries (client_id, type, amount, description, visit_id, created_at)
SELECT 
  v.ref_customer_id,
  'DEBIT',
  v.due_amount,
  'Visit ' || v.visit_code || ' - Outstanding amount (historical sync)',
  v.id,
  v.created_at
FROM visits v
WHERE v.ref_customer_id IS NOT NULL
  AND v.due_amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM ledger_entries le 
    WHERE le.visit_id = v.id AND le.type = 'DEBIT'
  );

-- Step 2: Recalculate balance for all B2B clients from ledger entries
UPDATE clients c
SET balance = COALESCE((
  SELECT SUM(CASE WHEN le.type = 'DEBIT' THEN le.amount ELSE -le.amount END)
  FROM ledger_entries le
  WHERE le.client_id = c.id
), 0)
WHERE c.type = 'REFERRAL_LAB';

-- Step 3: Show reconciliation report
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
GROUP BY c.id, c.name, c.balance
ORDER BY c.name;

-- Step 4: Show summary
SELECT 
  COUNT(*) as total_b2b_clients,
  SUM(balance) as total_outstanding_balance,
  SUM(CASE WHEN balance > 0 THEN 1 ELSE 0 END) as clients_with_outstanding,
  SUM(CASE WHEN balance = 0 THEN 1 ELSE 0 END) as clients_fully_paid
FROM clients
WHERE type = 'REFERRAL_LAB';

-- Note: If you see any balance discrepancies, you may need to manually investigate
-- and correct the ledger entries or visit data.


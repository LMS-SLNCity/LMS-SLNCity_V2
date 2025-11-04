import pool from '../db/connection.js';

/**
 * Ledger Validation Utility
 * Ensures ledger entries always tally with client balances
 * Detects and reports any abnormalities
 */

export interface LedgerValidationResult {
  isValid: boolean;
  clientId: number;
  clientName: string;
  storedBalance: number;
  calculatedBalance: number;
  difference: number;
  totalDebits: number;
  totalCredits: number;
  entryCount: number;
  warnings: string[];
}

/**
 * Validate ledger for a specific client
 */
export async function validateClientLedger(clientId: number): Promise<LedgerValidationResult> {
  const client = await pool.query(
    'SELECT id, name, balance FROM clients WHERE id = $1',
    [clientId]
  );

  if (client.rows.length === 0) {
    throw new Error(`Client ${clientId} not found`);
  }

  const clientData = client.rows[0];
  const storedBalance = parseFloat(clientData.balance);

  // Calculate balance from ledger entries
  const ledgerSummary = await pool.query(
    `SELECT 
      COUNT(*) as entry_count,
      COALESCE(SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END), 0) as total_debits,
      COALESCE(SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END), 0) as total_credits,
      COALESCE(SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE -amount END), 0) as calculated_balance
    FROM ledger_entries
    WHERE client_id = $1`,
    [clientId]
  );

  const summary = ledgerSummary.rows[0];
  const calculatedBalance = parseFloat(summary.calculated_balance);
  const totalDebits = parseFloat(summary.total_debits);
  const totalCredits = parseFloat(summary.total_credits);
  const entryCount = parseInt(summary.entry_count);

  const difference = Math.abs(calculatedBalance - storedBalance);
  const isValid = difference < 0.01; // Allow 1 paisa tolerance for rounding

  const warnings: string[] = [];

  if (!isValid) {
    warnings.push(
      `Balance mismatch: Stored=₹${storedBalance.toFixed(2)}, Calculated=₹${calculatedBalance.toFixed(2)}, Difference=₹${difference.toFixed(2)}`
    );
  }

  // Check for orphaned ledger entries (visit_id references non-existent visits)
  const orphanedEntries = await pool.query(
    `SELECT le.id, le.visit_id, le.amount, le.description
    FROM ledger_entries le
    LEFT JOIN visits v ON le.visit_id = v.id
    WHERE le.client_id = $1 AND le.visit_id IS NOT NULL AND v.id IS NULL`,
    [clientId]
  );

  if (orphanedEntries.rows.length > 0) {
    warnings.push(
      `Found ${orphanedEntries.rows.length} orphaned ledger entries (referencing deleted visits)`
    );
  }

  // Check for visits without corresponding ledger entries
  const visitsWithoutLedger = await pool.query(
    `SELECT v.id, v.visit_code, v.total_cost
    FROM visits v
    LEFT JOIN ledger_entries le ON v.id = le.visit_id AND le.type = 'DEBIT'
    WHERE v.ref_customer_id = $1 AND v.payment_mode = 'CREDIT' AND le.id IS NULL`,
    [clientId]
  );

  if (visitsWithoutLedger.rows.length > 0) {
    warnings.push(
      `Found ${visitsWithoutLedger.rows.length} credit visits without ledger entries`
    );
  }

  // Check if total debits match total visit costs
  const visitCostSum = await pool.query(
    `SELECT COALESCE(SUM(v.total_cost), 0) as total_visit_cost
    FROM visits v
    WHERE v.ref_customer_id = $1 AND v.payment_mode = 'CREDIT'`,
    [clientId]
  );

  const totalVisitCost = parseFloat(visitCostSum.rows[0].total_visit_cost);
  const visitCostDifference = Math.abs(totalDebits - totalVisitCost);

  if (visitCostDifference > 0.01) {
    warnings.push(
      `Visit cost mismatch: Total visit costs=₹${totalVisitCost.toFixed(2)}, Total debits=₹${totalDebits.toFixed(2)}`
    );
  }

  return {
    isValid,
    clientId,
    clientName: clientData.name,
    storedBalance,
    calculatedBalance,
    difference,
    totalDebits,
    totalCredits,
    entryCount,
    warnings,
  };
}

/**
 * Validate ledger for all B2B clients
 */
export async function validateAllLedgers(): Promise<LedgerValidationResult[]> {
  const clients = await pool.query(
    "SELECT id FROM clients WHERE type IN ('REFERRAL_LAB', 'INTERNAL')"
  );

  const results: LedgerValidationResult[] = [];

  for (const client of clients.rows) {
    try {
      const result = await validateClientLedger(client.id);
      results.push(result);
    } catch (error) {
      console.error(`Error validating ledger for client ${client.id}:`, error);
    }
  }

  return results;
}

/**
 * Fix client balance based on ledger entries
 * USE WITH CAUTION - This will overwrite the stored balance
 */
export async function fixClientBalance(clientId: number): Promise<void> {
  const validation = await validateClientLedger(clientId);

  if (validation.isValid) {
    console.log(`✅ Client ${clientId} balance is already correct`);
    return;
  }

  console.log(`🔧 Fixing balance for client ${clientId}...`);
  console.log(`   Old balance: ₹${validation.storedBalance.toFixed(2)}`);
  console.log(`   New balance: ₹${validation.calculatedBalance.toFixed(2)}`);

  await pool.query(
    'UPDATE clients SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [validation.calculatedBalance, clientId]
  );

  console.log(`✅ Balance fixed for client ${clientId}`);
}

/**
 * Generate ledger validation report
 */
export function generateValidationReport(results: LedgerValidationResult[]): string {
  let report = '\n';
  report += '============================================\n';
  report += '📊 LEDGER VALIDATION REPORT\n';
  report += '============================================\n\n';

  const validClients = results.filter(r => r.isValid && r.warnings.length === 0);
  const invalidClients = results.filter(r => !r.isValid || r.warnings.length > 0);

  report += `Total Clients: ${results.length}\n`;
  report += `✅ Valid: ${validClients.length}\n`;
  report += `⚠️  Issues: ${invalidClients.length}\n\n`;

  if (invalidClients.length > 0) {
    report += '⚠️  CLIENTS WITH ISSUES:\n';
    report += '============================================\n\n';

    for (const result of invalidClients) {
      report += `Client: ${result.clientName} (ID: ${result.clientId})\n`;
      report += `  Stored Balance: ₹${result.storedBalance.toFixed(2)}\n`;
      report += `  Calculated Balance: ₹${result.calculatedBalance.toFixed(2)}\n`;
      report += `  Difference: ₹${result.difference.toFixed(2)}\n`;
      report += `  Total Debits: ₹${result.totalDebits.toFixed(2)}\n`;
      report += `  Total Credits: ₹${result.totalCredits.toFixed(2)}\n`;
      report += `  Entry Count: ${result.entryCount}\n`;

      if (result.warnings.length > 0) {
        report += `  Warnings:\n`;
        for (const warning of result.warnings) {
          report += `    - ${warning}\n`;
        }
      }
      report += '\n';
    }
  }

  if (validClients.length > 0) {
    report += '✅ VALID CLIENTS:\n';
    report += '============================================\n\n';

    for (const result of validClients) {
      report += `${result.clientName} (ID: ${result.clientId}): ₹${result.storedBalance.toFixed(2)} `;
      report += `(${result.entryCount} entries)\n`;
    }
  }

  report += '\n============================================\n';

  return report;
}

/**
 * Middleware to validate ledger after operations
 */
export async function validateLedgerMiddleware(clientId: number): Promise<void> {
  const validation = await validateClientLedger(clientId);

  if (!validation.isValid) {
    console.error('🚨 LEDGER VALIDATION FAILED:', validation);
    throw new Error(
      `Ledger validation failed for client ${clientId}: ${validation.warnings.join(', ')}`
    );
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️  LEDGER WARNINGS:', validation.warnings);
  }
}


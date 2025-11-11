import express, { Request, Response } from 'express';
import pool from '../db/connection.js';
import bcrypt from 'bcryptjs';
import { createAuditLog } from '../middleware/auditLogger.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  validateClientLedger,
  validateAllLedgers,
  generateValidationReport
} from '../utils/ledgerValidator.js';
import { mediumCache } from '../middleware/cache.js';

const router = express.Router();

// Cache for 5 minutes - client list changes occasionally
router.get('/', mediumCache, async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT id, name, type, balance FROM clients ORDER BY id');
    res.json(result.rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      balance: parseFloat(row.balance),
    })));
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, type } = req.body;
    const result = await pool.query(
      'INSERT INTO clients (name, type, balance) VALUES ($1, $2, $3) RETURNING id, name, type, balance',
      [name, type, 0]
    );
    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      name: row.name,
      type: row.type,
      balance: parseFloat(row.balance),
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get client prices
router.get('/:id/prices', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, client_id, test_template_id, price FROM client_prices WHERE client_id = $1',
      [req.params.id]
    );
    res.json(result.rows.map(row => ({
      id: row.id,
      clientId: row.client_id,
      testTemplateId: row.test_template_id,
      price: parseFloat(row.price),
    })));
  } catch (error) {
    console.error('Error fetching client prices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update client prices
router.post('/:id/prices', async (req: Request, res: Response) => {
  try {
    const { clientId, prices } = req.body;
    const client = await pool.query('SELECT id FROM clients WHERE id = $1', [clientId]);
    if (client.rows.length === 0) return res.status(404).json({ error: 'Client not found' });

    // Delete existing prices
    await pool.query('DELETE FROM client_prices WHERE client_id = $1', [clientId]);

    // Insert new prices
    for (const price of prices) {
      await pool.query(
        'INSERT INTO client_prices (client_id, test_template_id, price) VALUES ($1, $2, $3)',
        [clientId, price.testTemplateId, price.price]
      );
    }

    res.json({ message: 'Client prices updated' });
  } catch (error) {
    console.error('Error updating client prices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get ledger entries for a client
router.get('/:id/ledger', authMiddleware, async (req: Request, res: Response) => {
  try {
    const clientId = req.params.id;
    const user = (req as any).user;

    // Security: If user is a B2B_CLIENT, they can only access their own ledger
    if (user && user.role === 'B2B_CLIENT') {
      const userClientId = (user as any).clientId;

      if (!userClientId) {
        return res.status(403).json({ error: 'Client ID not found in token' });
      }

      // Ensure B2B client can only access their own ledger
      if (parseInt(clientId) !== parseInt(userClientId)) {
        console.warn(`⚠️  B2B Client ${userClientId} attempted to access ledger for client ${clientId}`);
        return res.status(403).json({ error: 'Access denied: You can only view your own transactions' });
      }
    }

    console.log(`📊 Fetching ledger for client_id: ${clientId} (type: ${typeof clientId})`);

    const result = await pool.query(
      `SELECT id, client_id, visit_id, type, amount, description, created_at
       FROM ledger_entries
       WHERE client_id = $1
       ORDER BY created_at DESC`,
      [clientId]
    );

    console.log(`✅ Found ${result.rows.length} ledger entries for client ${clientId}`);

    // Security verification: Double-check all entries belong to this client
    const invalidEntries = result.rows.filter(row => row.client_id !== parseInt(clientId));
    if (invalidEntries.length > 0) {
      console.error(`🚨 CRITICAL: Query returned entries for wrong clients!`, invalidEntries.map(e => e.client_id));
    }

    // Log first entry for debugging
    if (result.rows.length > 0) {
      console.log(`📋 First entry: client_id=${result.rows[0].client_id}, amount=${result.rows[0].amount}`);
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching ledger entries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add client payment (ledger entry)
router.post('/:id/payment', async (req: Request, res: Response) => {
  try {
    const { amount, description } = req.body;
    const clientId = req.params.id;

    // Verify client exists
    const client = await pool.query('SELECT id, balance FROM clients WHERE id = $1', [clientId]);
    if (client.rows.length === 0) return res.status(404).json({ error: 'Client not found' });

    // Create ledger entry for payment (CREDIT)
    // This will automatically update the client balance via trigger
    const ledgerResult = await pool.query(
      'INSERT INTO ledger_entries (client_id, type, amount, description) VALUES ($1, $2, $3, $4) RETURNING id, client_id, type, amount, description, created_at',
      [clientId, 'CREDIT', amount, description || 'Payment received']
    );

    // Manually update client balance (since ledger entries don't have triggers yet)
    const newBalance = parseFloat(client.rows[0].balance) - amount;
    await pool.query(
      'UPDATE clients SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newBalance, clientId]
    );

    // Get updated balance
    const updatedClient = await pool.query('SELECT balance FROM clients WHERE id = $1', [clientId]);

    // Audit log: Payment received
    await createAuditLog({
      username: (req as any).user?.username || 'system',
      action: 'B2B_PAYMENT_RECEIVED',
      details: `Payment of ₹${amount} received for client ID ${clientId}. ${description || ''}`,
      userId: (req as any).user?.id,
      resource: 'client',
      resourceId: parseInt(clientId),
      oldValues: { balance: parseFloat(client.rows[0].balance) },
      newValues: { balance: parseFloat(updatedClient.rows[0].balance) },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      ledgerEntry: ledgerResult.rows[0],
      newBalance: parseFloat(updatedClient.rows[0].balance),
    });
  } catch (error) {
    console.error('Error adding client payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete client
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.id;

    // Verify client exists
    const client = await pool.query('SELECT id FROM clients WHERE id = $1', [clientId]);
    if (client.rows.length === 0) return res.status(404).json({ error: 'Client not found' });

    // Delete client
    await pool.query('DELETE FROM clients WHERE id = $1', [clientId]);

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Settle client balance (set to 0 and mark all visits as paid)
router.post('/:id/settle', async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const clientId = req.params.id;
    const { paymentMode, description, receivedAmount } = req.body;

    // Validate required fields
    if (!paymentMode) {
      return res.status(400).json({ error: 'Payment mode is required' });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Description is required' });
    }

    await client.query('BEGIN');

    // Verify client exists
    const clientResult = await client.query('SELECT id, name, balance FROM clients WHERE id = $1', [clientId]);
    if (clientResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Client not found' });
    }

    const previousBalance = parseFloat(clientResult.rows[0].balance);
    const clientName = clientResult.rows[0].name;

    if (previousBalance === 0) {
      await client.query('ROLLBACK');
      return res.json({
        message: 'Client balance is already zero',
        previousBalance: 0,
        newBalance: 0
      });
    }

    // Parse received amount (default to full balance if not provided)
    const amountReceived = receivedAmount ? parseFloat(receivedAmount) : previousBalance;

    // Validate received amount
    if (isNaN(amountReceived) || amountReceived <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid received amount' });
    }

    if (amountReceived > previousBalance) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Received amount cannot exceed outstanding balance' });
    }

    // Calculate waiver amount
    const waiverAmount = previousBalance - amountReceived;
    const hasWaiver = waiverAmount > 0.01; // More than 1 paisa

    // Get all unpaid visits for this client
    const visitsResult = await client.query(
      'SELECT id, visit_code, total_cost, amount_paid, due_amount FROM visits WHERE ref_customer_id = $1 AND due_amount > 0',
      [clientId]
    );

    const visitsUpdated = visitsResult.rows.length;
    const totalDueAmount = visitsResult.rows.reduce((sum, v) => sum + parseFloat(v.due_amount), 0);

    // Update all visits to mark them as fully paid
    // This will trigger the balance update trigger automatically
    await client.query(
      `UPDATE visits
       SET amount_paid = total_cost,
           due_amount = 0,
           updated_at = CURRENT_TIMESTAMP
       WHERE ref_customer_id = $1 AND due_amount > 0`,
      [clientId]
    );

    // Create ledger entry for payment received (CREDIT)
    const paymentDescription = `${paymentMode} - ${description.trim()} - Payment received`;
    await client.query(
      'INSERT INTO ledger_entries (client_id, type, amount, description) VALUES ($1, $2, $3, $4)',
      [clientId, 'CREDIT', amountReceived, paymentDescription]
    );

    // If there's a waiver, create waiver entry and ledger entry
    if (hasWaiver) {
      // Extract waiver reason from description (format: "payment desc | Waiver: reason")
      const waiverReason = description.includes('| Waiver:')
        ? description.split('| Waiver:')[1].trim()
        : 'Discount/Waiver';

      // Create waiver record
      await client.query(
        `INSERT INTO b2b_waivers (client_id, waiver_amount, original_balance, amount_received, payment_mode, reason, description, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [clientId, waiverAmount, previousBalance, amountReceived, paymentMode, waiverReason, description.trim(), (req as any).user?.id]
      );

      // Create ledger entry for waiver (CREDIT)
      const waiverDescription = `Waiver/Discount - ${waiverReason}`;
      await client.query(
        'INSERT INTO ledger_entries (client_id, type, amount, description) VALUES ($1, $2, $3, $4)',
        [clientId, 'CREDIT', waiverAmount, waiverDescription]
      );
    }

    // Ensure balance is set to 0 (should already be 0 from trigger, but just to be safe)
    await client.query(
      'UPDATE clients SET balance = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [clientId]
    );

    // Audit log: Balance settlement
    const auditDetails = hasWaiver
      ? `Settled balance of ₹${previousBalance} for ${clientName}. Received: ₹${amountReceived}, Waiver: ₹${waiverAmount}. Payment Mode: ${paymentMode}. ${description.trim()}. ${visitsUpdated} visit(s) marked as paid.`
      : `Settled balance of ₹${previousBalance} for ${clientName}. Payment Mode: ${paymentMode}. ${description.trim()}. ${visitsUpdated} visit(s) marked as paid.`;

    await createAuditLog({
      username: (req as any).user?.username || 'system',
      action: 'B2B_BALANCE_SETTLED',
      details: auditDetails,
      userId: (req as any).user?.id,
      resource: 'client',
      resourceId: parseInt(clientId),
      oldValues: {
        balance: previousBalance,
        unpaidVisits: visitsUpdated,
        totalDue: totalDueAmount
      },
      newValues: {
        balance: 0,
        unpaidVisits: 0,
        totalDue: 0,
        amountReceived: amountReceived,
        waiverAmount: hasWaiver ? waiverAmount : 0,
        paymentMode: paymentMode
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    await client.query('COMMIT');

    res.json({
      message: `Settlement completed for ${clientName}`,
      previousBalance: previousBalance,
      newBalance: 0,
      amountReceived: amountReceived,
      waiverAmount: hasWaiver ? waiverAmount : 0,
      visitsUpdated: visitsUpdated,
      paymentMode: paymentMode,
      description: description.trim()
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error settling client balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Set up client login credentials
router.post('/:id/setup-login', async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    const clientId = req.params.id;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Verify client exists
    const client = await pool.query('SELECT id FROM clients WHERE id = $1', [clientId]);
    if (client.rows.length === 0) return res.status(404).json({ error: 'Client not found' });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert or update login credentials
    const result = await pool.query(
      `INSERT INTO b2b_client_logins (client_id, password_hash, is_active)
       VALUES ($1, $2, true)
       ON CONFLICT (client_id) DO UPDATE SET password_hash = $2, is_active = true
       RETURNING client_id, is_active`,
      [clientId, hashedPassword]
    );

    res.json({
      message: 'Client login credentials set up successfully',
      clientId: result.rows[0].client_id,
      isActive: result.rows[0].is_active,
    });
  } catch (error) {
    console.error('Error setting up client login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get client login status
router.get('/:id/login-status', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.id;

    const result = await pool.query(
      `SELECT bcl.client_id, bcl.is_active, bcl.last_login, c.name, c.type
       FROM b2b_client_logins bcl
       JOIN clients c ON bcl.client_id = c.id
       WHERE bcl.client_id = $1`,
      [clientId]
    );

    if (result.rows.length === 0) {
      return res.json({
        clientId: clientId,
        hasLogin: false,
        isActive: false,
      });
    }

    const row = result.rows[0];
    res.json({
      clientId: row.client_id,
      name: row.name,
      type: row.type,
      hasLogin: true,
      isActive: row.is_active,
      lastLogin: row.last_login,
    });
  } catch (error) {
    console.error('Error fetching client login status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Disable client login
router.post('/:id/disable-login', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.id;

    const result = await pool.query(
      'UPDATE b2b_client_logins SET is_active = false WHERE client_id = $1 RETURNING client_id, is_active',
      [clientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client login not found' });
    }

    res.json({
      message: 'Client login disabled',
      clientId: result.rows[0].client_id,
      isActive: result.rows[0].is_active,
    });
  } catch (error) {
    console.error('Error disabling client login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single client (must be after all specific routes)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT id, name, type, balance FROM clients WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      type: row.type,
      balance: parseFloat(row.balance),
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update client (must be after all specific routes)
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { name, type, balance } = req.body;
    const result = await pool.query(
      'UPDATE clients SET name = COALESCE($1, name), type = COALESCE($2, type), balance = COALESCE($3, balance), updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, name, type, balance',
      [name, type, balance, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      type: row.type,
      balance: parseFloat(row.balance),
    });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// LEDGER VALIDATION ENDPOINTS
// ============================================================================

// Validate ledger for a specific client
router.get('/:id/validate-ledger', authMiddleware, async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.id);
    const validation = await validateClientLedger(clientId);

    if (!validation.isValid || validation.warnings.length > 0) {
      console.warn('⚠️  Ledger validation issues:', validation);
    }

    res.json(validation);
  } catch (error) {
    console.error('Error validating ledger:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate all client ledgers (admin only)
router.get('/validate-all-ledgers', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Only SUDO and ADMIN can validate all ledgers
    if (!['SUDO', 'ADMIN'].includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const results = await validateAllLedgers();
    const report = generateValidationReport(results);

    console.log(report);

    res.json({
      results,
      report,
      summary: {
        total: results.length,
        valid: results.filter(r => r.isValid && r.warnings.length === 0).length,
        invalid: results.filter(r => !r.isValid || r.warnings.length > 0).length,
      },
    });
  } catch (error) {
    console.error('Error validating all ledgers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


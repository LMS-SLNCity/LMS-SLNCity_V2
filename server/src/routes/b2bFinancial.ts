/**
 * B2B Financial Management Routes
 * 
 * Handles B2B client financial tracking, invoicing, payment management, and reporting.
 */

import express, { Request, Response } from 'express';
import pool from '../db/connection.js';
import { generateInvoicePDF, generateInvoiceExcel } from '../services/exportService.js';

const router = express.Router();

/**
 * GET /api/b2b-financial/summary
 * Get financial summary for all B2B clients
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, client_id, status } = req.query;

    let query = `
      SELECT 
        c.id as client_id,
        c.name as client_name,
        c.balance as current_balance,
        COUNT(DISTINCT v.id) as total_visits,
        SUM(v.total_cost) as total_billed,
        SUM(v.amount_paid) as total_paid,
        SUM(v.due_amount) as total_due,
        MIN(v.registration_datetime) as first_visit_date,
        MAX(v.registration_datetime) as last_visit_date
      FROM clients c
      LEFT JOIN visits v ON c.id = v.ref_customer_id
      WHERE c.type = 'REFERRAL_LAB'
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Filter by client
    if (client_id && client_id !== 'all') {
      query += ` AND c.id = $${paramIndex}`;
      params.push(client_id);
      paramIndex++;
    }

    // Filter by date range
    if (start_date) {
      query += ` AND v.registration_datetime >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND v.registration_datetime <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    // Filter by payment status
    if (status === 'paid') {
      query += ` AND v.due_amount = 0`;
    } else if (status === 'unpaid') {
      query += ` AND v.due_amount > 0`;
    } else if (status === 'partial') {
      query += ` AND v.amount_paid > 0 AND v.due_amount > 0`;
    }

    query += `
      GROUP BY c.id, c.name, c.balance
      ORDER BY c.name
    `;

    const result = await pool.query(query, params);

    res.json(result.rows.map(row => ({
      clientId: row.client_id,
      clientName: row.client_name,
      currentBalance: parseFloat(row.current_balance || 0),
      totalVisits: parseInt(row.total_visits || 0),
      totalBilled: parseFloat(row.total_billed || 0),
      totalPaid: parseFloat(row.total_paid || 0),
      totalDue: parseFloat(row.total_due || 0),
      firstVisitDate: row.first_visit_date,
      lastVisitDate: row.last_visit_date,
    })));
  } catch (error) {
    console.error('Error fetching B2B financial summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/b2b-financial/client/:id/transactions
 * Get detailed transaction history for a specific B2B client
 */
router.get('/client/:id/transactions', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, type } = req.query;
    const clientId = req.params.id;

    let query = `
      SELECT 
        'VISIT' as transaction_type,
        v.id as transaction_id,
        v.visit_code as reference,
        v.registration_datetime as transaction_date,
        v.total_cost as amount,
        v.amount_paid,
        v.due_amount,
        v.payment_mode,
        p.name as patient_name,
        NULL as description
      FROM visits v
      JOIN patients p ON v.patient_id = p.id
      WHERE v.ref_customer_id = $1
    `;

    const params: any[] = [clientId];
    let paramIndex = 2;

    if (start_date) {
      query += ` AND v.registration_datetime >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND v.registration_datetime <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    query += `
      UNION ALL
      SELECT 
        'PAYMENT' as transaction_type,
        le.id as transaction_id,
        CAST(le.id AS VARCHAR) as reference,
        le.created_at as transaction_date,
        le.amount,
        le.amount as amount_paid,
        0 as due_amount,
        NULL as payment_mode,
        NULL as patient_name,
        le.description
      FROM ledger_entries le
      WHERE le.client_id = $1 AND le.type = 'CREDIT'
    `;

    if (start_date) {
      query += ` AND le.created_at >= $${params.length}`;
    }

    if (end_date) {
      query += ` AND le.created_at <= $${params.length + (start_date ? 1 : 0)}`;
    }

    query += `
      ORDER BY transaction_date DESC
    `;

    const result = await pool.query(query, params);

    res.json(result.rows.map(row => ({
      transactionType: row.transaction_type,
      transactionId: row.transaction_id,
      reference: row.reference,
      transactionDate: row.transaction_date,
      amount: parseFloat(row.amount),
      amountPaid: parseFloat(row.amount_paid || 0),
      dueAmount: parseFloat(row.due_amount || 0),
      paymentMode: row.payment_mode,
      patientName: row.patient_name,
      description: row.description,
    })));
  } catch (error) {
    console.error('Error fetching client transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/b2b-financial/client/:id/outstanding
 * Get outstanding (unpaid) visits for a specific B2B client
 */
router.get('/client/:id/outstanding', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.id;

    const result = await pool.query(
      `SELECT 
        v.id,
        v.visit_code,
        v.registration_datetime,
        v.total_cost,
        v.amount_paid,
        v.due_amount,
        p.name as patient_name,
        EXTRACT(DAY FROM (CURRENT_TIMESTAMP - v.registration_datetime)) as days_outstanding
      FROM visits v
      JOIN patients p ON v.patient_id = p.id
      WHERE v.ref_customer_id = $1 AND v.due_amount > 0
      ORDER BY v.registration_datetime ASC`,
      [clientId]
    );

    res.json(result.rows.map(row => ({
      id: row.id,
      visitCode: row.visit_code,
      registrationDate: row.registration_datetime,
      totalCost: parseFloat(row.total_cost),
      amountPaid: parseFloat(row.amount_paid),
      dueAmount: parseFloat(row.due_amount),
      patientName: row.patient_name,
      daysOutstanding: parseInt(row.days_outstanding),
    })));
  } catch (error) {
    console.error('Error fetching outstanding visits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/b2b-financial/client/:id/generate-invoice
 * Generate invoice data for a B2B client
 */
router.post('/client/:id/generate-invoice', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.id;
    const { start_date, end_date, include_paid } = req.body;

    // Get client details
    const clientResult = await pool.query(
      'SELECT id, name, balance FROM clients WHERE id = $1 AND type = \'REFERRAL_LAB\'',
      [clientId]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'B2B client not found' });
    }

    const client = clientResult.rows[0];

    // Get visits for the invoice period
    let query = `
      SELECT 
        v.id,
        v.visit_code,
        v.registration_datetime,
        v.total_cost,
        v.amount_paid,
        v.due_amount,
        p.name as patient_name,
        ARRAY_AGG(tt.name) as test_names
      FROM visits v
      JOIN patients p ON v.patient_id = p.id
      LEFT JOIN visit_tests vt ON v.id = vt.visit_id
      LEFT JOIN test_templates tt ON vt.test_template_id = tt.id
      WHERE v.ref_customer_id = $1
    `;

    const params: any[] = [clientId];
    let paramIndex = 2;

    if (start_date) {
      query += ` AND v.registration_datetime >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND v.registration_datetime <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    if (!include_paid) {
      query += ` AND v.due_amount > 0`;
    }

    query += `
      GROUP BY v.id, v.visit_code, v.registration_datetime, v.total_cost, v.amount_paid, v.due_amount, p.name
      ORDER BY v.registration_datetime ASC
    `;

    const visitsResult = await pool.query(query, params);

    const visits = visitsResult.rows.map(row => ({
      id: row.id,
      visitCode: row.visit_code,
      registrationDate: row.registration_datetime,
      totalCost: parseFloat(row.total_cost),
      amountPaid: parseFloat(row.amount_paid),
      dueAmount: parseFloat(row.due_amount),
      patientName: row.patient_name,
      testNames: row.test_names.filter((name: string | null) => name !== null),
    }));

    const totalAmount = visits.reduce((sum, v) => sum + v.totalCost, 0);
    const totalPaid = visits.reduce((sum, v) => sum + v.amountPaid, 0);
    const totalDue = visits.reduce((sum, v) => sum + v.dueAmount, 0);

    res.json({
      client: {
        id: client.id,
        name: client.name,
        currentBalance: parseFloat(client.balance),
      },
      invoicePeriod: {
        startDate: start_date || null,
        endDate: end_date || null,
      },
      visits,
      summary: {
        totalVisits: visits.length,
        totalAmount,
        totalPaid,
        totalDue,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/b2b-financial/client/:id/export-invoice-pdf
 * Export invoice as PDF
 */
router.post('/client/:id/export-invoice-pdf', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.id;
    const { start_date, end_date, include_paid } = req.body;

    // Get client details
    const clientResult = await pool.query(
      'SELECT id, name, balance FROM clients WHERE id = $1 AND type = \'REFERRAL_LAB\'',
      [clientId]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'B2B client not found' });
    }

    const client = clientResult.rows[0];

    // Get visits for the invoice period
    let query = `
      SELECT
        v.id,
        v.visit_code,
        v.registration_datetime,
        v.total_cost,
        v.amount_paid,
        v.due_amount,
        p.name as patient_name,
        ARRAY_AGG(tt.name) as test_names
      FROM visits v
      JOIN patients p ON v.patient_id = p.id
      LEFT JOIN visit_tests vt ON v.id = vt.visit_id
      LEFT JOIN test_templates tt ON vt.test_template_id = tt.id
      WHERE v.ref_customer_id = $1
    `;

    const params: any[] = [clientId];
    let paramIndex = 2;

    if (start_date) {
      query += ` AND v.registration_datetime >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND v.registration_datetime <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    if (!include_paid) {
      query += ` AND v.due_amount > 0`;
    }

    query += `
      GROUP BY v.id, v.visit_code, v.registration_datetime, v.total_cost, v.amount_paid, v.due_amount, p.name
      ORDER BY v.registration_datetime ASC
    `;

    const visitsResult = await pool.query(query, params);

    const visits = visitsResult.rows.map(row => ({
      id: row.id,
      visitCode: row.visit_code,
      registrationDate: row.registration_datetime,
      totalCost: parseFloat(row.total_cost),
      amountPaid: parseFloat(row.amount_paid),
      dueAmount: parseFloat(row.due_amount),
      patientName: row.patient_name,
      testNames: row.test_names.filter((name: string | null) => name !== null),
    }));

    const totalAmount = visits.reduce((sum, v) => sum + v.totalCost, 0);
    const totalPaid = visits.reduce((sum, v) => sum + v.amountPaid, 0);
    const totalDue = visits.reduce((sum, v) => sum + v.dueAmount, 0);

    const invoiceData = {
      client: {
        id: client.id,
        name: client.name,
        currentBalance: parseFloat(client.balance),
      },
      invoicePeriod: {
        startDate: start_date || null,
        endDate: end_date || null,
      },
      visits,
      summary: {
        totalVisits: visits.length,
        totalAmount,
        totalPaid,
        totalDue,
      },
      generatedAt: new Date().toISOString(),
    };

    generateInvoicePDF(invoiceData, res);
  } catch (error) {
    console.error('Error exporting invoice PDF:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/b2b-financial/client/:id/export-invoice-excel
 * Export invoice as Excel
 */
router.post('/client/:id/export-invoice-excel', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.id;
    const { start_date, end_date, include_paid } = req.body;

    // Get client details
    const clientResult = await pool.query(
      'SELECT id, name, balance FROM clients WHERE id = $1 AND type = \'REFERRAL_LAB\'',
      [clientId]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'B2B client not found' });
    }

    const client = clientResult.rows[0];

    // Get visits for the invoice period
    let query = `
      SELECT
        v.id,
        v.visit_code,
        v.registration_datetime,
        v.total_cost,
        v.amount_paid,
        v.due_amount,
        p.name as patient_name,
        ARRAY_AGG(tt.name) as test_names
      FROM visits v
      JOIN patients p ON v.patient_id = p.id
      LEFT JOIN visit_tests vt ON v.id = vt.visit_id
      LEFT JOIN test_templates tt ON vt.test_template_id = tt.id
      WHERE v.ref_customer_id = $1
    `;

    const params: any[] = [clientId];
    let paramIndex = 2;

    if (start_date) {
      query += ` AND v.registration_datetime >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND v.registration_datetime <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    if (!include_paid) {
      query += ` AND v.due_amount > 0`;
    }

    query += `
      GROUP BY v.id, v.visit_code, v.registration_datetime, v.total_cost, v.amount_paid, v.due_amount, p.name
      ORDER BY v.registration_datetime ASC
    `;

    const visitsResult = await pool.query(query, params);

    const visits = visitsResult.rows.map(row => ({
      id: row.id,
      visitCode: row.visit_code,
      registrationDate: row.registration_datetime,
      totalCost: parseFloat(row.total_cost),
      amountPaid: parseFloat(row.amount_paid),
      dueAmount: parseFloat(row.due_amount),
      patientName: row.patient_name,
      testNames: row.test_names.filter((name: string | null) => name !== null),
    }));

    const totalAmount = visits.reduce((sum, v) => sum + v.totalCost, 0);
    const totalPaid = visits.reduce((sum, v) => sum + v.amountPaid, 0);
    const totalDue = visits.reduce((sum, v) => sum + v.dueAmount, 0);

    const invoiceData = {
      client: {
        id: client.id,
        name: client.name,
        currentBalance: parseFloat(client.balance),
      },
      invoicePeriod: {
        startDate: start_date || null,
        endDate: end_date || null,
      },
      visits,
      summary: {
        totalVisits: visits.length,
        totalAmount,
        totalPaid,
        totalDue,
      },
      generatedAt: new Date().toISOString(),
    };

    await generateInvoiceExcel(invoiceData, res);
  } catch (error) {
    console.error('Error exporting invoice Excel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


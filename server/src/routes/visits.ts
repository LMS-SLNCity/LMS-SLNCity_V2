import express, { Request, Response } from 'express';
import pool from '../db/connection.js';
import { auditVisit } from '../middleware/auditLogger.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Security: If user is a B2B_CLIENT, filter visits to only show their own
    let query = `SELECT v.id, v.patient_id, v.referred_doctor_id, v.ref_customer_id, v.other_ref_doctor, v.other_ref_customer,
              v.registration_datetime, v.visit_code, v.total_cost, v.amount_paid, v.payment_mode, v.due_amount, v.created_at,
              p.salutation, p.name, p.age_years, p.age_months, p.age_days, p.sex, p.phone, p.address, p.email, p.clinical_history,
              c.id as client_id, c.name as client_name, c.type as client_type, c.balance as client_balance
       FROM visits v
       JOIN patients p ON v.patient_id = p.id
       LEFT JOIN clients c ON v.ref_customer_id = c.id`;

    const queryParams: any[] = [];

    if (user && user.role === 'B2B_CLIENT') {
      const userClientId = (user as any).clientId;

      if (!userClientId) {
        return res.status(403).json({ error: 'Client ID not found in token' });
      }

      // Filter to only show visits for this B2B client
      query += ` WHERE v.ref_customer_id = $1`;
      queryParams.push(userClientId);
      console.log(`🔒 B2B Client ${userClientId} accessing their visits only`);
    }

    query += ` ORDER BY v.created_at DESC`;

    const result = await pool.query(query, queryParams);

    // Get all test IDs for all visits in one query
    const testsResult = await pool.query(
      `SELECT visit_id, id FROM visit_tests ORDER BY visit_id, id`
    );

    // Create a map of visit_id -> test_ids
    const testsByVisit: Record<number, number[]> = {};
    testsResult.rows.forEach(row => {
      if (!testsByVisit[row.visit_id]) {
        testsByVisit[row.visit_id] = [];
      }
      testsByVisit[row.visit_id].push(row.id);
    });

    const visits = result.rows.map(row => ({
      id: row.id,
      patient_id: row.patient_id,
      referred_doctor_id: row.referred_doctor_id,
      ref_customer_id: row.ref_customer_id,
      other_ref_doctor: row.other_ref_doctor,
      other_ref_customer: row.other_ref_customer,
      registration_datetime: row.registration_datetime,
      visit_code: row.visit_code,
      total_cost: parseFloat(row.total_cost),
      amount_paid: parseFloat(row.amount_paid),
      payment_mode: row.payment_mode,
      due_amount: parseFloat(row.due_amount),
      created_at: row.created_at,
      patient: {
        id: row.patient_id,
        salutation: row.salutation,
        name: row.name,
        age_years: row.age_years,
        age_months: row.age_months,
        age_days: row.age_days,
        sex: row.sex,
        phone: row.phone,
        address: row.address,
        email: row.email,
        clinical_history: row.clinical_history,
      },
      b2bClient: row.client_id ? {
        id: row.client_id,
        name: row.client_name,
        type: row.client_type,
        balance: parseFloat(row.client_balance),
      } : null,
      tests: testsByVisit[row.id] || [],
    }));

    res.json(visits);
  } catch (error) {
    console.error('Error fetching visits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const result = await pool.query(
      `SELECT v.id, v.patient_id, v.referred_doctor_id, v.ref_customer_id, v.other_ref_doctor, v.other_ref_customer,
              v.registration_datetime, v.visit_code, v.total_cost, v.amount_paid, v.payment_mode, v.due_amount, v.created_at,
              p.salutation, p.name, p.age_years, p.age_months, p.age_days, p.sex, p.phone, p.address, p.email, p.clinical_history
       FROM visits v
       JOIN patients p ON v.patient_id = p.id
       WHERE v.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Visit not found' });
    const row = result.rows[0];

    // Security: If user is a B2B_CLIENT, ensure they can only access their own visits
    if (user && user.role === 'B2B_CLIENT') {
      const userClientId = (user as any).clientId;

      if (!userClientId) {
        return res.status(403).json({ error: 'Client ID not found in token' });
      }

      if (row.ref_customer_id !== userClientId) {
        console.warn(`⚠️  B2B Client ${userClientId} attempted to access visit ${req.params.id} belonging to client ${row.ref_customer_id}`);
        return res.status(403).json({ error: 'Access denied: You can only view your own visits' });
      }
    }
    res.json({
      id: row.id,
      patient_id: row.patient_id,
      referred_doctor_id: row.referred_doctor_id,
      ref_customer_id: row.ref_customer_id,
      other_ref_doctor: row.other_ref_doctor,
      other_ref_customer: row.other_ref_customer,
      registration_datetime: row.registration_datetime,
      visit_code: row.visit_code,
      total_cost: parseFloat(row.total_cost),
      amount_paid: parseFloat(row.amount_paid),
      payment_mode: row.payment_mode,
      due_amount: parseFloat(row.due_amount),
      created_at: row.created_at,
      patient: {
        id: row.patient_id,
        salutation: row.salutation,
        name: row.name,
        age_years: row.age_years,
        age_months: row.age_months,
        age_days: row.age_days,
        sex: row.sex,
        phone: row.phone,
        address: row.address,
        email: row.email,
        clinical_history: row.clinical_history,
      },
      tests: [],
    });
  } catch (error) {
    console.error('Error fetching visit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { patient_id, referred_doctor_id, ref_customer_id, other_ref_doctor, other_ref_customer, registration_datetime, total_cost, amount_paid, payment_mode } = req.body;

    const due_amount = total_cost - amount_paid;

    // Visit code will be auto-generated by the trigger
    const result = await pool.query(
      `INSERT INTO visits (patient_id, referred_doctor_id, ref_customer_id, other_ref_doctor, other_ref_customer, registration_datetime, total_cost, amount_paid, payment_mode, due_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, patient_id, referred_doctor_id, ref_customer_id, other_ref_doctor, other_ref_customer, registration_datetime, visit_code, total_cost, amount_paid, payment_mode, due_amount`,
      [patient_id, referred_doctor_id, ref_customer_id, other_ref_doctor, other_ref_customer, registration_datetime, total_cost, amount_paid, payment_mode, due_amount]
    );

    const visit = result.rows[0];

    // Audit log: Visit creation
    await auditVisit.create(req, visit.id, visit);

    res.status(201).json(visit);
  } catch (error) {
    console.error('Error creating visit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { amount_paid, payment_mode } = req.body;
    
    // Get current visit to calculate new due amount
    const visitResult = await pool.query('SELECT total_cost FROM visits WHERE id = $1', [req.params.id]);
    if (visitResult.rows.length === 0) return res.status(404).json({ error: 'Visit not found' });
    
    const total_cost = visitResult.rows[0].total_cost;
    const new_amount_paid = amount_paid || 0;
    const due_amount = total_cost - new_amount_paid;
    
    const result = await pool.query(
      `UPDATE visits
       SET amount_paid = COALESCE($1, amount_paid),
           payment_mode = COALESCE($2, payment_mode),
           due_amount = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, patient_id, referred_doctor_id, ref_customer_id, other_ref_doctor, other_ref_customer, registration_datetime, visit_code, total_cost, amount_paid, payment_mode, due_amount`,
      [amount_paid, payment_mode, due_amount, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating visit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


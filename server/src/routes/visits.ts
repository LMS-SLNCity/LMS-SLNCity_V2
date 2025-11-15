import express, { Request, Response } from 'express';
import pool from '../db/connection.js';
import { auditVisit } from '../middleware/auditLogger.js';
import { authMiddleware } from '../middleware/auth.js';
import { generateQRCode, generateVerificationUrl } from '../utils/qrcode.js';

const router = express.Router();

// Get frontend URL from environment or use default
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// No caching - visits change very frequently
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Security: If user is a B2B_CLIENT, filter visits to only show their own
    let query = `SELECT v.id, v.patient_id, v.referred_doctor_id, v.ref_customer_id, v.other_ref_doctor, v.other_ref_customer,
              v.registration_datetime, v.visit_code, v.total_cost, v.amount_paid, v.payment_mode, v.due_amount, v.created_at,
              p.salutation, p.name, p.age_years, p.age_months, p.age_days, p.sex, p.phone, p.address, p.email, p.clinical_history,
              c.id as client_id, c.name as client_name, c.type as client_type, c.balance as client_balance,
              rd.name as referred_doctor_name, rd.designation as referred_doctor_designation
       FROM visits v
       JOIN patients p ON v.patient_id = p.id
       LEFT JOIN clients c ON v.ref_customer_id = c.id
       LEFT JOIN referral_doctors rd ON v.referred_doctor_id = rd.id`;

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

    // Generate QR codes for all visits
    const visits = await Promise.all(result.rows.map(async (row) => {
      const verificationUrl = generateVerificationUrl(row.visit_code, FRONTEND_URL);
      const qrCodeDataUrl = await generateQRCode(verificationUrl, 100);

      return {
        id: row.id,
        patient_id: row.patient_id,
        referred_doctor_id: row.referred_doctor_id,
        referred_doctor_name: row.referred_doctor_name,
        referred_doctor_designation: row.referred_doctor_designation,
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
        qr_code: qrCodeDataUrl,
        verification_url: verificationUrl,
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
      };
    }));

    res.json(visits);
  } catch (error) {
    console.error('Error fetching visits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const result = await pool.query(
      `SELECT v.id, v.patient_id, v.referred_doctor_id, v.ref_customer_id, v.other_ref_doctor, v.other_ref_customer,
              v.registration_datetime, v.visit_code, v.total_cost, v.amount_paid, v.payment_mode, v.due_amount, v.created_at,
              p.salutation, p.name, p.age_years, p.age_months, p.age_days, p.sex, p.phone, p.address, p.email, p.clinical_history,
              rd.name as referred_doctor_name, rd.designation as referred_doctor_designation
       FROM visits v
       JOIN patients p ON v.patient_id = p.id
       LEFT JOIN referral_doctors rd ON v.referred_doctor_id = rd.id
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

    // Generate QR code for visit verification
    const verificationUrl = generateVerificationUrl(row.visit_code, FRONTEND_URL);
    const qrCodeDataUrl = await generateQRCode(verificationUrl, 100);

    res.json({
      id: row.id,
      patient_id: row.patient_id,
      referred_doctor_id: row.referred_doctor_id,
      referred_doctor_name: row.referred_doctor_name,
      referred_doctor_designation: row.referred_doctor_designation,
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
      qr_code: qrCodeDataUrl,
      verification_url: verificationUrl,
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

// PATCH /api/visits/:id/edit-details - Edit visit and patient details (admin only)
router.patch('/:id/edit-details', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Only SUDO and ADMIN can edit visit details
    if (!['SUDO', 'ADMIN'].includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions. Only admins can edit visit details.' });
    }

    const visitId = parseInt(req.params.id);
    const {
      patientName,
      ageYears,
      ageMonths,
      ageDays,
      sex,
      phone,
      address,
      referredDoctorId,
      otherRefDoctor,
      refCustomerId,
      otherRefCustomer,
      editReason,
      editedBy
    } = req.body;

    if (!editReason || !editedBy) {
      return res.status(400).json({ error: 'Edit reason and edited by are required' });
    }

    // Get current visit and patient details for audit log
    const oldData = await pool.query(
      `SELECT v.*, p.name as patient_name, p.age_years, p.age_months, p.age_days, p.sex, p.phone, p.address
       FROM visits v
       JOIN patients p ON v.patient_id = p.id
       WHERE v.id = $1`,
      [visitId]
    );

    if (oldData.rows.length === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    const oldVisit = oldData.rows[0];

    // Update patient details
    if (patientName || ageYears !== undefined || ageMonths !== undefined || ageDays !== undefined || sex || phone || address) {
      await pool.query(
        `UPDATE patients
         SET name = COALESCE($1, name),
             age_years = COALESCE($2, age_years),
             age_months = COALESCE($3, age_months),
             age_days = COALESCE($4, age_days),
             sex = COALESCE($5, sex),
             phone = COALESCE($6, phone),
             address = COALESCE($7, address),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $8`,
        [patientName, ageYears, ageMonths, ageDays, sex, phone, address, oldVisit.patient_id]
      );
    }

    // Update visit details
    const visitResult = await pool.query(
      `UPDATE visits
       SET referred_doctor_id = COALESCE($1, referred_doctor_id),
           other_ref_doctor = COALESCE($2, other_ref_doctor),
           ref_customer_id = COALESCE($3, ref_customer_id),
           other_ref_customer = COALESCE($4, other_ref_customer),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, patient_id, referred_doctor_id, ref_customer_id, other_ref_doctor, other_ref_customer, registration_datetime, visit_code, total_cost, amount_paid, payment_mode, due_amount`,
      [referredDoctorId, otherRefDoctor, refCustomerId, otherRefCustomer, visitId]
    );

    // Build change summary for audit log
    const changes: string[] = [];
    if (patientName && patientName !== oldVisit.patient_name) changes.push(`Name: ${oldVisit.patient_name} → ${patientName}`);
    if (ageYears !== undefined && ageYears !== oldVisit.age_years) changes.push(`Age Years: ${oldVisit.age_years} → ${ageYears}`);
    if (ageMonths !== undefined && ageMonths !== oldVisit.age_months) changes.push(`Age Months: ${oldVisit.age_months} → ${ageMonths}`);
    if (ageDays !== undefined && ageDays !== oldVisit.age_days) changes.push(`Age Days: ${oldVisit.age_days} → ${ageDays}`);
    if (sex && sex !== oldVisit.sex) changes.push(`Sex: ${oldVisit.sex} → ${sex}`);
    if (phone && phone !== oldVisit.phone) changes.push(`Phone: ${oldVisit.phone} → ${phone}`);
    if (address && address !== oldVisit.address) changes.push(`Address: ${oldVisit.address} → ${address}`);
    if (referredDoctorId !== undefined && referredDoctorId !== oldVisit.referred_doctor_id) changes.push(`Referred Doctor ID: ${oldVisit.referred_doctor_id} → ${referredDoctorId}`);
    if (otherRefDoctor && otherRefDoctor !== oldVisit.other_ref_doctor) changes.push(`Other Ref Doctor: ${oldVisit.other_ref_doctor} → ${otherRefDoctor}`);
    if (refCustomerId !== undefined && refCustomerId !== oldVisit.ref_customer_id) changes.push(`Ref Customer ID: ${oldVisit.ref_customer_id} → ${refCustomerId}`);
    if (otherRefCustomer && otherRefCustomer !== oldVisit.other_ref_customer) changes.push(`Other Ref Customer: ${oldVisit.other_ref_customer} → ${otherRefCustomer}`);

    // Log edit in audit trail
    await pool.query(
      `INSERT INTO audit_logs (
        username,
        action,
        details,
        user_id,
        resource,
        resource_id,
        old_value,
        new_value
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        editedBy,
        'EDIT_VISIT_DETAILS',
        `Edited visit ${oldVisit.visit_code}. Changes: ${changes.join(', ')}. Reason: ${editReason}`,
        user.id,
        'visit',
        visitId,
        JSON.stringify({ patient: { name: oldVisit.patient_name, age_years: oldVisit.age_years, age_months: oldVisit.age_months, age_days: oldVisit.age_days, sex: oldVisit.sex, phone: oldVisit.phone, address: oldVisit.address }, visit: { referred_doctor_id: oldVisit.referred_doctor_id, other_ref_doctor: oldVisit.other_ref_doctor, ref_customer_id: oldVisit.ref_customer_id, other_ref_customer: oldVisit.other_ref_customer } }),
        JSON.stringify({ patient: { name: patientName, age_years: ageYears, age_months: ageMonths, age_days: ageDays, sex, phone, address }, visit: { referred_doctor_id: referredDoctorId, other_ref_doctor: otherRefDoctor, ref_customer_id: refCustomerId, other_ref_customer: otherRefCustomer } })
      ]
    );

    console.log(`Visit details edited: ${visitId} by ${editedBy}. Changes: ${changes.join(', ')}`);

    res.json(visitResult.rows[0]);
  } catch (error) {
    console.error('Error editing visit details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/visits/:id/edit-tests - Add or remove tests from a visit (admin only)
router.patch('/:id/edit-tests', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Only SUDO and ADMIN can edit visit tests
    if (!['SUDO', 'ADMIN'].includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions. Only admins can edit visit tests.' });
    }

    const visitId = parseInt(req.params.id);
    const {
      testsToAdd,      // Array of test_template_ids to add
      testsToRemove,   // Array of visit_test_ids to remove
      editReason,
      editedBy
    } = req.body;

    if (!editReason || !editedBy) {
      return res.status(400).json({ error: 'Edit reason and edited by are required' });
    }

    if ((!testsToAdd || testsToAdd.length === 0) && (!testsToRemove || testsToRemove.length === 0)) {
      return res.status(400).json({ error: 'No tests to add or remove' });
    }

    // Get current visit details
    const visitResult = await pool.query(
      `SELECT id, visit_code, total_cost, amount_paid, due_amount, ref_customer_id
       FROM visits WHERE id = $1`,
      [visitId]
    );

    if (visitResult.rows.length === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    const visit = visitResult.rows[0];
    const isB2BVisit = visit.ref_customer_id !== null;

    // Get current tests for audit log
    const currentTestsResult = await pool.query(
      `SELECT vt.id, vt.status, tt.name, tt.code, tt.price, tt.b2b_price
       FROM visit_tests vt
       JOIN test_templates tt ON vt.test_template_id = tt.id
       WHERE vt.visit_id = $1`,
      [visitId]
    );

    const currentTests = currentTestsResult.rows;
    const changes: string[] = [];
    let totalCostChange = 0;

    // Remove tests (only if they're in PENDING status)
    if (testsToRemove && testsToRemove.length > 0) {
      for (const visitTestId of testsToRemove) {
        const testToRemove = currentTests.find(t => t.id === visitTestId);

        if (!testToRemove) {
          return res.status(404).json({ error: `Test with ID ${visitTestId} not found in this visit` });
        }

        if (testToRemove.status !== 'PENDING') {
          return res.status(400).json({
            error: `Cannot remove test "${testToRemove.name}" (${testToRemove.code}). Only PENDING tests can be removed. Current status: ${testToRemove.status}`
          });
        }

        // Delete the test
        await pool.query('DELETE FROM visit_tests WHERE id = $1', [visitTestId]);

        const testPrice = isB2BVisit ? parseFloat(testToRemove.b2b_price) : parseFloat(testToRemove.price);
        totalCostChange -= testPrice;
        changes.push(`Removed: ${testToRemove.name} (${testToRemove.code}) - ₹${testPrice.toFixed(2)}`);
      }
    }

    // Add tests
    if (testsToAdd && testsToAdd.length > 0) {
      for (const testTemplateId of testsToAdd) {
        // Get test template details
        const templateResult = await pool.query(
          `SELECT id, name, code, price, b2b_price FROM test_templates WHERE id = $1`,
          [testTemplateId]
        );

        if (templateResult.rows.length === 0) {
          return res.status(404).json({ error: `Test template with ID ${testTemplateId} not found` });
        }

        const template = templateResult.rows[0];

        // Add the test
        await pool.query(
          `INSERT INTO visit_tests (visit_id, test_template_id, status)
           VALUES ($1, $2, 'PENDING')`,
          [visitId, testTemplateId]
        );

        const testPrice = isB2BVisit ? parseFloat(template.b2b_price) : parseFloat(template.price);
        totalCostChange += testPrice;
        changes.push(`Added: ${template.name} (${template.code}) - ₹${testPrice.toFixed(2)}`);
      }
    }

    // Update visit total_cost and due_amount
    const newTotalCost = parseFloat(visit.total_cost) + totalCostChange;
    const newDueAmount = parseFloat(visit.due_amount) + totalCostChange;

    await pool.query(
      `UPDATE visits
       SET total_cost = $1,
           due_amount = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newTotalCost, newDueAmount, visitId]
    );

    // Log edit in audit trail
    await pool.query(
      `INSERT INTO audit_logs (
        username,
        action,
        details,
        user_id,
        resource,
        resource_id
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        editedBy,
        'EDIT_VISIT_TESTS',
        `Edited tests for visit ${visit.visit_code}. ${changes.join('; ')}. Total cost: ₹${parseFloat(visit.total_cost).toFixed(2)} → ₹${newTotalCost.toFixed(2)}. Reason: ${editReason}`,
        user.id,
        'visit',
        visitId
      ]
    );

    console.log(`Visit tests edited: ${visitId} by ${editedBy}. Changes: ${changes.join('; ')}`);

    res.json({
      success: true,
      message: 'Tests updated successfully',
      changes,
      old_total_cost: parseFloat(visit.total_cost),
      new_total_cost: newTotalCost,
      cost_change: totalCostChange
    });
  } catch (error) {
    console.error('Error editing visit tests:', error);
    res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// POST /api/visits/:id/collect-due - Collect due payment for a visit
router.post('/:id/collect-due', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { amount, payment_mode } = req.body;
    const visitId = parseInt(req.params.id);

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    if (!payment_mode || !['Cash', 'Card', 'UPI'].includes(payment_mode)) {
      return res.status(400).json({ error: 'Valid payment mode is required' });
    }

    // Get current visit details
    const visitResult = await pool.query(
      'SELECT id, visit_code, patient_id, amount_paid, due_amount, payment_mode FROM visits WHERE id = $1',
      [visitId]
    );

    if (visitResult.rows.length === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    const visit = visitResult.rows[0];

    if (amount > visit.due_amount) {
      return res.status(400).json({ error: 'Amount exceeds due amount' });
    }

    // Update visit with new payment
    const newAmountPaid = parseFloat(visit.amount_paid) + parseFloat(amount);
    const newDueAmount = parseFloat(visit.due_amount) - parseFloat(amount);

    const updateResult = await pool.query(
      `UPDATE visits
       SET amount_paid = $1,
           due_amount = $2,
           payment_mode = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [newAmountPaid, newDueAmount, payment_mode, visitId]
    );

    // Get patient name for audit log
    const patientResult = await pool.query(
      'SELECT name FROM patients WHERE id = $1',
      [visit.patient_id]
    );
    const patientName = patientResult.rows[0]?.name || 'Unknown';

    // Create audit log
    await pool.query(
      `INSERT INTO audit_logs (
        username,
        action,
        details,
        user_id,
        resource,
        resource_id
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        (req as any).user?.username || 'system',
        'COLLECT_DUE_PAYMENT',
        `Collected ₹${amount} via ${payment_mode} for visit ${visit.visit_code} (${patientName}). New due: ₹${newDueAmount.toFixed(2)}`,
        (req as any).user?.id || null,
        'visit',
        visitId
      ]
    );

    res.json({
      success: true,
      message: 'Payment collected successfully',
      visit: updateResult.rows[0],
      amount_collected: amount,
      new_due_amount: newDueAmount
    });
  } catch (error) {
    console.error('Error collecting due payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


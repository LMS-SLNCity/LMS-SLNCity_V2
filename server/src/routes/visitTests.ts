import express, { Request, Response } from 'express';
import pool from '../db/connection.js';
import { auditSample, auditTestResult } from '../middleware/auditLogger.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();

// No caching - visit tests change very frequently
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT vt.id, vt.visit_id, vt.test_template_id, vt.status, vt.collected_by, vt.collected_at, vt.specimen_type,
              vt.results, vt.culture_result, vt.entered_by, vt.entered_at, vt.approved_by, vt.approved_at, vt.rejection_count, vt.last_rejection_at, vt.created_at,
              tt.id as template_id, tt.code, tt.name, tt.category, tt.price, tt.b2b_price, tt.is_active, tt.report_type, tt.parameters, tt.default_antibiotic_ids,
              v.visit_code, v.other_ref_doctor, p.name as patient_name,
              rd.name as referred_doctor_name, rd.designation as referred_doctor_designation
       FROM visit_tests vt
       JOIN test_templates tt ON vt.test_template_id = tt.id
       JOIN visits v ON vt.visit_id = v.id
       JOIN patients p ON v.patient_id = p.id
       LEFT JOIN referral_doctors rd ON v.referred_doctor_id = rd.id
       ORDER BY vt.created_at DESC`
    );
    res.json(result.rows.map(row => ({
      id: row.id,
      visitId: row.visit_id,
      patientName: row.patient_name,
      visitCode: row.visit_code,
      referredDoctorName: row.referred_doctor_name,
      referredDoctorDesignation: row.referred_doctor_designation,
      otherRefDoctor: row.other_ref_doctor,
      template: {
        id: row.template_id,
        code: row.code,
        name: row.name,
        category: row.category,
        price: row.price,
        b2b_price: row.b2b_price,
        isActive: row.is_active,
        reportType: row.report_type,
        parameters: typeof row.parameters === 'string' ? JSON.parse(row.parameters) : row.parameters,
        defaultAntibioticIds: row.default_antibiotic_ids,
      },
      status: row.status,
      collectedBy: row.collected_by,
      collectedAt: row.collected_at,
      specimen_type: row.specimen_type,
      results: row.results,
      cultureResult: row.culture_result,
      enteredBy: row.entered_by,
      enteredAt: row.entered_at,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      rejection_count: row.rejection_count || 0,
      last_rejection_at: row.last_rejection_at,
      created_at: row.created_at,
    })));
  } catch (error) {
    console.error('Error fetching visit tests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT vt.id, vt.visit_id, vt.test_template_id, vt.status, vt.collected_by, vt.collected_at, vt.specimen_type,
              vt.results, vt.culture_result, vt.entered_by, vt.entered_at, vt.approved_by, vt.approved_at, vt.rejection_count, vt.last_rejection_at,
              tt.id as template_id, tt.code, tt.name, tt.category, tt.price, tt.b2b_price, tt.is_active, tt.report_type, tt.parameters, tt.default_antibiotic_ids,
              v.visit_code, p.name as patient_name
       FROM visit_tests vt
       JOIN test_templates tt ON vt.test_template_id = tt.id
       JOIN visits v ON vt.visit_id = v.id
       JOIN patients p ON v.patient_id = p.id
       WHERE vt.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Visit test not found' });

    const row = result.rows[0];
    res.json({
      id: row.id,
      visitId: row.visit_id,
      patientName: row.patient_name,
      visitCode: row.visit_code,
      template: {
        id: row.template_id,
        code: row.code,
        name: row.name,
        category: row.category,
        price: row.price,
        b2b_price: row.b2b_price,
        isActive: row.is_active,
        reportType: row.report_type,
        parameters: typeof row.parameters === 'string' ? JSON.parse(row.parameters) : row.parameters,
        defaultAntibioticIds: row.default_antibiotic_ids,
      },
      status: row.status,
      collectedBy: row.collected_by,
      collectedAt: row.collected_at,
      specimen_type: row.specimen_type,
      results: row.results,
      cultureResult: row.culture_result,
      enteredBy: row.entered_by,
      enteredAt: row.entered_at,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      rejection_count: row.rejection_count || 0,
      last_rejection_at: row.last_rejection_at,
    });
  } catch (error) {
    console.error('Error fetching visit test:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { visit_id, test_template_id } = req.body;
    const result = await pool.query(
      `INSERT INTO visit_tests (visit_id, test_template_id, status)
       VALUES ($1, $2, 'PENDING')
       RETURNING id, visit_id, test_template_id, status`,
      [visit_id, test_template_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating visit test:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { status, collected_by, collected_at, specimen_type, results, culture_result, entered_by, entered_at, approved_by, approved_at, editedBy, editReason } = req.body;

    // Get old values and test details for audit trail
    const oldResult = await pool.query(
      `SELECT vt.*, tt.name as test_name, v.visit_code, p.name as patient_name
       FROM visit_tests vt
       JOIN test_templates tt ON vt.test_template_id = tt.id
       JOIN visits v ON vt.visit_id = v.id
       JOIN patients p ON v.patient_id = p.id
       WHERE vt.id = $1`,
      [req.params.id]
    );

    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Visit test not found' });
    }

    const oldData = oldResult.rows[0];
    const testName = oldData.test_name;
    const visitCode = oldData.visit_code;
    const patientName = oldData.patient_name;

    const result = await pool.query(
      `UPDATE visit_tests
       SET status = COALESCE($1, status),
           collected_by = COALESCE($2, collected_by),
           collected_at = COALESCE($3, collected_at),
           specimen_type = COALESCE($4, specimen_type),
           results = COALESCE($5, results),
           culture_result = COALESCE($6, culture_result),
           entered_by = COALESCE($7, entered_by),
           entered_at = COALESCE($8, entered_at),
           approved_by = COALESCE($9, approved_by),
           approved_at = COALESCE($10, approved_at),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING id, visit_id, test_template_id, status, collected_by, collected_at, specimen_type, results, culture_result, entered_by, entered_at, approved_by, approved_at`,
      [status, collected_by, collected_at, specimen_type, results ? JSON.stringify(results) : null, culture_result ? JSON.stringify(culture_result) : null, entered_by, entered_at, approved_by, approved_at, req.params.id]
    );

    const newData = result.rows[0];

    // Audit logging based on what changed
    if (collected_by && !oldData.collected_by) {
      // Sample collection
      await auditSample.collect(req, oldData.visit_id, visitCode);
    }

    if (results && !oldData.results) {
      // Result entry (first time)
      await auditTestResult.enter(req, parseInt(req.params.id), testName, visitCode, results);
    } else if (results && oldData.results && editedBy && editReason) {
      // Result edit with reason (before or after approval)
      const isAfterApproval = oldData.approved_by !== null;
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
          isAfterApproval ? 'EDIT_RESULT_AFTER_APPROVAL' : 'EDIT_RESULT_BEFORE_APPROVAL',
          `Edited results for ${testName} (${visitCode} - ${patientName})${isAfterApproval ? ' [AFTER APPROVAL]' : ''}. Reason: ${editReason}`,
          (req as any).user?.id || null,
          'visit_test',
          req.params.id,
          JSON.stringify(oldData.results),
          JSON.stringify(results)
        ]
      );
    } else if (results && oldData.results) {
      // Result update (normal)
      await auditTestResult.update(req, parseInt(req.params.id), testName, visitCode, oldData.results, results);
    }

    if (approved_by && !oldData.approved_by) {
      // Result approval
      await auditTestResult.approve(req, parseInt(req.params.id), testName, visitCode);
    }

    res.json(newData);
  } catch (error) {
    console.error('Error updating visit test:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sample rejection endpoint (lab rejects physical sample quality)
router.post('/:id/reject-sample', async (req: Request, res: Response) => {
  try {
    const { rejectionReason, rejectedBy } = req.body;
    const testId = parseInt(req.params.id);

    // Update visit_test status to REJECTED and increment rejection_count
    const result = await pool.query(
      `UPDATE visit_tests
       SET status = 'REJECTED',
           rejection_count = rejection_count + 1,
           last_rejection_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, visit_id, test_template_id, status, rejection_count, last_rejection_at`,
      [testId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visit test not found' });
    }

    // TODO: Log rejection reason in audit trail or separate table if needed
    console.log(`Sample rejected for test ${testId} by ${rejectedBy}: ${rejectionReason}`);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error rejecting sample:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel test endpoint (admin/sudo only - cancels test that won't be performed)
router.post('/:id/cancel', authMiddleware, requireRole(['SUDO', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const { cancelReason, cancelledBy } = req.body;
    const testId = parseInt(req.params.id);

    if (!cancelReason || !cancelledBy) {
      return res.status(400).json({ error: 'Cancel reason and cancelled by are required' });
    }

    // Get test details for audit log
    const testDetails = await pool.query(
      `SELECT vt.*, tt.name as test_name, v.visit_code, p.name as patient_name
       FROM visit_tests vt
       JOIN test_templates tt ON vt.test_template_id = tt.id
       JOIN visits v ON vt.visit_id = v.id
       JOIN patients p ON v.patient_id = p.id
       WHERE vt.id = $1`,
      [testId]
    );

    if (testDetails.rows.length === 0) {
      return res.status(404).json({ error: 'Visit test not found' });
    }

    const testData = testDetails.rows[0];

    // Update visit_test status to CANCELLED
    const result = await pool.query(
      `UPDATE visit_tests
       SET status = 'CANCELLED',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, visit_id, test_template_id, status`,
      [testId]
    );

    // Log cancellation in audit trail
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
        cancelledBy,
        'CANCEL_TEST',
        `Cancelled test ${testData.test_name} for ${testData.patient_name} (${testData.visit_code}). Reason: ${cancelReason}`,
        (req as any).user?.id || null,
        'visit_test',
        testId
      ]
    );

    console.log(`Test cancelled: ${testId} by ${cancelledBy}: ${cancelReason}`);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error cancelling test:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


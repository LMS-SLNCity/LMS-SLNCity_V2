import express, { Request, Response } from 'express';
import pool from '../db/connection.js';

const router = express.Router();

// GET /api/patient-edit-requests - Get all patient edit requests
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, patient_id } = req.query;

    let query = `
      SELECT 
        per.*,
        p.name as patient_name,
        p.phone as patient_phone,
        u1.username as requested_by_username,
        u2.username as reviewed_by_username
      FROM patient_edit_requests per
      JOIN patients p ON per.patient_id = p.id
      LEFT JOIN users u1 ON per.requested_by_user_id = u1.id
      LEFT JOIN users u2 ON per.reviewed_by_user_id = u2.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      query += ` AND per.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (patient_id) {
      query += ` AND per.patient_id = $${paramIndex}`;
      params.push(parseInt(patient_id as string));
      paramIndex++;
    }

    query += ' ORDER BY per.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching patient edit requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/patient-edit-requests - Create a new patient edit request
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      patient_id,
      requested_by_user_id,
      requested_by_username,
      request_type,
      old_values,
      new_values,
      reason
    } = req.body;

    if (!patient_id || !requested_by_user_id || !requested_by_username || !request_type || !old_values || !new_values) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(
      `INSERT INTO patient_edit_requests (
        patient_id,
        requested_by_user_id,
        requested_by_username,
        request_type,
        old_values,
        new_values,
        reason,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
      RETURNING *`,
      [
        patient_id,
        requested_by_user_id,
        requested_by_username,
        request_type,
        JSON.stringify(old_values),
        JSON.stringify(new_values),
        reason
      ]
    );

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
        requested_by_username,
        'REQUEST_PATIENT_EDIT',
        `Requested ${request_type} for patient ID ${patient_id}. Reason: ${reason || 'N/A'}`,
        requested_by_user_id,
        'patient_edit_request',
        result.rows[0].id
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating patient edit request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/patient-edit-requests/:id/approve - Approve a patient edit request
router.patch('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reviewed_by_user_id, reviewed_by_username, review_comment } = req.body;

    if (!reviewed_by_user_id || !reviewed_by_username) {
      return res.status(400).json({ error: 'Reviewer information required' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get the request details
      const requestResult = await client.query(
        'SELECT * FROM patient_edit_requests WHERE id = $1',
        [id]
      );

      if (requestResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Request not found' });
      }

      const request = requestResult.rows[0];

      if (request.status !== 'PENDING') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Request has already been reviewed' });
      }

      // Update the request status
      await client.query(
        `UPDATE patient_edit_requests 
         SET status = 'APPROVED',
             reviewed_by_user_id = $1,
             reviewed_by_username = $2,
             review_comment = $3,
             reviewed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [reviewed_by_user_id, reviewed_by_username, review_comment, id]
      );

      // Apply the changes to the patient record
      const newValues = typeof request.new_values === 'string' 
        ? JSON.parse(request.new_values) 
        : request.new_values;

      const updateFields: string[] = [];
      const updateParams: any[] = [];
      let paramIndex = 1;

      Object.keys(newValues).forEach(key => {
        updateFields.push(`${key} = $${paramIndex}`);
        updateParams.push(newValues[key]);
        paramIndex++;
      });

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateParams.push(request.patient_id);

      await client.query(
        `UPDATE patients SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        updateParams
      );

      // Create audit log
      await client.query(
        `INSERT INTO audit_logs (
          username,
          action,
          details,
          user_id,
          resource,
          resource_id,
          old_values,
          new_values
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          reviewed_by_username,
          'APPROVE_PATIENT_EDIT',
          `Approved ${request.request_type} for patient ID ${request.patient_id}. Comment: ${review_comment || 'N/A'}`,
          reviewed_by_user_id,
          'patient',
          request.patient_id,
          request.old_values,
          request.new_values
        ]
      );

      await client.query('COMMIT');

      res.json({ message: 'Patient edit request approved and changes applied' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error approving patient edit request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/patient-edit-requests/:id/reject - Reject a patient edit request
router.patch('/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reviewed_by_user_id, reviewed_by_username, review_comment } = req.body;

    if (!reviewed_by_user_id || !reviewed_by_username || !review_comment) {
      return res.status(400).json({ error: 'Reviewer information and comment required' });
    }

    // Get the request details first
    const requestResult = await pool.query(
      'SELECT * FROM patient_edit_requests WHERE id = $1',
      [id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestResult.rows[0];

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Request has already been reviewed' });
    }

    // Update the request status
    await pool.query(
      `UPDATE patient_edit_requests 
       SET status = 'REJECTED',
           reviewed_by_user_id = $1,
           reviewed_by_username = $2,
           review_comment = $3,
           reviewed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [reviewed_by_user_id, reviewed_by_username, review_comment, id]
    );

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
        reviewed_by_username,
        'REJECT_PATIENT_EDIT',
        `Rejected ${request.request_type} for patient ID ${request.patient_id}. Reason: ${review_comment}`,
        reviewed_by_user_id,
        'patient_edit_request',
        id
      ]
    );

    res.json({ message: 'Patient edit request rejected' });
  } catch (error) {
    console.error('Error rejecting patient edit request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


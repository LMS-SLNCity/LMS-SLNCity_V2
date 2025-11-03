import express, { Request, Response } from 'express';
import pool from '../db/connection.js';

const router = express.Router();

// GET /api/result-rejections - Get all result rejections
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, visit_test_id } = req.query;

    let query = `
      SELECT 
        rr.*,
        vt.visit_id,
        vt.test_template_id,
        vt.status as test_status,
        tt.name as test_name,
        tt.code as test_code,
        v.visit_code,
        p.name as patient_name,
        u1.username as rejected_by_username,
        u2.username as resolved_by_username
      FROM result_rejections rr
      JOIN visit_tests vt ON rr.visit_test_id = vt.id
      JOIN test_templates tt ON vt.test_template_id = tt.id
      JOIN visits v ON vt.visit_id = v.id
      JOIN patients p ON v.patient_id = p.id
      LEFT JOIN users u1 ON rr.rejected_by_user_id = u1.id
      LEFT JOIN users u2 ON rr.resolved_by_user_id = u2.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      query += ` AND rr.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (visit_test_id) {
      query += ` AND rr.visit_test_id = $${paramIndex}`;
      params.push(parseInt(visit_test_id as string));
      paramIndex++;
    }

    query += ' ORDER BY rr.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching result rejections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/result-rejections/by-test/:visitTestId - Get rejections for a specific test
router.get('/by-test/:visitTestId', async (req: Request, res: Response) => {
  try {
    const { visitTestId } = req.params;

    const result = await pool.query(
      `SELECT 
        rr.*,
        u1.username as rejected_by_username,
        u2.username as resolved_by_username
      FROM result_rejections rr
      LEFT JOIN users u1 ON rr.rejected_by_user_id = u1.id
      LEFT JOIN users u2 ON rr.resolved_by_user_id = u2.id
      WHERE rr.visit_test_id = $1
      ORDER BY rr.created_at DESC`,
      [visitTestId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching rejections for test:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/result-rejections - Create a new result rejection
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      visit_test_id,
      rejected_by_user_id,
      rejected_by_username,
      rejection_reason,
      old_results
    } = req.body;

    if (!visit_test_id || !rejected_by_user_id || !rejected_by_username || !rejection_reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Create the rejection record
      const rejectionResult = await client.query(
        `INSERT INTO result_rejections (
          visit_test_id,
          rejected_by_user_id,
          rejected_by_username,
          rejection_reason,
          old_results,
          status
        ) VALUES ($1, $2, $3, $4, $5, 'PENDING_CORRECTION')
        RETURNING *`,
        [
          visit_test_id,
          rejected_by_user_id,
          rejected_by_username,
          rejection_reason,
          old_results ? JSON.stringify(old_results) : null
        ]
      );

      // Update visit_test status and rejection count
      await client.query(
        `UPDATE visit_tests 
         SET status = 'IN_PROGRESS',
             rejection_count = rejection_count + 1,
             last_rejection_at = CURRENT_TIMESTAMP,
             approved_by = NULL,
             approved_at = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [visit_test_id]
      );

      // Get test details for audit log
      const testResult = await client.query(
        `SELECT vt.*, v.visit_code, p.name as patient_name, tt.name as test_name
         FROM visit_tests vt
         JOIN visits v ON vt.visit_id = v.id
         JOIN patients p ON v.patient_id = p.id
         JOIN test_templates tt ON vt.test_template_id = tt.id
         WHERE vt.id = $1`,
        [visit_test_id]
      );

      const test = testResult.rows[0];

      // Create audit log
      await client.query(
        `INSERT INTO audit_logs (
          username,
          action,
          details,
          user_id,
          resource,
          resource_id
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          rejected_by_username,
          'REJECT_RESULT',
          `Rejected results for ${test.test_name} (${test.visit_code} - ${test.patient_name}). Reason: ${rejection_reason}`,
          rejected_by_user_id,
          'visit_test',
          visit_test_id
        ]
      );

      await client.query('COMMIT');

      res.status(201).json(rejectionResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating result rejection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/result-rejections/:id/resolve - Mark rejection as resolved
router.patch('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resolved_by_user_id, resolved_by_username } = req.body;

    if (!resolved_by_user_id || !resolved_by_username) {
      return res.status(400).json({ error: 'Resolver information required' });
    }

    // Get the rejection details
    const rejectionResult = await pool.query(
      'SELECT * FROM result_rejections WHERE id = $1',
      [id]
    );

    if (rejectionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Rejection not found' });
    }

    const rejection = rejectionResult.rows[0];

    if (rejection.status !== 'PENDING_CORRECTION') {
      return res.status(400).json({ error: 'Rejection has already been resolved' });
    }

    // Update the rejection status
    await pool.query(
      `UPDATE result_rejections 
       SET status = 'RESOLVED',
           resolved_by_user_id = $1,
           resolved_by_username = $2,
           resolved_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [resolved_by_user_id, resolved_by_username, id]
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
        resolved_by_username,
        'RESOLVE_REJECTION',
        `Resolved rejection for visit_test ID ${rejection.visit_test_id}`,
        resolved_by_user_id,
        'result_rejection',
        id
      ]
    );

    res.json({ message: 'Rejection marked as resolved' });
  } catch (error) {
    console.error('Error resolving rejection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


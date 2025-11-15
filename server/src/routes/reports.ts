/**
 * Reports Routes
 * 
 * Handles report generation, printing, and emailing with comprehensive audit logging.
 */

import express, { Request, Response } from 'express';
import pool from '../db/connection.js';
import { auditReport } from '../middleware/auditLogger.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/reports/generate
 * Generate a report for a visit
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { visit_id, signatory_id, signatory_name } = req.body;

    if (!visit_id || !signatory_id) {
      return res.status(400).json({ error: 'visit_id and signatory_id are required' });
    }

    // Get visit details
    const visitResult = await pool.query(
      'SELECT id, visit_code FROM visits WHERE id = $1',
      [visit_id]
    );

    if (visitResult.rows.length === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    const visit = visitResult.rows[0];

    // Audit log: Report generation
    await auditReport.generate(req, visit.id, visit.visit_code, signatory_name || `Signatory ID ${signatory_id}`);

    res.json({
      success: true,
      message: `Report generated for visit ${visit.visit_code}`,
      visit_id: visit.id,
      visit_code: visit.visit_code,
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/reports/print
 * Log report printing and mark tests as PRINTED
 */
router.post('/print', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { visit_id } = req.body;

    if (!visit_id) {
      return res.status(400).json({ error: 'visit_id is required' });
    }

    console.log('📄 Marking tests as PRINTED for visit_id:', visit_id);

    // Get visit details
    const visitResult = await pool.query(
      'SELECT id, visit_code FROM visits WHERE id = $1',
      [visit_id]
    );

    if (visitResult.rows.length === 0) {
      console.error('❌ Visit not found:', visit_id);
      return res.status(404).json({ error: 'Visit not found' });
    }

    const visit = visitResult.rows[0];
    console.log('✅ Found visit:', visit.visit_code);

    // Update all APPROVED tests for this visit to PRINTED status
    const updateResult = await pool.query(
      `UPDATE visit_tests
       SET status = 'PRINTED', updated_at = CURRENT_TIMESTAMP
       WHERE visit_id = $1 AND status = 'APPROVED'
       RETURNING id`,
      [visit_id]
    );

    console.log(`✅ Updated ${updateResult.rowCount} tests to PRINTED status`);

    // Audit log: Report printing
    try {
      await auditReport.print(req, visit.id, visit.visit_code);
      console.log('✅ Audit log created');
    } catch (auditError) {
      console.error('⚠️ Audit log failed (non-critical):', auditError);
      // Don't fail the request if audit logging fails
    }

    res.json({
      success: true,
      message: `Report print logged for visit ${visit.visit_code}`,
      visit_id: visit.id,
      visit_code: visit.visit_code,
      tests_updated: updateResult.rowCount
    });
  } catch (error) {
    console.error('❌ Error logging report print:', error);
    res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/reports/email
 * Log report emailing
 */
router.post('/email', async (req: Request, res: Response) => {
  try {
    const { visit_id, recipient_email } = req.body;

    if (!visit_id || !recipient_email) {
      return res.status(400).json({ error: 'visit_id and recipient_email are required' });
    }

    // Get visit details
    const visitResult = await pool.query(
      'SELECT id, visit_code FROM visits WHERE id = $1',
      [visit_id]
    );

    if (visitResult.rows.length === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    const visit = visitResult.rows[0];

    // Audit log: Report emailing
    await auditReport.email(req, visit.id, visit.visit_code, recipient_email);

    res.json({
      success: true,
      message: `Report email logged for visit ${visit.visit_code}`,
      visit_id: visit.id,
      visit_code: visit.visit_code,
      recipient: recipient_email,
    });
  } catch (error) {
    console.error('Error logging report email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


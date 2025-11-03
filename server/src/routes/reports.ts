/**
 * Reports Routes
 * 
 * Handles report generation, printing, and emailing with comprehensive audit logging.
 */

import express, { Request, Response } from 'express';
import pool from '../db/connection.js';
import { auditReport } from '../middleware/auditLogger.js';

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
 * Log report printing
 */
router.post('/print', async (req: Request, res: Response) => {
  try {
    const { visit_id } = req.body;

    if (!visit_id) {
      return res.status(400).json({ error: 'visit_id is required' });
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

    // Audit log: Report printing
    await auditReport.print(req, visit.id, visit.visit_code);

    res.json({
      success: true,
      message: `Report print logged for visit ${visit.visit_code}`,
      visit_id: visit.id,
      visit_code: visit.visit_code,
    });
  } catch (error) {
    console.error('Error logging report print:', error);
    res.status(500).json({ error: 'Internal server error' });
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


import express, { Request, Response } from 'express';
import pool from '../db/connection.js';

const router = express.Router();

// GET /api/waivers - Get all waivers with pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) FROM b2b_waivers');
    const totalCount = parseInt(countResult.rows[0].count);

    // Get waivers with pagination
    const waiversResult = await pool.query(`
      SELECT * FROM b2b_recent_waivers
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({
      waivers: waiversResult.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching waivers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/waivers/summary - Get waiver summary by client
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const summaryResult = await pool.query('SELECT * FROM b2b_waiver_summary ORDER BY total_waiver_amount DESC NULLS LAST');

    res.json({
      summary: summaryResult.rows,
    });
  } catch (error) {
    console.error('Error fetching waiver summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/waivers/client/:clientId - Get waivers for specific client
router.get('/client/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const waiversResult = await pool.query(`
      SELECT * FROM b2b_recent_waivers
      WHERE client_id = $1
      ORDER BY created_at DESC
    `, [clientId]);

    // Get summary for this client
    const summaryResult = await pool.query(`
      SELECT * FROM b2b_waiver_summary
      WHERE client_id = $1
    `, [clientId]);

    res.json({
      waivers: waiversResult.rows,
      summary: summaryResult.rows[0] || null,
    });
  } catch (error) {
    console.error('Error fetching client waivers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/waivers/stats - Get overall waiver statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_waivers,
        SUM(waiver_amount) as total_waiver_amount,
        AVG(waiver_amount) as average_waiver_amount,
        MAX(waiver_amount) as max_waiver_amount,
        MIN(waiver_amount) as min_waiver_amount,
        COUNT(DISTINCT client_id) as clients_with_waivers
      FROM b2b_waivers
    `);

    // Get waivers by payment mode
    const byModeResult = await pool.query(`
      SELECT 
        payment_mode,
        COUNT(*) as count,
        SUM(waiver_amount) as total_amount
      FROM b2b_waivers
      GROUP BY payment_mode
      ORDER BY total_amount DESC
    `);

    // Get recent waivers (last 30 days)
    const recentResult = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        SUM(waiver_amount) as total_amount
      FROM b2b_waivers
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    res.json({
      overall: statsResult.rows[0],
      byPaymentMode: byModeResult.rows,
      last30Days: recentResult.rows,
    });
  } catch (error) {
    console.error('Error fetching waiver stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


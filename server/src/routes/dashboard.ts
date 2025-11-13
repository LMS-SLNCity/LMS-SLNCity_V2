import { Router, Request, Response } from 'express';
import pool from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Middleware to check authentication
router.use(authMiddleware);

// GET /api/dashboard/overview - Get dashboard overview metrics
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    let dateFilter = '';
    const params: any[] = [];
    if (startDate && endDate) {
      dateFilter = 'WHERE created_at >= $1 AND created_at <= $2';
      params.push(startDate, endDate);
    }

    // Get total visits count
    const visitsResult = await pool.query(`SELECT COUNT(*) as total_visits FROM visits ${dateFilter}`, params);
    const totalVisits = parseInt(visitsResult.rows[0].total_visits);

    // Get total revenue
    const revenueResult = await pool.query(`SELECT SUM(total_cost) as total_revenue FROM visits ${dateFilter}`, params);
    const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue) || 0;

    // Get total tests performed
    const testsResult = await pool.query(`SELECT COUNT(*) as total_tests FROM visit_tests ${dateFilter}`, params);
    const totalTests = parseInt(testsResult.rows[0].total_tests);

    // Get total B2B clients
    const clientsResult = await pool.query("SELECT COUNT(*) as total_clients FROM clients WHERE type = 'REFERRAL_LAB'");
    const totalClients = parseInt(clientsResult.rows[0].total_clients);

    // Get pending tests (with date filter)
    let pendingQuery = `SELECT COUNT(*) as pending_tests FROM visit_tests WHERE status IN ('PENDING', 'SAMPLE_COLLECTED', 'IN_PROGRESS')`;
    if (dateFilter) {
      pendingQuery += ` AND ${dateFilter}`;
    }
    const pendingResult = await pool.query(pendingQuery, params);
    const pendingTests = parseInt(pendingResult.rows[0].pending_tests);

    // Get approved tests (with date filter)
    let approvedQuery = `SELECT COUNT(*) as approved_tests FROM visit_tests WHERE status = 'APPROVED'`;
    if (dateFilter) {
      approvedQuery += ` AND ${dateFilter}`;
    }
    const approvedResult = await pool.query(approvedQuery, params);
    const approvedTests = parseInt(approvedResult.rows[0].approved_tests);

    // Get rejected tests (with date filter)
    let rejectedQuery = `SELECT COUNT(*) as rejected_tests FROM visit_tests WHERE status = 'REJECTED'`;
    if (dateFilter) {
      rejectedQuery += ` AND ${dateFilter}`;
    }
    const rejectedResult = await pool.query(rejectedQuery, params);
    const rejectedTests = parseInt(rejectedResult.rows[0].rejected_tests);

    // Get average TAT (Turnaround Time) in hours
    let tatQuery = `SELECT AVG(EXTRACT(EPOCH FROM (approved_at - collected_at))/3600) as avg_tat_hours FROM visit_tests WHERE approved_at IS NOT NULL AND collected_at IS NOT NULL`;
    if (dateFilter) {
      tatQuery += ` AND ${dateFilter}`;
    }
    const tatResult = await pool.query(tatQuery, params);
    const avgTatHours = parseFloat(tatResult.rows[0].avg_tat_hours) || 0;

    // Get collection rate (percentage of tests collected vs pending)
    const collectionRate = totalTests > 0 ? ((totalTests - pendingTests) / totalTests * 100) : 0;

    res.json({
      totalVisits,
      totalRevenue,
      totalTests,
      totalClients,
      pendingTests,
      approvedTests,
      rejectedTests,
      avgTatHours: Math.round(avgTatHours * 10) / 10,
      collectionRate: Math.round(collectionRate * 10) / 10,
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/dashboard/revenue - Get revenue metrics
router.get('/revenue', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    let dateFilter = '';
    const params: any[] = [];
    if (startDate && endDate) {
      dateFilter = 'WHERE created_at >= $1 AND created_at <= $2';
      params.push(startDate, endDate);
    }

    // Get revenue by payment mode
    const paymentModeResult = await pool.query(`
      SELECT payment_mode, COUNT(*) as count, SUM(total_cost) as revenue
      FROM visits
      ${dateFilter}
      GROUP BY payment_mode
      ORDER BY revenue DESC
    `, params);

    // Get revenue by B2B client (sorted by revenue in descending order)
    let clientRevenueQuery = `
      SELECT c.id, c.name, c.balance, COUNT(v.id) as visit_count, SUM(v.total_cost) as total_revenue
      FROM clients c
      LEFT JOIN visits v ON c.id = v.ref_customer_id`;
    if (dateFilter) {
      clientRevenueQuery += ` AND v.${dateFilter}`;
    }
    clientRevenueQuery += `
      WHERE c.type = 'REFERRAL_LAB'
      GROUP BY c.id, c.name, c.balance
      ORDER BY total_revenue DESC NULLS LAST`;
    const clientRevenueResult = await pool.query(clientRevenueQuery, params);

    // Get daily revenue for the selected period
    const dailyRevenueResult = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as visit_count, SUM(total_cost) as revenue
      FROM visits
      ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, params);

    res.json({
      byPaymentMode: paymentModeResult.rows,
      byClient: clientRevenueResult.rows,
      dailyRevenue: dailyRevenueResult.rows,
    });
  } catch (error) {
    console.error('Error fetching revenue metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/dashboard/tests - Get test distribution metrics
router.get('/tests', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    let dateFilter = '';
    const params: any[] = [];
    if (startDate && endDate) {
      dateFilter = 'WHERE vt.created_at >= $1 AND vt.created_at <= $2';
      params.push(startDate, endDate);
    }

    // Get tests by template
    let byTemplateQuery = `
      SELECT tt.id, tt.name, tt.code, tt.category, tt.parameters, COUNT(vt.id) as count
      FROM test_templates tt
      LEFT JOIN visit_tests vt ON tt.id = vt.test_template_id`;
    if (dateFilter) {
      byTemplateQuery += ` AND vt.${dateFilter.substring(6)}`;
    }
    byTemplateQuery += `
      GROUP BY tt.id, tt.name, tt.code, tt.category, tt.parameters
      ORDER BY count DESC`;
    const byTemplateResult = await pool.query(byTemplateQuery, params);

    // Get tests by status
    const byStatusResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM visit_tests vt
      ${dateFilter}
      GROUP BY status
      ORDER BY count DESC
    `, params);

    // Get tests by category
    let byCategoryQuery = `
      SELECT tt.category, COUNT(vt.id) as count
      FROM test_templates tt
      LEFT JOIN visit_tests vt ON tt.id = vt.test_template_id`;
    if (dateFilter) {
      byCategoryQuery += ` AND vt.${dateFilter.substring(6)}`;
    }
    byCategoryQuery += `
      GROUP BY tt.category
      ORDER BY count DESC`;
    const byCategoryResult = await pool.query(byCategoryQuery, params);

    res.json({
      byTemplate: byTemplateResult.rows,
      byStatus: byStatusResult.rows,
      byCategory: byCategoryResult.rows,
    });
  } catch (error) {
    console.error('Error fetching test metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/dashboard/clients - Get B2B client metrics
router.get('/clients', async (req: Request, res: Response) => {
  try {
    // Get all B2B clients with their balance and visit count
    const clientsResult = await pool.query(`
      SELECT 
        c.id, 
        c.name, 
        c.balance,
        COUNT(v.id) as visit_count,
        SUM(v.total_cost) as total_revenue,
        SUM(CASE WHEN v.due_amount > 0 THEN v.due_amount ELSE 0 END) as pending_dues
      FROM clients c
      LEFT JOIN visits v ON c.id = v.ref_customer_id
      WHERE c.type = 'REFERRAL_LAB'
      GROUP BY c.id, c.name, c.balance
      ORDER BY total_revenue DESC
    `);

    // Get ledger summary for each client
    const ledgerResult = await pool.query(`
      SELECT 
        c.id,
        c.name,
        SUM(CASE WHEN le.type = 'DEBIT' THEN le.amount ELSE 0 END) as total_debits,
        SUM(CASE WHEN le.type = 'CREDIT' THEN le.amount ELSE 0 END) as total_credits
      FROM clients c
      LEFT JOIN ledger_entries le ON c.id = le.client_id
      WHERE c.type = 'REFERRAL_LAB'
      GROUP BY c.id, c.name
    `);

    res.json({
      clients: clientsResult.rows,
      ledgerSummary: ledgerResult.rows,
    });
  } catch (error) {
    console.error('Error fetching client metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/dashboard/trends - Get business trends
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    let dateFilter = '';
    const params: any[] = [];
    if (startDate && endDate) {
      dateFilter = 'WHERE created_at >= $1 AND created_at <= $2';
      params.push(startDate, endDate);
    }

    // Get visits trend
    const visitsTrendResult = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM visits
      ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, params);

    // Get tests trend
    const testsTrendResult = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM visit_tests
      ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, params);

    // Get average revenue per visit
    const avgRevenueResult = await pool.query(`
      SELECT AVG(total_cost) as avg_revenue, MIN(total_cost) as min_revenue, MAX(total_cost) as max_revenue
      FROM visits
      ${dateFilter}
    `, params);

    res.json({
      visitsTrend: visitsTrendResult.rows,
      testsTrend: testsTrendResult.rows,
      averageRevenue: avgRevenueResult.rows[0],
    });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


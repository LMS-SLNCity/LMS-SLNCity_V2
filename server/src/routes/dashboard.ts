import { Router, Request, Response } from 'express';
import pool from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Middleware to check authentication
router.use(authMiddleware);

// GET /api/dashboard/overview - Get dashboard overview metrics
router.get('/overview', async (req: Request, res: Response) => {
  try {
    // Get total visits count
    const visitsResult = await pool.query('SELECT COUNT(*) as total_visits FROM visits');
    const totalVisits = parseInt(visitsResult.rows[0].total_visits);

    // Get total revenue
    const revenueResult = await pool.query('SELECT SUM(total_cost) as total_revenue FROM visits');
    const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue) || 0;

    // Get total tests performed
    const testsResult = await pool.query('SELECT COUNT(*) as total_tests FROM visit_tests');
    const totalTests = parseInt(testsResult.rows[0].total_tests);

    // Get total B2B clients
    const clientsResult = await pool.query("SELECT COUNT(*) as total_clients FROM clients WHERE type = 'REFERRAL_LAB'");
    const totalClients = parseInt(clientsResult.rows[0].total_clients);

    // Get pending tests
    const pendingResult = await pool.query("SELECT COUNT(*) as pending_tests FROM visit_tests WHERE status IN ('PENDING', 'SAMPLE_COLLECTED', 'IN_PROGRESS')");
    const pendingTests = parseInt(pendingResult.rows[0].pending_tests);

    // Get approved tests
    const approvedResult = await pool.query("SELECT COUNT(*) as approved_tests FROM visit_tests WHERE status = 'APPROVED'");
    const approvedTests = parseInt(approvedResult.rows[0].approved_tests);

    res.json({
      totalVisits,
      totalRevenue,
      totalTests,
      totalClients,
      pendingTests,
      approvedTests,
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/dashboard/revenue - Get revenue metrics
router.get('/revenue', async (req: Request, res: Response) => {
  try {
    // Get revenue by payment mode
    const paymentModeResult = await pool.query(`
      SELECT payment_mode, COUNT(*) as count, SUM(total_cost) as revenue
      FROM visits
      GROUP BY payment_mode
      ORDER BY revenue DESC
    `);

    // Get revenue by B2B client (sorted by balance/business in descending order)
    const clientRevenueResult = await pool.query(`
      SELECT c.id, c.name, c.balance, COUNT(v.id) as visit_count, SUM(v.total_cost) as total_revenue
      FROM clients c
      LEFT JOIN visits v ON c.id = v.ref_customer_id
      WHERE c.type = 'REFERRAL_LAB'
      GROUP BY c.id, c.name, c.balance
      ORDER BY c.balance DESC
    `);

    // Get daily revenue for last 30 days
    const dailyRevenueResult = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as visit_count, SUM(total_cost) as revenue
      FROM visits
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

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
    // Get tests by template
    const byTemplateResult = await pool.query(`
      SELECT tt.id, tt.name, tt.code, tt.category, tt.parameters, COUNT(vt.id) as count
      FROM test_templates tt
      LEFT JOIN visit_tests vt ON tt.id = vt.test_template_id
      GROUP BY tt.id, tt.name, tt.code, tt.category, tt.parameters
      ORDER BY count DESC
    `);

    // Get tests by status
    const byStatusResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM visit_tests
      GROUP BY status
      ORDER BY count DESC
    `);

    // Get tests by category
    const byCategoryResult = await pool.query(`
      SELECT tt.category, COUNT(vt.id) as count
      FROM test_templates tt
      LEFT JOIN visit_tests vt ON tt.id = vt.test_template_id
      GROUP BY tt.category
      ORDER BY count DESC
    `);

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
    // Get visits trend for last 30 days
    const visitsTrendResult = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM visits
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Get tests trend for last 30 days
    const testsTrendResult = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM visit_tests
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Get average revenue per visit
    const avgRevenueResult = await pool.query(`
      SELECT AVG(total_cost) as avg_revenue, MIN(total_cost) as min_revenue, MAX(total_cost) as max_revenue
      FROM visits
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);

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


/**
 * Audit Log Management Routes
 * 
 * Provides endpoints for managing audit log retention, cleanup, and compliance reporting.
 * These endpoints are restricted to SUDO and ADMIN roles only.
 */

import express, { Request, Response } from 'express';
import pool from '../db/connection.js';
import {
  cleanupExpiredAuditLogs,
  getAuditLogStats,
  getCleanupHistory,
  triggerManualCleanup
} from '../services/auditLogCleanup.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/audit-log-management/stats - Get audit log statistics
router.get('/stats', requireRole(['SUDO', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const stats = await getAuditLogStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching audit log stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/audit-log-management/cleanup-history - Get cleanup history
router.get('/cleanup-history', requireRole(['SUDO', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const { limit = '50' } = req.query;
    const history = await getCleanupHistory(parseInt(limit as string));
    res.json(history);
  } catch (error) {
    console.error('Error fetching cleanup history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/audit-log-management/cleanup - Trigger manual cleanup
router.post('/cleanup', requireRole(['SUDO', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const { executedBy = 'ADMIN' } = req.body;
    
    const result = await triggerManualCleanup(executedBy);
    
    if (result.success) {
      res.json({
        message: 'Cleanup completed successfully',
        deletedCount: result.deletedCount
      });
    } else {
      res.status(500).json({
        error: 'Cleanup failed',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Error triggering cleanup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/audit-log-management/retention-policies - Get retention policies
router.get('/retention-policies', requireRole(['SUDO', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM audit_log_retention_policies ORDER BY category'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching retention policies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/audit-log-management/compliance-report - Get NABL compliance report
router.get('/compliance-report', requireRole(['SUDO', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM nabl_audit_compliance_report');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching compliance report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/audit-log-management/login-activity - Get login activity summary
router.get('/login-activity', requireRole(['SUDO', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;

    const daysNum = Math.min(Math.max(parseInt(days as string) || 30, 1), 365);

    const result = await pool.query(
      `SELECT * FROM login_activity_summary
       WHERE login_date >= CURRENT_DATE - ($1::int * INTERVAL '1 day')
       ORDER BY login_date DESC, action`,
      [daysNum]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching login activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/audit-log-management/failed-logins - Get recent failed login attempts
router.get('/failed-logins', requireRole(['SUDO', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const { limit = '100', hours = '24' } = req.query;

    // Validate and sanitize inputs
    const limitNum = Math.min(Math.max(parseInt(limit as string) || 100, 1), 1000);
    const hoursNum = Math.min(Math.max(parseInt(hours as string) || 24, 1), 168); // Max 1 week

    const result = await pool.query(
      `SELECT
        id,
        timestamp,
        username,
        details,
        ip_address,
        user_agent
      FROM audit_logs
      WHERE action = 'LOGIN_FAILED'
        AND timestamp >= CURRENT_TIMESTAMP - ($2::int * INTERVAL '1 hour')
      ORDER BY timestamp DESC
      LIMIT $1`,
      [limitNum, hoursNum]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching failed logins:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/audit-log-management/suspicious-activity - Detect suspicious login patterns
router.get('/suspicious-activity', requireRole(['SUDO', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    // Find users with multiple failed login attempts
    const multipleFailures = await pool.query(
      `SELECT 
        username,
        COUNT(*) as failed_attempts,
        COUNT(DISTINCT ip_address) as unique_ips,
        MIN(timestamp) as first_attempt,
        MAX(timestamp) as last_attempt,
        array_agg(DISTINCT ip_address) as ip_addresses
      FROM audit_logs
      WHERE action = 'LOGIN_FAILED'
        AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      GROUP BY username
      HAVING COUNT(*) >= 3
      ORDER BY failed_attempts DESC`
    );
    
    // Find IPs with multiple failed attempts across different users
    const suspiciousIPs = await pool.query(
      `SELECT 
        ip_address,
        COUNT(*) as failed_attempts,
        COUNT(DISTINCT username) as unique_users,
        MIN(timestamp) as first_attempt,
        MAX(timestamp) as last_attempt,
        array_agg(DISTINCT username) as usernames
      FROM audit_logs
      WHERE action = 'LOGIN_FAILED'
        AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        AND ip_address IS NOT NULL
      GROUP BY ip_address
      HAVING COUNT(*) >= 5
      ORDER BY failed_attempts DESC`
    );
    
    res.json({
      multipleFailures: multipleFailures.rows,
      suspiciousIPs: suspiciousIPs.rows
    });
  } catch (error) {
    console.error('Error detecting suspicious activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/audit-log-management/user-sessions - Get active user sessions
router.get('/user-sessions', requireRole(['SUDO', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `WITH latest_logins AS (
        SELECT DISTINCT ON (username)
          username,
          timestamp as login_time,
          ip_address,
          user_agent
        FROM audit_logs
        WHERE action = 'LOGIN_SUCCESS'
        ORDER BY username, timestamp DESC
      ),
      latest_logouts AS (
        SELECT DISTINCT ON (username)
          username,
          timestamp as logout_time
        FROM audit_logs
        WHERE action = 'LOGOUT'
        ORDER BY username, timestamp DESC
      )
      SELECT 
        ll.username,
        ll.login_time,
        ll.ip_address,
        ll.user_agent,
        lo.logout_time,
        CASE 
          WHEN lo.logout_time IS NULL OR ll.login_time > lo.logout_time 
          THEN 'ACTIVE'
          ELSE 'LOGGED_OUT'
        END as session_status
      FROM latest_logins ll
      LEFT JOIN latest_logouts lo ON ll.username = lo.username
      WHERE ll.login_time >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      ORDER BY ll.login_time DESC`
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


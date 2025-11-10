import express, { Request, Response } from 'express';
import pool from '../db/connection.js';
import { generateAuditLogsExcel } from '../services/exportService.js';

const router = express.Router();

// GET /api/audit-logs - Fetch audit logs with comprehensive filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      username,
      action,
      resource,
      resource_id,
      start_date,
      end_date,
      search,
      limit = '1000',
      offset = '0'
    } = req.query;

    let query = `
      SELECT
        al.id,
        al.timestamp,
        al.username,
        al.action,
        al.details,
        al.resource,
        al.ip_address,
        u.id as user_id,
        u.role as user_role
      FROM audit_logs al
      LEFT JOIN users u ON al.username = u.username
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Filter by username
    if (username && username !== 'all') {
      query += ` AND al.username = $${paramIndex}`;
      params.push(username);
      paramIndex++;
    }

    // Filter by action type
    if (action && action !== 'all') {
      query += ` AND al.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    // Filter by resource type
    if (resource && resource !== 'all') {
      query += ` AND al.resource = $${paramIndex}`;
      params.push(resource);
      paramIndex++;
    }



    // Filter by date range
    if (start_date) {
      query += ` AND al.timestamp >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND al.timestamp <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    // Search in details
    if (search) {
      query += ` AND (al.details ILIKE $${paramIndex} OR al.username ILIKE $${paramIndex} OR al.action ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Order and pagination
    query += ` ORDER BY al.timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM audit_logs al WHERE 1=1';
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (username && username !== 'all') {
      countQuery += ` AND al.username = $${countParamIndex}`;
      countParams.push(username);
      countParamIndex++;
    }

    if (action && action !== 'all') {
      countQuery += ` AND al.action = $${countParamIndex}`;
      countParams.push(action);
      countParamIndex++;
    }

    if (resource && resource !== 'all') {
      countQuery += ` AND al.resource = $${countParamIndex}`;
      countParams.push(resource);
      countParamIndex++;
    }



    if (start_date) {
      countQuery += ` AND al.timestamp >= $${countParamIndex}`;
      countParams.push(start_date);
      countParamIndex++;
    }

    if (end_date) {
      countQuery += ` AND al.timestamp <= $${countParamIndex}`;
      countParams.push(end_date);
      countParamIndex++;
    }

    if (search) {
      countQuery += ` AND (al.details ILIKE $${countParamIndex} OR al.username ILIKE $${countParamIndex} OR al.action ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      logs: result.rows,
      total: totalCount,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/audit-logs/actions - Get distinct action types for filtering
router.get('/actions', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT action FROM audit_logs WHERE action IS NOT NULL ORDER BY action'
    );
    res.json(result.rows.map(row => row.action));
  } catch (error) {
    console.error('Error fetching action types:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/audit-logs/resources - Get distinct resource types for filtering
router.get('/resources', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT resource FROM audit_logs WHERE resource IS NOT NULL ORDER BY resource'
    );
    res.json(result.rows.map(row => row.resource));
  } catch (error) {
    console.error('Error fetching resource types:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/audit-logs/users - Get distinct usernames for filtering
router.get('/users', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT username FROM audit_logs WHERE username IS NOT NULL ORDER BY username'
    );
    res.json(result.rows.map(row => row.username));
  } catch (error) {
    console.error('Error fetching usernames:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/audit-logs - Create audit log entry
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      username,
      action,
      details,
      user_id,
      resource,
      ip_address,
      user_agent,
      session_id
    } = req.body;

    const result = await pool.query(
      `INSERT INTO audit_logs (
        username,
        action,
        details,
        user_id,
        resource,
        ip_address,
        user_agent,
        session_id,
        retention_category,
        timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PERMANENT', CURRENT_TIMESTAMP)
      RETURNING id, timestamp, username, action, details, resource, ip_address, user_agent, session_id`,
      [username, action, details, user_id || null, resource || null, ip_address || null, user_agent || null, session_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/audit-logs/export - Export audit logs to Excel
router.get('/export', async (req: Request, res: Response) => {
  try {
    const {
      username,
      action,
      resource,
      resource_id,
      start_date,
      end_date,
      search,
      limit = '10000', // Higher limit for export
      offset = '0'
    } = req.query;

    let query = `
      SELECT
        al.id,
        al.timestamp,
        al.username,
        al.action,
        al.details,
        al.resource,
        al.ip_address
      FROM audit_logs al
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Filter by username
    if (username && username !== 'all') {
      query += ` AND al.username = $${paramIndex}`;
      params.push(username);
      paramIndex++;
    }

    // Filter by action
    if (action && action !== 'all') {
      query += ` AND al.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    // Filter by resource
    if (resource && resource !== 'all') {
      query += ` AND al.resource = $${paramIndex}`;
      params.push(resource);
      paramIndex++;
    }



    // Filter by date range
    if (start_date) {
      query += ` AND al.timestamp >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND al.timestamp <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    // Search in details
    if (search) {
      query += ` AND (al.details ILIKE $${paramIndex} OR al.username ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY al.timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const logs = result.rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      username: row.username,
      action: row.action,
      details: row.details,
      resource: row.resource,
    }));

    await generateAuditLogsExcel(logs, res);
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


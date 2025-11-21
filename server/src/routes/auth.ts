import express, { Request, Response } from 'express';
import pool from '../db/connection.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '24h';

// Role permissions mapping
const rolePermissions: Record<string, string[]> = {
  SUDO: [
    'VIEW_RECEPTION', 'CREATE_VISIT', 'COLLECT_DUE_PAYMENT',
    'VIEW_PHLEBOTOMY', 'COLLECT_SAMPLE',
    'VIEW_LAB', 'ENTER_RESULTS',
    'VIEW_APPROVER', 'APPROVE_RESULTS',
    'VIEW_ADMIN_PANEL', 'MANAGE_USERS', 'MANAGE_ROLES', 'MANAGE_TESTS', 'MANAGE_PRICES', 'MANAGE_B2B', 'MANAGE_ANTIBIOTICS',
    'EDIT_APPROVED_REPORT', 'VIEW_AUDIT_LOG'
  ],
  ADMIN: [
    'VIEW_RECEPTION', 'CREATE_VISIT', 'COLLECT_DUE_PAYMENT',
    'VIEW_PHLEBOTOMY', 'COLLECT_SAMPLE',
    'VIEW_LAB', 'ENTER_RESULTS',
    'VIEW_APPROVER', 'APPROVE_RESULTS',
    'VIEW_ADMIN_PANEL', 'MANAGE_TESTS', 'MANAGE_PRICES', 'MANAGE_B2B', 'MANAGE_ANTIBIOTICS'
  ],
  RECEPTION: ['VIEW_RECEPTION', 'CREATE_VISIT', 'COLLECT_DUE_PAYMENT'],
  PHLEBOTOMY: ['VIEW_PHLEBOTOMY', 'COLLECT_SAMPLE'],
  LAB: ['VIEW_LAB', 'ENTER_RESULTS'],
  APPROVER: ['VIEW_APPROVER', 'APPROVE_RESULTS'],
  B2B_CLIENT: ['VIEW_B2B_DASHBOARD', 'REQUEST_VISIT', 'VIEW_LEDGER', 'PRINT_REPORT'],
};

// Helper function to log authentication attempts
const logAuthAttempt = async (
  username: string,
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT',
  details: string,
  req: Request,
  userId?: number
) => {
  try {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    await pool.query(
      `INSERT INTO audit_logs (
        username,
        action,
        details,
        user_id,
        ip_address,
        user_agent,
        retention_category,
        timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, 'LOGIN', CURRENT_TIMESTAMP)`,
      [username, action, details, userId || null, ipAddress, userAgent]
    );
  } catch (error) {
    console.error('Error logging auth attempt:', error);
    // Don't throw - logging failure shouldn't prevent login
  }
};

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    console.log('Login attempt for user:', username);

    if (!username || !password) {
      await logAuthAttempt(username || 'unknown', 'LOGIN_FAILED', 'Missing username or password', req);
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check for account lockout - prevent brute force attacks
    const failedAttemptsResult = await pool.query(
      `SELECT COUNT(*) as count FROM audit_logs
       WHERE username = $1
       AND action = 'LOGIN_FAILED'
       AND timestamp > NOW() - INTERVAL '1 hour'`,
      [username]
    );

    const failedAttempts = parseInt(failedAttemptsResult.rows[0].count);
    if (failedAttempts >= 5) {
      await logAuthAttempt(username, 'LOGIN_FAILED', 'Account temporarily locked due to multiple failed attempts', req);
      return res.status(429).json({
        error: 'Account temporarily locked due to multiple failed login attempts. Please try again in 1 hour or contact administrator.'
      });
    }

    console.log('Querying database for user:', username);
    const result = await pool.query(
      'SELECT id, username, password_hash, role, is_active FROM users WHERE username = $1',
      [username]
    );
    console.log('Query result:', result.rows.length, 'rows');

    if (result.rows.length === 0) {
      await logAuthAttempt(username, 'LOGIN_FAILED', 'User not found', req);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      await logAuthAttempt(username, 'LOGIN_FAILED', 'User account is inactive', req, user.id);
      return res.status(401).json({ error: 'User account is inactive' });
    }

    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(password, user.password_hash);
    } catch (error) {
      console.error('Error comparing passwords:', error);
      await logAuthAttempt(username, 'LOGIN_FAILED', `Password comparison error: ${error}`, req, user.id);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!passwordMatch) {
      console.log('Password does not match');
      await logAuthAttempt(username, 'LOGIN_FAILED', 'Invalid password', req, user.id);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const permissions = rolePermissions[user.role] || [];

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // Log successful login
    await logAuthAttempt(
      username,
      'LOGIN_SUCCESS',
      `User logged in successfully with role ${user.role}`,
      req,
      user.id
    );

    console.log('Login successful for user:', username);
    // Token is returned to the client; it must be stored securely on the frontend (sessionStorage or HTTP-only cookies)
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        isActive: user.is_active,
        permissions,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    await logAuthAttempt(username || 'unknown', 'LOGIN_FAILED', `Login error: ${error}`, req);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token endpoint - checks if token is valid AND user is still active
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string; role: string };

    // Check if user is still active in database and get full user data
    const userResult = await pool.query(
      'SELECT id, username, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ error: 'User account is inactive' });
    }

    // Get permissions for the user's role
    const permissions = rolePermissions[user.role] || [];

    // Return full user object with permissions (same format as login)
    res.json({
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        isActive: user.is_active,
        permissions,
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout endpoint
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { username, userId } = req.body;

    if (username) {
      await logAuthAttempt(
        username,
        'LOGOUT',
        'User logged out',
        req,
        userId
      );
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Client login endpoint
router.post('/client-login', async (req: Request, res: Response) => {
  const { clientId, password } = req.body;

  try {
    console.log('Client login attempt for client ID:', clientId);

    if (!clientId || !password) {
      await logAuthAttempt(`CLIENT_${clientId || 'unknown'}`, 'LOGIN_FAILED', 'Missing client ID or password', req);
      return res.status(400).json({ error: 'Client ID and password are required' });
    }

    // Get client and login credentials
    const result = await pool.query(
      `SELECT c.id, c.name, c.type, c.balance, bcl.password_hash, bcl.is_active
       FROM clients c
       LEFT JOIN b2b_client_logins bcl ON c.id = bcl.client_id
       WHERE c.id = $1`,
      [clientId]
    );

    if (result.rows.length === 0) {
      await logAuthAttempt(`CLIENT_${clientId}`, 'LOGIN_FAILED', 'Client not found', req);
      return res.status(401).json({ error: 'Client not found' });
    }

    const client = result.rows[0];

    if (!client.password_hash) {
      await logAuthAttempt(`CLIENT_${client.name}`, 'LOGIN_FAILED', 'Client login not configured', req);
      return res.status(401).json({ error: 'Client login not configured' });
    }

    if (!client.is_active) {
      await logAuthAttempt(`CLIENT_${client.name}`, 'LOGIN_FAILED', 'Client account is inactive', req);
      return res.status(401).json({ error: 'Client account is inactive' });
    }

    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, client.password_hash);

    if (!passwordMatch) {
      await logAuthAttempt(`CLIENT_${client.name}`, 'LOGIN_FAILED', 'Invalid password', req);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await pool.query(
      'UPDATE b2b_client_logins SET last_login = CURRENT_TIMESTAMP WHERE client_id = $1',
      [clientId]
    );

    // Get B2B_CLIENT permissions
    const permissions = rolePermissions['B2B_CLIENT'] || [];

    // Generate JWT token for client
    const token = jwt.sign(
      {
        id: client.id,
        username: `CLIENT_${client.name}`,
        role: 'B2B_CLIENT',
        clientId: client.id,
        clientName: client.name,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // Log successful client login
    await logAuthAttempt(
      `CLIENT_${client.name}`,
      'LOGIN_SUCCESS',
      `B2B client logged in successfully (Type: ${client.type})`,
      req
    );

    console.log('Client login successful for client:', client.name);
    res.json({
      token,
      user: {
        id: client.id,
        username: `CLIENT_${client.name}`,
        role: 'B2B_CLIENT',
        isActive: true,
        permissions,
        clientId: client.id,
        clientName: client.name,
        clientType: client.type,
        balance: parseFloat(client.balance),
      },
    });
  } catch (error) {
    console.error('Client login error:', error);
    await logAuthAttempt(`CLIENT_${clientId || 'unknown'}`, 'LOGIN_FAILED', `Login error: ${error}`, req);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify client token endpoint
router.post('/verify-client', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (decoded.role !== 'B2B_CLIENT') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    // Check if client is still active
    const clientResult = await pool.query(
      `SELECT c.id, c.name, c.type, c.balance, bcl.is_active
       FROM clients c
       JOIN b2b_client_logins bcl ON c.id = bcl.client_id
       WHERE c.id = $1`,
      [decoded.clientId]
    );

    if (clientResult.rows.length === 0) {
      return res.status(401).json({ error: 'Client not found' });
    }

    const client = clientResult.rows[0];

    if (!client.is_active) {
      return res.status(401).json({ error: 'Client account is inactive' });
    }

    // Get B2B_CLIENT permissions
    const permissions = rolePermissions['B2B_CLIENT'] || [];

    res.json({
      valid: true,
      user: {
        id: client.id,
        username: `CLIENT_${client.name}`,
        role: 'B2B_CLIENT',
        isActive: true,
        permissions,
        clientId: client.id,
        clientName: client.name,
        clientType: client.type,
        balance: parseFloat(client.balance),
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;


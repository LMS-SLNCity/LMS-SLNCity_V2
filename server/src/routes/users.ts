import express, { Request, Response } from 'express';
import pool from '../db/connection.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Get all users with their permissions
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.username,
        u.role,
        u.is_active,
        u.signature_image_url,
        COALESCE(
          ARRAY_AGG(DISTINCT up.permission ORDER BY up.permission) FILTER (WHERE up.permission IS NOT NULL),
          ARRAY[]::TEXT[]
        ) as permissions
      FROM users u
      LEFT JOIN user_permissions up ON u.id = up.user_id
      GROUP BY u.id, u.username, u.role, u.is_active, u.signature_image_url
      ORDER BY u.id
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID with permissions
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT
        u.id,
        u.username,
        u.role,
        u.is_active,
        u.signature_image_url,
        COALESCE(
          ARRAY_AGG(DISTINCT up.permission ORDER BY up.permission) FILTER (WHERE up.permission IS NOT NULL),
          ARRAY[]::TEXT[]
        ) as permissions
      FROM users u
      LEFT JOIN user_permissions up ON u.id = up.user_id
      WHERE u.id = $1
      GROUP BY u.id, u.username, u.role, u.is_active, u.signature_image_url
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user
router.post('/', async (req: Request, res: Response) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password, and role are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (username, password_hash, role, is_active) VALUES ($1, $2, $3, $4) RETURNING id, username, role, is_active, signature_image_url',
      [username, hashedPassword, role, true]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, is_active } = req.body;

    const result = await pool.query(
      'UPDATE users SET role = COALESCE($1, role), is_active = COALESCE($2, is_active), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, username, role, is_active, signature_image_url',
      [role, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (hard delete - audit logs are preserved)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user exists and is not SUDO
    const userCheck = await pool.query(
      'SELECT id, username, role FROM users WHERE id = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userCheck.rows[0];

    // Prevent deletion of SUDO users
    if (user.role === 'SUDO') {
      return res.status(403).json({ error: 'Cannot delete SUDO user' });
    }

    // Hard delete: remove user from database
    // Audit logs are preserved because they reference user_id but don't have foreign key constraints
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: 'User deleted successfully', username: user.username });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enable user (restore disabled account)
router.post('/:id/enable', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Enable user account
    const result = await pool.query(
      'UPDATE users SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, username, role, is_active',
      [id]
    );

    res.json({ message: 'User account enabled successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Error enabling user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user permissions
router.patch('/:id/permissions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Permissions must be an array' });
    }

    // Check if user exists
    const userCheck = await pool.query(
      'SELECT id, username, role FROM users WHERE id = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userCheck.rows[0];

    // Prevent editing SUDO user permissions
    if (user.role === 'SUDO') {
      return res.status(403).json({ error: 'SUDO user permissions cannot be edited' });
    }

    // Delete existing permissions
    await pool.query('DELETE FROM user_permissions WHERE user_id = $1', [id]);

    // Insert new permissions
    if (permissions.length > 0) {
      const values = permissions.map((perm, idx) => `($1, $${idx + 2})`).join(', ');
      const params = [id, ...permissions];
      await pool.query(
        `INSERT INTO user_permissions (user_id, permission) VALUES ${values}`,
        params
      );
    }

    // Return updated user with permissions
    const result = await pool.query(`
      SELECT
        u.id,
        u.username,
        u.role,
        u.is_active,
        u.signature_image_url,
        COALESCE(
          ARRAY_AGG(DISTINCT up.permission ORDER BY up.permission) FILTER (WHERE up.permission IS NOT NULL),
          ARRAY[]::TEXT[]
        ) as permissions
      FROM users u
      LEFT JOIN user_permissions up ON u.id = up.user_id
      WHERE u.id = $1
      GROUP BY u.id, u.username, u.role, u.is_active, u.signature_image_url
    `, [id]);

    console.log(`✅ Updated permissions for user ${user.username}:`, permissions);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user permissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


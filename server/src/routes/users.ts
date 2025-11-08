import express, { Request, Response } from 'express';
import pool from '../db/connection.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Get all users
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, username, role, is_active, signature_image_url FROM users ORDER BY id'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, username, role, is_active, signature_image_url FROM users WHERE id = $1',
      [id]
    );
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

// Disable user (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
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

    // Soft delete: disable user account
    const result = await pool.query(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, username, role, is_active',
      [id]
    );

    res.json({ message: 'User account disabled successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Error disabling user:', error);
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

export default router;


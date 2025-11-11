import express, { Request, Response } from 'express';
import pool from '../db/connection.js';
import { longCache } from '../middleware/cache.js';

const router = express.Router();

// Get all branches (cached for 1 hour - rarely changes)
router.get('/', longCache, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, name, address, phone, email, city, state, pincode, is_active FROM branches ORDER BY id'
    );
    res.json(result.rows.map(row => ({
      id: row.id,
      name: row.name,
      address: row.address,
      phone: row.phone,
      email: row.email,
      city: row.city,
      state: row.state,
      pincode: row.pincode,
      isActive: row.is_active,
    })));
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get branch by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, name, address, phone, email, city, state, pincode, is_active FROM branches WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Branch not found' });
    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      address: row.address,
      phone: row.phone,
      email: row.email,
      city: row.city,
      state: row.state,
      pincode: row.pincode,
      isActive: row.is_active,
    });
  } catch (error) {
    console.error('Error fetching branch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create branch
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, address, phone, email, city, state, pincode } = req.body;
    if (!name || !address) {
      return res.status(400).json({ error: 'Name and address are required' });
    }
    const result = await pool.query(
      'INSERT INTO branches (name, address, phone, email, city, state, pincode, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, address, phone, email, city, state, pincode, is_active',
      [name, address, phone || null, email || null, city || null, state || null, pincode || null, true]
    );
    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      name: row.name,
      address: row.address,
      phone: row.phone,
      email: row.email,
      city: row.city,
      state: row.state,
      pincode: row.pincode,
      isActive: row.is_active,
    });
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update branch
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { name, address, phone, email, city, state, pincode, isActive } = req.body;
    const result = await pool.query(
      'UPDATE branches SET name = COALESCE($1, name), address = COALESCE($2, address), phone = COALESCE($3, phone), email = COALESCE($4, email), city = COALESCE($5, city), state = COALESCE($6, state), pincode = COALESCE($7, pincode), is_active = COALESCE($8, is_active), updated_at = CURRENT_TIMESTAMP WHERE id = $9 RETURNING id, name, address, phone, email, city, state, pincode, is_active',
      [name, address, phone, email, city, state, pincode, isActive, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Branch not found' });
    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      address: row.address,
      phone: row.phone,
      email: row.email,
      city: row.city,
      state: row.state,
      pincode: row.pincode,
      isActive: row.is_active,
    });
  } catch (error) {
    console.error('Error updating branch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete branch (soft delete - set is_active to false)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `UPDATE branches
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, address, phone, email, city, state, pincode, is_active`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Branch not found' });
    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      address: row.address,
      phone: row.phone,
      email: row.email,
      city: row.city,
      state: row.state,
      pincode: row.pincode,
      isActive: row.is_active,
    });
  } catch (error) {
    console.error('Error deleting branch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


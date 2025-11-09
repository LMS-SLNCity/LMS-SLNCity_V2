import express, { Request, Response } from 'express';
import pool from '../db/connection.js';

const router = express.Router();

// Get all units
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, name, symbol, category, description, is_active, created_at, updated_at
      FROM units
      ORDER BY category, name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active units only
router.get('/active', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, name, symbol, category, description
      FROM units
      WHERE is_active = TRUE
      ORDER BY category, name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching active units:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unit by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, name, symbol, category, description, is_active, created_at, updated_at FROM units WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Unit not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching unit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new unit
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, symbol, category, description } = req.body;

    if (!name || !symbol) {
      return res.status(400).json({ error: 'Name and symbol are required' });
    }

    const result = await pool.query(
      `INSERT INTO units (name, symbol, category, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, symbol, category, description, is_active, created_at, updated_at`,
      [name, symbol, category, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating unit:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Unit with this name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update unit
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { name, symbol, category, description, is_active } = req.body;

    const result = await pool.query(
      `UPDATE units
       SET name = COALESCE($1, name),
           symbol = COALESCE($2, symbol),
           category = COALESCE($3, category),
           description = COALESCE($4, description),
           is_active = COALESCE($5, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, name, symbol, category, description, is_active, created_at, updated_at`,
      [name, symbol, category, description, is_active, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating unit:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Unit with this name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete unit (soft delete by setting is_active to false)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `UPDATE units
       SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    res.json({ message: 'Unit deactivated successfully' });
  } catch (error) {
    console.error('Error deleting unit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


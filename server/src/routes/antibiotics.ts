import express, { Request, Response } from 'express';
import pool from '../db/connection.js';
import { longCache } from '../middleware/cache.js';

const router = express.Router();

// Cache for 1 hour - antibiotics list rarely changes
router.get('/', longCache, async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT id, name, abbreviation, is_active FROM antibiotics ORDER BY id');
    res.json(result.rows.map(row => ({
      id: row.id,
      name: row.name,
      abbreviation: row.abbreviation,
      isActive: row.is_active,
    })));
  } catch (error) {
    console.error('Error fetching antibiotics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT id, name, abbreviation, is_active FROM antibiotics WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Antibiotic not found' });
    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      abbreviation: row.abbreviation,
      isActive: row.is_active,
    });
  } catch (error) {
    console.error('Error fetching antibiotic:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, abbreviation } = req.body;
    const result = await pool.query(
      'INSERT INTO antibiotics (name, abbreviation, is_active) VALUES ($1, $2, $3) RETURNING id, name, abbreviation, is_active',
      [name, abbreviation, true]
    );
    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      name: row.name,
      abbreviation: row.abbreviation,
      isActive: row.is_active,
    });
  } catch (error) {
    console.error('Error creating antibiotic:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { name, abbreviation, isActive } = req.body;
    const result = await pool.query(
      'UPDATE antibiotics SET name = COALESCE($1, name), abbreviation = COALESCE($2, abbreviation), is_active = COALESCE($3, is_active), updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, name, abbreviation, is_active',
      [name, abbreviation, isActive, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Antibiotic not found' });
    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      abbreviation: row.abbreviation,
      isActive: row.is_active,
    });
  } catch (error) {
    console.error('Error updating antibiotic:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `UPDATE antibiotics
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, abbreviation, is_active`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Antibiotic not found' });
    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      abbreviation: row.abbreviation,
      isActive: row.is_active,
    });
  } catch (error) {
    console.error('Error deleting antibiotic:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


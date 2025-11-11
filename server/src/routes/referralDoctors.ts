import express, { Request, Response } from 'express';
import pool from '../db/connection.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { longCache } from '../middleware/cache.js';

const router = express.Router();

// GET all referral doctors (cached for 1 hour - rarely changes)
router.get('/', longCache, async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT id, name, designation FROM referral_doctors ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching referral doctors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET single referral doctor (no auth required for reading)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT id, name, designation FROM referral_doctors WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Referral doctor not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching referral doctor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST - Create new referral doctor (requires auth and MANAGE_B2B permission)
router.post('/', authMiddleware, requirePermission(['MANAGE_B2B']), async (req: Request, res: Response) => {
  try {
    const { name, designation } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Doctor name is required' });
    }

    const result = await pool.query(
      'INSERT INTO referral_doctors (name, designation) VALUES ($1, $2) RETURNING id, name, designation',
      [name.trim(), designation?.trim() || null]
    );
    console.log('✅ Created referral doctor:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating referral doctor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH - Update referral doctor (requires auth and MANAGE_B2B permission)
router.patch('/:id', authMiddleware, requirePermission(['MANAGE_B2B']), async (req: Request, res: Response) => {
  try {
    const { name, designation } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Doctor name is required' });
    }

    const result = await pool.query(
      'UPDATE referral_doctors SET name = $1, designation = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, name, designation',
      [name.trim(), designation?.trim() || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Referral doctor not found' });
    console.log('✅ Updated referral doctor:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating referral doctor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE - Delete referral doctor (requires auth and MANAGE_B2B permission)
router.delete('/:id', authMiddleware, requirePermission(['MANAGE_B2B']), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'DELETE FROM referral_doctors WHERE id = $1 RETURNING id, name, designation',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Referral doctor not found' });
    console.log('✅ Deleted referral doctor:', result.rows[0]);
    res.json({ message: 'Referral doctor deleted successfully', doctor: result.rows[0] });
  } catch (error) {
    console.error('Error deleting referral doctor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


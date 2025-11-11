import express, { Request, Response } from 'express';
import pool from '../db/connection.js';
import { longCache } from '../middleware/cache.js';

const router = express.Router();

// Get all test templates (cached for 1 hour - rarely changes)
router.get('/', longCache, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, code, name, category, price, b2b_price, is_active, report_type, parameters, default_antibiotic_ids, sample_type FROM test_templates ORDER BY id'
    );
    res.json(result.rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      price: parseFloat(row.price),
      b2b_price: parseFloat(row.b2b_price),
      isActive: row.is_active,
      reportType: row.report_type,
      parameters: typeof row.parameters === 'string' ? JSON.parse(row.parameters) : row.parameters,
      defaultAntibioticIds: row.default_antibiotic_ids,
      sampleType: row.sample_type,
    })));
  } catch (error) {
    console.error('Error fetching test templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get test template by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, code, name, category, price, b2b_price, is_active, report_type, parameters, default_antibiotic_ids, sample_type FROM test_templates WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test template not found' });
    }
    const row = result.rows[0];
    res.json({
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      price: parseFloat(row.price),
      b2b_price: parseFloat(row.b2b_price),
      isActive: row.is_active,
      reportType: row.report_type,
      parameters: typeof row.parameters === 'string' ? JSON.parse(row.parameters) : row.parameters,
      defaultAntibioticIds: row.default_antibiotic_ids,
      sampleType: row.sample_type,
    });
  } catch (error) {
    console.error('Error fetching test template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create test template
router.post('/', async (req: Request, res: Response) => {
  try {
    const { code, name, category, price, b2b_price, report_type, parameters, defaultAntibioticIds, sampleType } = req.body;

    const result = await pool.query(
      `INSERT INTO test_templates (code, name, category, price, b2b_price, report_type, parameters, default_antibiotic_ids, sample_type, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, code, name, category, price, b2b_price, is_active, report_type, parameters, default_antibiotic_ids, sample_type`,
      [code, name, category, price, b2b_price, report_type, JSON.stringify(parameters), defaultAntibioticIds || [], sampleType || null, true]
    );

    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      price: parseFloat(row.price),
      b2b_price: parseFloat(row.b2b_price),
      isActive: row.is_active,
      reportType: row.report_type,
      parameters: typeof row.parameters === 'string' ? JSON.parse(row.parameters) : row.parameters,
      defaultAntibioticIds: row.default_antibiotic_ids,
      sampleType: row.sample_type,
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Test code already exists' });
    }
    console.error('Error creating test template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update test template
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, category, price, b2b_price, report_type, parameters, defaultAntibioticIds, sampleType, is_active } = req.body;

    const result = await pool.query(
      `UPDATE test_templates
       SET code = COALESCE($1, code),
           name = COALESCE($2, name),
           category = COALESCE($3, category),
           price = COALESCE($4, price),
           b2b_price = COALESCE($5, b2b_price),
           report_type = COALESCE($6, report_type),
           parameters = COALESCE($7, parameters),
           default_antibiotic_ids = COALESCE($8, default_antibiotic_ids),
           sample_type = COALESCE($9, sample_type),
           is_active = COALESCE($10, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING id, code, name, category, price, b2b_price, is_active, report_type, parameters, default_antibiotic_ids, sample_type`,
      [code, name, category, price, b2b_price, report_type, parameters ? JSON.stringify(parameters) : null, defaultAntibioticIds, sampleType, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test template not found' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      price: parseFloat(row.price),
      b2b_price: parseFloat(row.b2b_price),
      isActive: row.is_active,
      reportType: row.report_type,
      parameters: typeof row.parameters === 'string' ? JSON.parse(row.parameters) : row.parameters,
      defaultAntibioticIds: row.default_antibiotic_ids,
      sampleType: row.sample_type,
    });
  } catch (error) {
    console.error('Error updating test template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete test template (soft delete - set is_active to false)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE test_templates
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, code, name, category, price, b2b_price, is_active, report_type, parameters, default_antibiotic_ids`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test template not found' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      price: parseFloat(row.price),
      b2b_price: parseFloat(row.b2b_price),
      isActive: row.is_active,
      reportType: row.report_type,
      parameters: typeof row.parameters === 'string' ? JSON.parse(row.parameters) : row.parameters,
      defaultAntibioticIds: row.default_antibiotic_ids,
    });
  } catch (error) {
    console.error('Error deleting test template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


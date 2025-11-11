import express, { Request, Response } from 'express';
import pool from '../db/connection.js';
import { auditPatient } from '../middleware/auditLogger.js';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, patient_code, salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history FROM patients ORDER BY id'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search patients by phone or name
router.get('/search/:query', async (req: Request, res: Response) => {
  try {
    const searchQuery = req.params.query.trim();

    if (!searchQuery) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Search by phone (exact match) OR name (partial match, case-insensitive)
    const result = await pool.query(
      `SELECT id, patient_code, salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history
       FROM patients
       WHERE phone = $1 OR LOWER(name) LIKE LOWER($2)
       ORDER BY
         CASE WHEN phone = $1 THEN 1 ELSE 2 END,
         name
       LIMIT 20`,
      [searchQuery, `%${searchQuery}%`]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error searching patients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, patient_code, salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history FROM patients WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history } = req.body;
    const result = await pool.query(
      `INSERT INTO patients (salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, patient_code, salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history`,
      [salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history]
    );

    const patient = result.rows[0];

    // Audit log: Patient registration
    await auditPatient.create(req, patient.id, patient);

    res.status(201).json(patient);
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history } = req.body;

    // Get old values for audit trail
    const oldResult = await pool.query(
      'SELECT id, salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history FROM patients WHERE id = $1',
      [req.params.id]
    );

    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const oldData = oldResult.rows[0];

    const result = await pool.query(
      `UPDATE patients
       SET salutation = COALESCE($1, salutation),
           name = COALESCE($2, name),
           age_years = COALESCE($3, age_years),
           age_months = COALESCE($4, age_months),
           age_days = COALESCE($5, age_days),
           sex = COALESCE($6, sex),
           guardian_name = COALESCE($7, guardian_name),
           phone = COALESCE($8, phone),
           address = COALESCE($9, address),
           email = COALESCE($10, email),
           clinical_history = COALESCE($11, clinical_history),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING id, salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history`,
      [salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history, req.params.id]
    );

    const newData = result.rows[0];

    // Audit log: Patient update with old and new values
    await auditPatient.update(req, parseInt(req.params.id), oldData, newData);

    res.json(newData);
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


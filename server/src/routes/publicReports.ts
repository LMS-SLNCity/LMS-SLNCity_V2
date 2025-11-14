/**
 * Public Reports API Routes
 * These routes are accessible without authentication for QR code verification
 */

import express, { Request, Response } from 'express';
import pool from '../db/connection.js';

const router = express.Router();

/**
 * GET /api/public/reports/:visitCode
 * Get report data by visit code (public access for QR code scanning)
 * Returns full report with all timestamps and audit trail
 */
router.get('/:visitCode', async (req: Request, res: Response) => {
  try {
    const { visitCode } = req.params;
    console.log(`📋 Public report request for visit code: ${visitCode}`);

    // Get visit details
    const visitResult = await pool.query(
      `SELECT v.id, v.patient_id, v.referred_doctor_id, v.ref_customer_id, v.other_ref_doctor, v.other_ref_customer,
              v.registration_datetime, v.visit_code, v.total_cost, v.amount_paid, v.payment_mode, v.due_amount, v.created_at,
              p.salutation, p.name, p.age_years, p.age_months, p.age_days, p.sex, p.phone, p.address, p.email,
              rd.name as referred_doctor_name, rd.designation as referred_doctor_designation,
              c.name as b2b_client_name
       FROM visits v
       JOIN patients p ON v.patient_id = p.id
       LEFT JOIN referral_doctors rd ON v.referred_doctor_id = rd.id
       LEFT JOIN clients c ON v.ref_customer_id = c.id
       WHERE v.visit_code = $1`,
      [visitCode]
    );

    if (visitResult.rows.length === 0) {
      console.log(`❌ Visit not found for code: ${visitCode}`);
      return res.status(404).json({ error: 'Report not found. Please check the visit code.' });
    }

    const visit = visitResult.rows[0];
    console.log(`✅ Visit found: ${visit.visit_code}, Patient: ${visit.name}`);

    // Get all tests for this visit with full details including timestamps
    const testsResult = await pool.query(
      `SELECT vt.id, vt.visit_id, vt.test_template_id, vt.status,
              vt.collected_by, vt.collected_at, vt.specimen_type,
              vt.results, vt.culture_result,
              vt.entered_by, vt.entered_at,
              vt.approved_by, vt.approved_at,
              vt.rejection_count, vt.last_rejection_at,
              vt.created_at, vt.updated_at,
              tt.id as template_id, tt.code, tt.name, tt.category,
              tt.price, tt.b2b_price, tt.is_active, tt.report_type,
              tt.parameters, tt.default_antibiotic_ids, tt.sample_type, tt.tat_hours
       FROM visit_tests vt
       JOIN test_templates tt ON vt.test_template_id = tt.id
       WHERE vt.visit_id = $1 AND vt.status IN ('APPROVED', 'PRINTED', 'COMPLETED')
       ORDER BY tt.category, tt.name`,
      [visit.id]
    );

    console.log(`📊 Found ${testsResult.rows.length} approved tests for visit ${visit.visit_code}`);

    if (testsResult.rows.length === 0) {
      console.log(`⚠️  No approved tests found for visit ${visit.visit_code}`);
      return res.status(404).json({
        error: 'Report not ready yet. Tests are still being processed or have not been approved.'
      });
    }

    // Get antibiotics for culture tests
    const antibioticsResult = await pool.query(
      'SELECT id, name, abbreviation, is_active FROM antibiotics WHERE is_active = true ORDER BY name'
    );

    // Get approvers who approved the tests
    const approversResult = await pool.query(
      `SELECT DISTINCT u.id, u.username, u.full_name, u.role
       FROM users u
       JOIN visit_tests vt ON vt.approved_by = u.username
       WHERE vt.visit_id = $1`,
      [visit.id]
    );

    // Get signatory information (use the first approver or a default)
    const signatory = approversResult.rows.length > 0 
      ? {
          id: approversResult.rows[0].id,
          name: approversResult.rows[0].full_name || approversResult.rows[0].username,
          title: 'Lab Director',
          show_on_print: true
        }
      : {
          id: 0,
          name: 'Lab Director',
          title: 'Director',
          show_on_print: true
        };

    // Format the response
    const formattedVisit = {
      id: visit.id,
      patient_id: visit.patient_id,
      referred_doctor_id: visit.referred_doctor_id,
      ref_customer_id: visit.ref_customer_id,
      other_ref_doctor: visit.other_ref_doctor,
      other_ref_customer: visit.other_ref_customer,
      registration_datetime: visit.registration_datetime,
      visit_code: visit.visit_code,
      total_cost: parseFloat(visit.total_cost),
      amount_paid: parseFloat(visit.amount_paid),
      payment_mode: visit.payment_mode,
      due_amount: parseFloat(visit.due_amount),
      created_at: visit.created_at,
      patient: {
        id: visit.patient_id,
        salutation: visit.salutation,
        name: visit.name,
        age_years: visit.age_years,
        age_months: visit.age_months,
        age_days: visit.age_days,
        sex: visit.sex,
        phone: visit.phone,
        address: visit.address,
        email: visit.email
      },
      referred_doctor: visit.referred_doctor_name ? {
        name: visit.referred_doctor_name,
        designation: visit.referred_doctor_designation
      } : null,
      b2b_client: visit.b2b_client_name ? {
        name: visit.b2b_client_name
      } : null,
      tests: testsResult.rows.map(test => ({
        id: test.id,
        visit_id: test.visit_id,
        test_template_id: test.test_template_id,
        status: test.status,
        collected_by: test.collected_by,
        collected_at: test.collected_at,
        specimen_type: test.specimen_type,
        results: test.results,
        culture_result: test.culture_result,
        entered_by: test.entered_by,
        entered_at: test.entered_at,
        approved_by: test.approved_by,
        approved_at: test.approved_at,
        rejection_count: test.rejection_count,
        last_rejection_at: test.last_rejection_at,
        created_at: test.created_at,
        updated_at: test.updated_at,
        template: {
          id: test.template_id,
          code: test.code,
          name: test.name,
          category: test.category,
          price: parseFloat(test.price),
          b2b_price: parseFloat(test.b2b_price),
          isActive: test.is_active,
          reportType: test.report_type,
          parameters: test.parameters,
          defaultAntibioticIds: test.default_antibiotic_ids || [],
          sampleType: test.sample_type,
          tatHours: test.tat_hours
        }
      }))
    };

    console.log(`✅ Sending public report for visit ${visit.visit_code} with ${testsResult.rows.length} tests`);

    res.json({
      visit: formattedVisit,
      signatory,
      antibiotics: antibioticsResult.rows,
      approvers: approversResult.rows
    });
  } catch (error) {
    console.error('❌ Error fetching public report:', error);
    res.status(500).json({ error: 'Failed to load report. Please try again later.' });
  }
});

export default router;


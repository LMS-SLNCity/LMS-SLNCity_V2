/**
 * Audit Logger Middleware
 * 
 * Provides centralized audit logging functionality for all system operations.
 * Ensures comprehensive audit trail from patient registration to report printing.
 */

import { Request } from 'express';
import pool from '../db/connection.js';

export interface AuditLogData {
  username: string;
  action: string;
  details: string;
  userId?: number;
  resource?: string;
  resourceId?: number;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

/**
 * Create an audit log entry
 * This function should NEVER throw errors - audit failures should not break operations
 */
export const createAuditLog = async (data: AuditLogData): Promise<void> => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (
        username,
        action,
        details,
        user_id,
        resource,
        ip_address,
        user_agent,
        session_id,
        retention_category,
        timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PERMANENT', CURRENT_TIMESTAMP)`,
      [
        data.username,
        data.action,
        data.details,
        data.userId || null,
        data.resource || null,
        data.ipAddress || null,
        data.userAgent || null,
        data.sessionId || null,
      ]
    );
  } catch (error) {
    console.error('❌ Audit log creation failed:', error);
    // Don't throw - audit failure should not break the operation
  }
};

/**
 * Extract user info from request
 * Assumes authentication middleware has set req.user
 */
export const getUserFromRequest = (req: Request): { username: string; userId?: number } => {
  const user = (req as any).user;
  if (user) {
    return {
      username: user.username || 'unknown',
      userId: user.id,
    };
  }
  return { username: 'system' };
};

/**
 * Extract IP address from request
 */
export const getIpAddress = (req: Request): string => {
  return req.ip || req.socket.remoteAddress || 'unknown';
};

/**
 * Extract user agent from request
 */
export const getUserAgent = (req: Request): string => {
  return req.headers['user-agent'] || 'unknown';
};

/**
 * Audit log helper for patient operations
 */
export const auditPatient = {
  create: async (req: Request, patientId: number, patientData: any) => {
    const user = getUserFromRequest(req);
    await createAuditLog({
      username: user.username,
      userId: user.userId,
      action: 'CREATE_PATIENT',
      details: `Created patient: ${patientData.name} (ID: ${patientId})`,
      resource: 'patient',
      resourceId: patientId,
      newValues: patientData,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });
  },

  update: async (req: Request, patientId: number, oldData: any, newData: any) => {
    const user = getUserFromRequest(req);
    await createAuditLog({
      username: user.username,
      userId: user.userId,
      action: 'UPDATE_PATIENT',
      details: `Updated patient ID ${patientId}`,
      resource: 'patient',
      resourceId: patientId,
      oldValues: oldData,
      newValues: newData,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });
  },

  delete: async (req: Request, patientId: number, patientData: any) => {
    const user = getUserFromRequest(req);
    await createAuditLog({
      username: user.username,
      userId: user.userId,
      action: 'DELETE_PATIENT',
      details: `Deleted patient: ${patientData.name} (ID: ${patientId})`,
      resource: 'patient',
      resourceId: patientId,
      oldValues: patientData,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });
  },
};

/**
 * Audit log helper for visit operations
 */
export const auditVisit = {
  create: async (req: Request, visitId: number, visitData: any) => {
    const user = getUserFromRequest(req);
    await createAuditLog({
      username: user.username,
      userId: user.userId,
      action: 'CREATE_VISIT',
      details: `Created visit ${visitData.visit_code} for patient ID ${visitData.patient_id}`,
      resource: 'visit',
      resourceId: visitId,
      newValues: visitData,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });
  },

  update: async (req: Request, visitId: number, oldData: any, newData: any) => {
    const user = getUserFromRequest(req);
    await createAuditLog({
      username: user.username,
      userId: user.userId,
      action: 'UPDATE_VISIT',
      details: `Updated visit ${oldData.visit_code || visitId}`,
      resource: 'visit',
      resourceId: visitId,
      oldValues: oldData,
      newValues: newData,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });
  },

  delete: async (req: Request, visitId: number, visitData: any) => {
    const user = getUserFromRequest(req);
    await createAuditLog({
      username: user.username,
      userId: user.userId,
      action: 'DELETE_VISIT',
      details: `Deleted visit ${visitData.visit_code} (ID: ${visitId})`,
      resource: 'visit',
      resourceId: visitId,
      oldValues: visitData,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });
  },
};

/**
 * Audit log helper for sample collection (phlebotomy)
 */
export const auditSample = {
  collect: async (req: Request, visitId: number, visitCode: string) => {
    const user = getUserFromRequest(req);
    await createAuditLog({
      username: user.username,
      userId: user.userId,
      action: 'COLLECT_SAMPLE',
      details: `Collected sample for visit ${visitCode}`,
      resource: 'visit',
      resourceId: visitId,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });
  },
};

/**
 * Audit log helper for test result operations
 */
export const auditTestResult = {
  enter: async (req: Request, visitTestId: number, testName: string, visitCode: string, resultData: any) => {
    const user = getUserFromRequest(req);
    await createAuditLog({
      username: user.username,
      userId: user.userId,
      action: 'ENTER_RESULT',
      details: `Entered results for ${testName} in visit ${visitCode}`,
      resource: 'visit_test',
      resourceId: visitTestId,
      newValues: resultData,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });
  },

  update: async (req: Request, visitTestId: number, testName: string, visitCode: string, oldData: any, newData: any, reason?: string) => {
    const user = getUserFromRequest(req);
    await createAuditLog({
      username: user.username,
      userId: user.userId,
      action: 'UPDATE_RESULT',
      details: `Updated results for ${testName} in visit ${visitCode}${reason ? `. Reason: ${reason}` : ''}`,
      resource: 'visit_test',
      resourceId: visitTestId,
      oldValues: oldData,
      newValues: newData,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });
  },

  approve: async (req: Request, visitTestId: number, testName: string, visitCode: string) => {
    const user = getUserFromRequest(req);
    await createAuditLog({
      username: user.username,
      userId: user.userId,
      action: 'APPROVE_RESULT',
      details: `Approved results for ${testName} in visit ${visitCode}`,
      resource: 'visit_test',
      resourceId: visitTestId,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });
  },

  reject: async (req: Request, visitTestId: number, testName: string, visitCode: string, reason: string) => {
    const user = getUserFromRequest(req);
    await createAuditLog({
      username: user.username,
      userId: user.userId,
      action: 'REJECT_RESULT',
      details: `Rejected results for ${testName} in visit ${visitCode}. Reason: ${reason}`,
      resource: 'visit_test',
      resourceId: visitTestId,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });
  },
};

/**
 * Audit log helper for report operations
 */
export const auditReport = {
  generate: async (req: Request, visitId: number, visitCode: string, signatory: string) => {
    const user = getUserFromRequest(req);
    await createAuditLog({
      username: user.username,
      userId: user.userId,
      action: 'GENERATE_REPORT',
      details: `Generated report for visit ${visitCode} with signatory ${signatory}`,
      resource: 'visit',
      resourceId: visitId,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });
  },

  print: async (req: Request, visitId: number, visitCode: string) => {
    const user = getUserFromRequest(req);
    await createAuditLog({
      username: user.username,
      userId: user.userId,
      action: 'PRINT_REPORT',
      details: `Printed report for visit ${visitCode}`,
      resource: 'visit',
      resourceId: visitId,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });
  },

  email: async (req: Request, visitId: number, visitCode: string, recipient: string) => {
    const user = getUserFromRequest(req);
    await createAuditLog({
      username: user.username,
      userId: user.userId,
      action: 'EMAIL_REPORT',
      details: `Emailed report for visit ${visitCode} to ${recipient}`,
      resource: 'visit',
      resourceId: visitId,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });
  },
};

export default {
  createAuditLog,
  getUserFromRequest,
  getIpAddress,
  getUserAgent,
  auditPatient,
  auditVisit,
  auditSample,
  auditTestResult,
  auditReport,
};


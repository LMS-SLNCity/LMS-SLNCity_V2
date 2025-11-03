/**
 * Audit Log Cleanup Service
 * 
 * This service automatically cleans up expired audit logs based on retention policies.
 * It runs on a scheduled interval to maintain NABL compliance while managing database size.
 * 
 * Retention Policies:
 * - LOGIN logs: 90 days (for security monitoring)
 * - All other logs: Permanent (NABL ISO 15189 requirement)
 */

import pool from '../db/connection.js';
import * as cron from 'node-cron';

interface CleanupResult {
  success: boolean;
  deletedCount: number;
  error?: string;
}

/**
 * Executes the cleanup of expired audit logs
 * @returns Promise with cleanup result
 */
export const cleanupExpiredAuditLogs = async (): Promise<CleanupResult> => {
  try {
    console.log('[Audit Cleanup] Starting cleanup of expired audit logs...');
    
    const result = await pool.query('SELECT * FROM cleanup_expired_audit_logs()');
    const deletedCount = result.rows[0]?.deleted_count || 0;
    
    // Log the cleanup operation
    await pool.query(
      `INSERT INTO audit_log_cleanup_history (
        logs_deleted, 
        retention_category, 
        executed_by, 
        notes
      ) VALUES ($1, $2, $3, $4)`,
      [
        deletedCount,
        'LOGIN',
        'SYSTEM',
        `Automated cleanup removed ${deletedCount} expired login logs`
      ]
    );
    
    console.log(`[Audit Cleanup] Successfully deleted ${deletedCount} expired logs`);
    
    return {
      success: true,
      deletedCount
    };
  } catch (error) {
    console.error('[Audit Cleanup] Error during cleanup:', error);
    
    // Try to log the failed cleanup attempt
    try {
      await pool.query(
        `INSERT INTO audit_log_cleanup_history (
          logs_deleted, 
          retention_category, 
          executed_by, 
          notes
        ) VALUES ($1, $2, $3, $4)`,
        [
          0,
          'LOGIN',
          'SYSTEM',
          `Cleanup failed: ${error}`
        ]
      );
    } catch (logError) {
      console.error('[Audit Cleanup] Failed to log cleanup error:', logError);
    }
    
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Gets statistics about audit log retention
 */
export const getAuditLogStats = async () => {
  try {
    const result = await pool.query(`
      SELECT 
        retention_category,
        COUNT(*) as total_logs,
        MIN(timestamp) as oldest_log,
        MAX(timestamp) as newest_log,
        COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP THEN 1 END) as expired_logs,
        COUNT(CASE WHEN expires_at IS NULL THEN 1 END) as permanent_logs,
        pg_size_pretty(pg_total_relation_size('audit_logs')) as table_size
      FROM audit_logs
      GROUP BY retention_category
    `);
    
    return result.rows;
  } catch (error) {
    console.error('[Audit Cleanup] Error getting stats:', error);
    return [];
  }
};

/**
 * Gets cleanup history
 */
export const getCleanupHistory = async (limit: number = 50) => {
  try {
    const result = await pool.query(
      `SELECT * FROM audit_log_cleanup_history 
       ORDER BY cleanup_date DESC 
       LIMIT $1`,
      [limit]
    );
    
    return result.rows;
  } catch (error) {
    console.error('[Audit Cleanup] Error getting cleanup history:', error);
    return [];
  }
};

/**
 * Initializes the scheduled cleanup job
 * Runs daily at 2:00 AM
 */
export const initializeCleanupScheduler = () => {
  // Run daily at 2:00 AM
  const schedule = '0 2 * * *';
  
  console.log('[Audit Cleanup] Initializing scheduled cleanup job...');
  console.log(`[Audit Cleanup] Schedule: Daily at 2:00 AM (cron: ${schedule})`);
  
  cron.schedule(schedule, async () => {
    console.log('[Audit Cleanup] Scheduled cleanup triggered');
    const result = await cleanupExpiredAuditLogs();
    
    if (result.success) {
      console.log(`[Audit Cleanup] Scheduled cleanup completed: ${result.deletedCount} logs deleted`);
    } else {
      console.error(`[Audit Cleanup] Scheduled cleanup failed: ${result.error}`);
    }
  });
  
  console.log('[Audit Cleanup] Scheduler initialized successfully');
  
  // Run initial cleanup on startup (optional - comment out if not desired)
  setTimeout(async () => {
    console.log('[Audit Cleanup] Running initial cleanup on startup...');
    await cleanupExpiredAuditLogs();
  }, 5000); // Wait 5 seconds after startup
};

/**
 * Manual cleanup trigger (for admin use)
 */
export const triggerManualCleanup = async (executedBy: string = 'ADMIN') => {
  console.log(`[Audit Cleanup] Manual cleanup triggered by ${executedBy}`);
  
  const result = await cleanupExpiredAuditLogs();
  
  // Update the cleanup history to reflect manual trigger
  if (result.success) {
    await pool.query(
      `UPDATE audit_log_cleanup_history 
       SET executed_by = $1, 
           notes = $2
       WHERE id = (SELECT MAX(id) FROM audit_log_cleanup_history)`,
      [
        executedBy,
        `Manual cleanup by ${executedBy}: ${result.deletedCount} expired login logs removed`
      ]
    );
  }
  
  return result;
};

export default {
  cleanupExpiredAuditLogs,
  getAuditLogStats,
  getCleanupHistory,
  initializeCleanupScheduler,
  triggerManualCleanup
};


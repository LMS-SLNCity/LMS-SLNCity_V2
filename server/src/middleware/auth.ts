import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        role: string;
      };
    }
  }
}

/**
 * Middleware to verify JWT token
 * Extracts token from Authorization header and validates it
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: number;
        username: string;
        role: string;
      };
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to check if user has specific role
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

/**
 * Middleware to check if user has specific permission
 */
export const requirePermission = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // For now, we'll check based on role
    // In a more advanced system, you'd query the database for user permissions
    const rolePermissions: Record<string, string[]> = {
      SUDO: [
        'VIEW_RECEPTION', 'CREATE_VISIT', 'COLLECT_DUE_PAYMENT',
        'VIEW_PHLEBOTOMY', 'COLLECT_SAMPLE',
        'VIEW_LAB', 'ENTER_RESULTS',
        'VIEW_APPROVER', 'APPROVE_RESULTS',
        'VIEW_ADMIN_PANEL', 'MANAGE_USERS', 'MANAGE_ROLES', 'MANAGE_TESTS', 'MANAGE_PRICES', 'MANAGE_B2B', 'MANAGE_ANTIBIOTICS',
        'EDIT_APPROVED_REPORT', 'VIEW_AUDIT_LOG'
      ],
      ADMIN: [
        'VIEW_RECEPTION', 'CREATE_VISIT', 'COLLECT_DUE_PAYMENT',
        'VIEW_PHLEBOTOMY', 'COLLECT_SAMPLE',
        'VIEW_LAB', 'ENTER_RESULTS',
        'VIEW_APPROVER', 'APPROVE_RESULTS',
        'VIEW_ADMIN_PANEL', 'MANAGE_TESTS', 'MANAGE_PRICES', 'MANAGE_B2B', 'MANAGE_ANTIBIOTICS'
      ],
      RECEPTION: ['VIEW_RECEPTION', 'CREATE_VISIT', 'COLLECT_DUE_PAYMENT'],
      PHLEBOTOMY: ['VIEW_PHLEBOTOMY', 'COLLECT_SAMPLE'],
      LAB: ['VIEW_LAB', 'ENTER_RESULTS'],
      APPROVER: ['VIEW_APPROVER', 'APPROVE_RESULTS'],
      B2B_CLIENT: ['VIEW_B2B_DASHBOARD', 'REQUEST_VISIT', 'VIEW_LEDGER', 'PRINT_REPORT'],
    };

    const userPermissions = rolePermissions[req.user.role] || [];
    const hasPermission = requiredPermissions.some(perm => userPermissions.includes(perm));

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};


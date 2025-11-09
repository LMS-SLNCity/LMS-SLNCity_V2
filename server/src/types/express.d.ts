/**
 * Express type extensions for better TypeScript support
 */

import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        role: string;
        permissions?: string[];
      };
      clientUser?: {
        id: number;
        clientId: number;
        username: string;
      };
    }
  }
}

export {};


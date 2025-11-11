import { Request, Response, NextFunction } from 'express';

/**
 * Cache middleware for GET requests
 * Sets Cache-Control headers to enable browser caching
 */

// Cache for 5 minutes (300 seconds) for frequently accessed, rarely changing data
export const cacheMiddleware = (duration: number = 300) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Set cache headers
    res.set('Cache-Control', `public, max-age=${duration}`);
    res.set('Expires', new Date(Date.now() + duration * 1000).toUTCString());
    
    next();
  };
};

// Short cache (1 minute) for data that changes frequently
export const shortCache = cacheMiddleware(60);

// Medium cache (5 minutes) for data that changes occasionally
export const mediumCache = cacheMiddleware(300);

// Long cache (1 hour) for data that rarely changes
export const longCache = cacheMiddleware(3600);

// No cache for dynamic data
export const noCache = (req: Request, res: Response, next: NextFunction) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
};


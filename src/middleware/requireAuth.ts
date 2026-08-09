import type { Request, Response, NextFunction } from 'express';
import type { UserCredentials } from '../authTypes.js';

export interface AuthenticatedRequest extends Request {
  user: UserCredentials;
}

/**
 * Requires an authenticated session; responds 401 when missing.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.user) {
    res.status(401).json({ error: 'Login required' });
    return;
  }
  (req as AuthenticatedRequest).user = req.session.user;
  next();
}

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { SafeUser, UserRole } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: SafeUser;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access denied: No authentication token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };
    const userRow = db.prepare(`
      SELECT id, student_id, email, full_name, department, batch_year, role, is_active, is_verified, created_at, updated_at
      FROM users WHERE id = ?
    `).get(decoded.userId) as SafeUser | undefined;

    if (!userRow) {
      res.status(401).json({ error: 'Authentication failed: User account no longer exists' });
      return;
    }

    if (!userRow.is_active) {
      res.status(403).json({ error: 'Account suspended: Contact election administrator' });
      return;
    }

    req.user = userRow;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired session token' });
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Unauthorized: Access restricted to roles [${allowedRoles.join(', ')}]`,
      });
      return;
    }

    next();
  };
}

export const requireAdmin = requireRole('ADMIN', 'ELECTION_OFFICER');
export const requireSuperAdmin = requireRole('ADMIN');
export const requireVoter = requireRole('VOTER');


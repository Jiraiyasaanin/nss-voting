import { Router, Response } from 'express';
import { db } from '../db/index.js';
import { authenticateToken, AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';

export const auditRouter = Router();

auditRouter.get('/', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { action, resourceType, page = '1', limit = '50' } = req.query as Record<string, string>;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  let query = `
    SELECT a.*, u.full_name as user_name, u.role as user_role, u.student_id
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (action) {
    query += ` AND a.action = ?`;
    params.push(action);
  }

  if (resourceType) {
    query += ` AND a.resource_type = ?`;
    params.push(resourceType);
  }

  query += ` ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit, 10), offset);

  const logs = db.prepare(query).all(...params);

  // Total count
  let countQuery = `SELECT COUNT(*) as total FROM audit_logs WHERE 1=1`;
  const countParams: any[] = [];
  if (action) {
    countQuery += ` AND action = ?`;
    countParams.push(action);
  }
  if (resourceType) {
    countQuery += ` AND resource_type = ?`;
    countParams.push(resourceType);
  }
  const totalRow = db.prepare(countQuery).get(...countParams) as { total: number };

  res.json({
    logs,
    total: totalRow.total,
    page: parseInt(page, 10),
    totalPages: Math.ceil(totalRow.total / parseInt(limit, 10)),
  });
});

// Admin System Maintenance: Clear Dummy Data with Password Confirmation
auditRouter.post('/system/clean-dummy-data', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { password, wipeVoters } = req.body;
    if (!password) {
      res.status(400).json({ error: 'Admin password confirmation required for destructive data reset.' });
      return;
    }

    // Verify requesting admin's password
    const bcrypt = (await import('bcryptjs')).default;
    const adminUser = db.prepare(`SELECT password_hash FROM users WHERE id = ?`).get(req.user!.id) as { password_hash: string } | undefined;
    if (!adminUser) {
      res.status(401).json({ error: 'Admin user not found' });
      return;
    }

    const isMatch = await bcrypt.compare(password, adminUser.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Incorrect administrator password. Data reset aborted.' });
      return;
    }

    // Perform clean
    const { cleanDatabase } = await import('../db/clean.js');
    await cleanDatabase(false); // retains admin account

    if (wipeVoters) {
      db.exec(`DELETE FROM users WHERE role = 'VOTER';`);
    }

    const { logAudit } = await import('../services/audit.js');
    logAudit({
      userId: req.user!.id,
      action: 'DUMMY_DATA_PURGED',
      resourceType: 'system',
      details: { wipeVoters: !!wipeVoters },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Dummy election records, candidates, ballots, and test voters have been purged successfully.',
    });
  } catch (err: any) {
    console.error('Data clean error:', err);
    res.status(500).json({ error: 'Failed to purge dummy data: ' + err.message });
  }
});


import { Router, Response } from 'express';
import { db } from '../db/index.js';
import { authenticateToken, AuthenticatedRequest, requireOfficer } from '../middleware/auth.js';
import { logAudit } from '../services/audit.js';

export const officerRouter = Router();

// All officer routes require either ELECTION_OFFICER or ADMIN role
officerRouter.use(authenticateToken, requireOfficer);

// 1. Get Identity Verification Overview Metrics
officerRouter.get('/stats', (_req: AuthenticatedRequest, res: Response) => {
  try {
    const pendingRow = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'VOTER' AND is_verified = 0`).get() as { count: number };
    const verifiedRow = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'VOTER' AND is_verified = 1`).get() as { count: number };
    const rejectedRow = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'VOTER' AND is_verified = -1`).get() as { count: number };
    const totalRow = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'VOTER'`).get() as { count: number };

    const deptRows = db.prepare(`
      SELECT 
        department,
        SUM(CASE WHEN is_verified = 0 THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as verified,
        SUM(CASE WHEN is_verified = -1 THEN 1 ELSE 0 END) as rejected,
        COUNT(*) as total
      FROM users
      WHERE role = 'VOTER'
      GROUP BY department
      ORDER BY department ASC
    `).all() as any[];

    res.json({
      pendingCount: pendingRow.count,
      verifiedCount: verifiedRow.count,
      rejectedCount: rejectedRow.count,
      totalCount: totalRow.count,
      departmentStats: deptRows,
    });
  } catch (err: any) {
    console.error('Officer stats error:', err);
    res.status(500).json({ error: 'Failed to retrieve officer statistics' });
  }
});

// 2. Query Student Registrations with Status / Search / Department Filters
officerRouter.get('/voters', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status = 'all', search, department, page = '1', limit = '50' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    let whereClause = `WHERE u.role = 'VOTER'`;
    const params: any[] = [];

    if (status === 'pending') {
      whereClause += ` AND u.is_verified = 0`;
    } else if (status === 'verified') {
      whereClause += ` AND u.is_verified = 1`;
    } else if (status === 'rejected') {
      whereClause += ` AND u.is_verified = -1`;
    }

    if (search && search.trim()) {
      whereClause += ` AND (u.student_id LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (department && department.trim() && department !== 'ALL') {
      whereClause += ` AND u.department = ?`;
      params.push(department.trim());
    }

    const countQuery = `SELECT COUNT(*) as total FROM users u ${whereClause}`;
    const totalCountRow = db.prepare(countQuery).get(...params) as { total: number };
    const total = totalCountRow.total;

    const dataQuery = `
      SELECT 
        u.id, 
        u.student_id, 
        u.email, 
        u.full_name, 
        u.department, 
        u.batch_year, 
        u.role, 
        u.is_active, 
        u.is_verified, 
        u.rejection_reason,
        u.verified_by,
        u.verified_at,
        u.created_at,
        u.updated_at,
        officer.full_name as verified_by_name,
        (SELECT COUNT(*) FROM webauthn_credentials w WHERE w.user_id = u.id) as biometric_count
      FROM users u
      LEFT JOIN users officer ON u.verified_by = officer.id
      ${whereClause}
      ORDER BY 
        CASE WHEN u.is_verified = 0 THEN 0 WHEN u.is_verified = -1 THEN 1 ELSE 2 END ASC,
        u.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const voters = db.prepare(dataQuery).all(...params, limitNum, offset);

    res.json({
      voters,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err: any) {
    console.error('Officer voters query error:', err);
    res.status(500).json({ error: 'Failed to retrieve voters for verification' });
  }
});

// 3. Verify & Certify a Voter Account (1-Click Action)
officerRouter.post('/verify-voter/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const officer = req.user!;

    const targetUser = db.prepare(`SELECT * FROM users WHERE id = ? AND role = 'VOTER'`).get(id) as any;
    if (!targetUser) {
      res.status(404).json({ error: 'Voter account not found' });
      return;
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE users 
      SET is_verified = 1, rejection_reason = NULL, verified_by = ?, verified_at = ?, updated_at = ?
      WHERE id = ?
    `).run(officer.id, now, now, id);

    logAudit({
      userId: officer.id,
      action: 'VOTER_IDENTITY_VERIFIED',
      resourceType: 'users',
      resourceId: id,
      details: {
        student_id: targetUser.student_id,
        full_name: targetUser.full_name,
        department: targetUser.department,
        officer_name: officer.full_name,
        previous_status: targetUser.is_verified,
      },
      ipAddress: (req.ip as string) || null,
    });

    const updatedUser = db.prepare(`
      SELECT u.id, u.student_id, u.email, u.full_name, u.department, u.batch_year, u.role, u.is_active, u.is_verified, u.rejection_reason, u.verified_by, u.verified_at, u.created_at, officer.full_name as verified_by_name
      FROM users u
      LEFT JOIN users officer ON u.verified_by = officer.id
      WHERE u.id = ?
    `).get(id);

    res.json({
      message: `Voter ${targetUser.full_name} (${targetUser.student_id}) identity successfully certified!`,
      voter: updatedUser,
    });
  } catch (err: any) {
    console.error('Verify voter error:', err);
    res.status(500).json({ error: 'Failed to verify voter account' });
  }
});

// 4. Reject / Flag a Voter Account with Reason
officerRouter.post('/reject-voter/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;
    const officer = req.user!;

    const targetUser = db.prepare(`SELECT * FROM users WHERE id = ? AND role = 'VOTER'`).get(id) as any;
    if (!targetUser) {
      res.status(404).json({ error: 'Voter account not found' });
      return;
    }

    const rejectionReason = (reason && reason.trim()) || 'Identity verification rejected by Returning Officer';
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE users 
      SET is_verified = -1, rejection_reason = ?, verified_by = ?, verified_at = ?, updated_at = ?
      WHERE id = ?
    `).run(rejectionReason, officer.id, now, now, id);

    logAudit({
      userId: officer.id,
      action: 'VOTER_IDENTITY_REJECTED',
      resourceType: 'users',
      resourceId: id,
      details: {
        student_id: targetUser.student_id,
        full_name: targetUser.full_name,
        reason: rejectionReason,
        officer_name: officer.full_name,
      },
      ipAddress: (req.ip as string) || null,
    });

    const updatedUser = db.prepare(`
      SELECT u.id, u.student_id, u.email, u.full_name, u.department, u.batch_year, u.role, u.is_active, u.is_verified, u.rejection_reason, u.verified_by, u.verified_at, u.created_at, officer.full_name as verified_by_name
      FROM users u
      LEFT JOIN users officer ON u.verified_by = officer.id
      WHERE u.id = ?
    `).get(id);

    res.json({
      message: `Voter ${targetUser.full_name} identity has been flagged/rejected.`,
      voter: updatedUser,
    });
  } catch (err: any) {
    console.error('Reject voter error:', err);
    res.status(500).json({ error: 'Failed to reject voter account' });
  }
});

// 5. Reset a Voter Account Back to Pending Verification
officerRouter.post('/reset-voter/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const officer = req.user!;

    const targetUser = db.prepare(`SELECT * FROM users WHERE id = ? AND role = 'VOTER'`).get(id) as any;
    if (!targetUser) {
      res.status(404).json({ error: 'Voter account not found' });
      return;
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE users 
      SET is_verified = 0, rejection_reason = NULL, verified_by = NULL, verified_at = NULL, updated_at = ?
      WHERE id = ?
    `).run(now, id);

    logAudit({
      userId: officer.id,
      action: 'VOTER_IDENTITY_RESET_PENDING',
      resourceType: 'users',
      resourceId: id,
      details: {
        student_id: targetUser.student_id,
        full_name: targetUser.full_name,
        officer_name: officer.full_name,
      },
      ipAddress: (req.ip as string) || null,
    });

    const updatedUser = db.prepare(`
      SELECT u.id, u.student_id, u.email, u.full_name, u.department, u.batch_year, u.role, u.is_active, u.is_verified, u.rejection_reason, u.verified_by, u.verified_at, u.created_at
      FROM users u
      WHERE u.id = ?
    `).get(id);

    res.json({
      message: `Voter ${targetUser.full_name} status reset to pending review.`,
      voter: updatedUser,
    });
  } catch (err: any) {
    console.error('Reset voter error:', err);
    res.status(500).json({ error: 'Failed to reset voter status' });
  }
});

// 6. Batch Approve Multiple Pending Voters
officerRouter.post('/batch-verify', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { voterIds } = req.body;
    const officer = req.user!;

    if (!Array.isArray(voterIds) || voterIds.length === 0) {
      res.status(400).json({ error: 'Please provide an array of voter IDs to verify' });
      return;
    }

    const now = new Date().toISOString();
    const updateStmt = db.prepare(`
      UPDATE users 
      SET is_verified = 1, rejection_reason = NULL, verified_by = ?, verified_at = ?, updated_at = ?
      WHERE id = ? AND role = 'VOTER'
    `);

    const batchTx = db.transaction((ids: string[]) => {
      let count = 0;
      for (const id of ids) {
        const info = updateStmt.run(officer.id, now, now, id);
        count += info.changes;
      }
      return count;
    });

    const updatedCount = batchTx(voterIds);

    logAudit({
      userId: officer.id,
      action: 'VOTER_BATCH_VERIFIED',
      resourceType: 'users',
      resourceId: null,
      details: {
        count: updatedCount,
        officer_name: officer.full_name,
        voter_ids: voterIds,
      },
      ipAddress: (req.ip as string) || null,
    });

    res.json({
      message: `Successfully verified and certified ${updatedCount} voter accounts!`,
      updatedCount,
    });
  } catch (err: any) {
    console.error('Batch verify error:', err);
    res.status(500).json({ error: 'Failed to batch verify voters' });
  }
});

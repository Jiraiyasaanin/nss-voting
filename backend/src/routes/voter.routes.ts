import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';

const uuidv4 = () => crypto.randomUUID();
import { db } from '../db/index.js';
import { authenticateToken, AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import { logAudit } from '../services/audit.js';
import { Election } from '../types/index.js';

export const voterRouter = Router();

const voterCreateSchema = z.object({
  student_id: z.string().min(3).max(30).trim(),
  email: z.string().email().toLowerCase().trim(),
  full_name: z.string().min(2).max(100).trim(),
  department: z.string().min(2).max(100).trim(),
  batch_year: z.number().int().min(2000).max(2100),
  password: z.string().min(6).optional(),
});

// 1. List Voters (Admin only)
voterRouter.get('/', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { search, department, electionId, page = '1', limit = '50' } = req.query as Record<string, string>;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  let query = `
    SELECT u.id, u.student_id, u.email, u.full_name, u.department, u.batch_year, u.role, u.is_active, u.is_verified, u.created_at,
      (SELECT COUNT(*) FROM webauthn_credentials w WHERE w.user_id = u.id) as biometric_count
  `;

  if (electionId) {
    query += `, (SELECT 1 FROM voter_participation vp WHERE vp.voter_id = u.id AND vp.election_id = '${electionId}') as has_participated`;
  }

  query += ` FROM users u WHERE u.role = 'VOTER'`;
  const params: any[] = [];

  if (search) {
    query += ` AND (u.full_name LIKE ? OR u.student_id LIKE ? OR u.email LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (department) {
    query += ` AND u.department = ?`;
    params.push(department);
  }

  query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit, 10), offset);

  const voters = db.prepare(query).all(...params) as any[];

  // Total count for pagination
  let countQuery = `SELECT COUNT(*) as total FROM users WHERE role = 'VOTER'`;
  const countParams: any[] = [];
  if (search) {
    countQuery += ` AND (full_name LIKE ? OR student_id LIKE ? OR email LIKE ?)`;
    countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (department) {
    countQuery += ` AND department = ?`;
    countParams.push(department);
  }
  const totalRow = db.prepare(countQuery).get(...countParams) as { total: number };

  res.json({
    voters: voters.map(v => ({
      ...v,
      hasBiometrics: v.biometric_count > 0,
      hasParticipated: v.has_participated === 1,
    })),
    total: totalRow.total,
    page: parseInt(page, 10),
    totalPages: Math.ceil(totalRow.total / parseInt(limit, 10)),
  });
});

// 2. Add Voter Individually (Admin only)
voterRouter.post('/', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parse = voterCreateSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: 'Validation failed', details: parse.error.format() });
      return;
    }

    const { student_id, email, full_name, department, batch_year, password } = parse.data;

    // Duplicate check
    const existing = db.prepare(`
      SELECT student_id, email FROM users WHERE UPPER(student_id) = UPPER(?) OR email = ?
    `).get(student_id, email) as { student_id: string; email: string } | undefined;

    if (existing) {
      if (existing.student_id.toUpperCase() === student_id.toUpperCase()) {
        res.status(409).json({ error: `Voter with Student ID '${student_id}' already exists in registry.` });
        return;
      }
      res.status(409).json({ error: `Voter with email '${email}' already exists in registry.` });
      return;
    }

    const initialPassword = password || 'Voter@123';
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(initialPassword, salt);
    const id = uuidv4();

    db.prepare(`
      INSERT INTO users (id, student_id, email, full_name, department, batch_year, role, password_hash, is_active, is_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'VOTER', ?, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(id, student_id.toUpperCase(), email, full_name, department, batch_year, password_hash);

    logAudit({
      userId: req.user!.id,
      action: 'VOTER_ENROLLED_BY_ADMIN',
      resourceType: 'users',
      resourceId: id,
      details: { student_id: student_id.toUpperCase(), email, department },
      ipAddress: req.ip,
    });

    res.status(201).json({ message: 'Voter added to registry successfully', id, defaultPassword: password ? undefined : 'Voter@123' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create voter' });
  }
});

// 3. Batch Import Voters from CSV / Array
voterRouter.post('/batch-import', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { voters } = req.body as { voters: Array<{ student_id: string; email: string; full_name: string; department: string; batch_year: number }> };

    if (!Array.isArray(voters) || voters.length === 0) {
      res.status(400).json({ error: 'Payload must include non-empty voters array.' });
      return;
    }

    let createdCount = 0;
    let skippedCount = 0;
    const errors: Array<{ row: number; student_id: string; reason: string }> = [];

    const defaultSalt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('Voter@123', defaultSalt);

    const insertStmt = db.prepare(`
      INSERT INTO users (id, student_id, email, full_name, department, batch_year, role, password_hash, is_active, is_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'VOTER', ?, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    const checkStmt = db.prepare(`
      SELECT student_id, email FROM users WHERE UPPER(student_id) = UPPER(?) OR email = ?
    `);

    const importTransaction = db.transaction((rows: typeof voters) => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.student_id || !row.email || !row.full_name || !row.department) {
          skippedCount++;
          errors.push({ row: i + 1, student_id: row.student_id || 'UNKNOWN', reason: 'Missing required field' });
          continue;
        }

        const existing = checkStmt.get(row.student_id, row.email.toLowerCase().trim());
        if (existing) {
          skippedCount++;
          errors.push({ row: i + 1, student_id: row.student_id, reason: 'Duplicate Student ID or Email' });
          continue;
        }

        const id = uuidv4();
        insertStmt.run(
          id,
          row.student_id.toUpperCase().trim(),
          row.email.toLowerCase().trim(),
          row.full_name.trim(),
          row.department.trim(),
          Number(row.batch_year) || 2026,
          defaultPasswordHash
        );
        createdCount++;
      }
    });

    importTransaction(voters);

    logAudit({
      userId: req.user!.id,
      action: 'VOTERS_BATCH_IMPORTED',
      resourceType: 'users',
      details: { createdCount, skippedCount, totalProcessed: voters.length },
      ipAddress: req.ip,
    });

    res.json({
      message: `Batch import completed: ${createdCount} voters registered, ${skippedCount} skipped.`,
      createdCount,
      skippedCount,
      errors: errors.slice(0, 20), // return first 20 errors if any
    });
  } catch (err: any) {
    console.error('Batch import error:', err);
    res.status(500).json({ error: 'Failed to process batch import' });
  }
});

// 4. Toggle Voter Active / Inactive Status
voterRouter.patch('/:id/status', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  const { is_active } = req.body;

  if (typeof is_active !== 'number' && typeof is_active !== 'boolean') {
    res.status(400).json({ error: 'is_active flag required (0 or 1)' });
    return;
  }

  const activeVal = is_active ? 1 : 0;
  db.prepare(`UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = 'VOTER'`).run(activeVal, id);

  logAudit({
    userId: req.user!.id,
    action: activeVal ? 'VOTER_ACTIVATED' : 'VOTER_DEACTIVATED',
    resourceType: 'users',
    resourceId: id,
    ipAddress: req.ip,
  });

  res.json({ message: `Voter account ${activeVal ? 'activated' : 'deactivated'} successfully.` });
});

// 5. Election Monitoring (Real-time Turnout without Exposing Candidate Selections!)
voterRouter.get('/monitoring/:electionId', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const electionId = req.params.electionId as string;

  const election = db.prepare(`SELECT * FROM elections WHERE id = ?`).get(electionId) as Election | undefined;
  if (!election) {
    res.status(404).json({ error: 'Election not found' });
    return;
  }

  // Calculate total eligible voters
  let totalEligible = 0;
  if (election.eligibility_type === 'ALL') {
    const row = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'VOTER' AND is_active = 1`).get() as { count: number };
    totalEligible = row.count;
  } else if (election.eligibility_type === 'DEPARTMENTS') {
    try {
      const depts: string[] = JSON.parse(election.eligibility_criteria || '[]');
      if (depts.length > 0) {
        const placeholders = depts.map(() => '?').join(',');
        const row = db.prepare(`
          SELECT COUNT(*) as count FROM users WHERE role = 'VOTER' AND is_active = 1 AND department IN (${placeholders})
        `).get(...depts) as { count: number };
        totalEligible = row.count;
      }
    } catch {
      totalEligible = 0;
    }
  } else if (election.eligibility_type === 'SPECIFIC_STUDENTS') {
    const row = db.prepare(`
      SELECT COUNT(*) as count FROM election_voter_eligibility eve
      JOIN users u ON eve.voter_id = u.id
      WHERE eve.election_id = ? AND u.is_active = 1
    `).get(electionId) as { count: number };
    totalEligible = row.count;
  }

  // Calculate votes cast
  const votesCastRow = db.prepare(`
    SELECT COUNT(*) as votesCast FROM voter_participation WHERE election_id = ?
  `).get(electionId) as { votesCast: number };

  const votesCast = votesCastRow.votesCast;
  const remaining = Math.max(0, totalEligible - votesCast);
  const turnoutPercentage = totalEligible > 0 ? Number(((votesCast / totalEligible) * 100).toFixed(2)) : 0;

  // Recent Participation Stream (Voter Identity + Timestamp + Receipt Code, NO candidate selection!)
  const recentParticipation = db.prepare(`
    SELECT vp.receipt_code, vp.voted_at, u.full_name, u.student_id, u.department
    FROM voter_participation vp
    JOIN users u ON vp.voter_id = u.id
    WHERE vp.election_id = ?
    ORDER BY vp.voted_at DESC
    LIMIT 50
  `).all(electionId);

  res.json({
    election: {
      id: election.id,
      title: election.title,
      status: election.status,
      start_time: election.start_time,
      end_time: election.end_time,
      results_published: election.results_published === 1,
    },
    turnout: {
      totalEligible,
      votesCast,
      remaining,
      turnoutPercentage,
    },
    recentParticipation,
  });
});

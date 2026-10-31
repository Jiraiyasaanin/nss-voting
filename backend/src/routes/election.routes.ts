import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { z } from 'zod';

const uuidv4 = () => crypto.randomUUID();
import { config } from '../config.js';
import { db } from '../db/index.js';
import { authenticateToken, AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import { logAudit } from '../services/audit.js';
import { Election, Candidate, ElectionStatus } from '../types/index.js';

export const electionRouter = Router();

// Ensure upload directory exists
if (!fs.existsSync(config.UPLOAD_DIR)) {
  fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `candidate_${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|svg/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, webp, svg) are permitted.'));
    }
  },
});

const electionSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  description: z.string().min(5).trim(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED', 'COMPLETED']).default('DRAFT'),
  eligibility_type: z.enum(['ALL', 'DEPARTMENTS', 'SPECIFIC_STUDENTS']).default('ALL'),
  eligibility_criteria: z.array(z.string()).optional(),
  max_selections: z.number().int().min(1).default(1),
});

// Helper: Check voter eligibility
export function checkVoterEligibility(voter: { id: string; department: string }, election: Election): boolean {
  if (election.eligibility_type === 'ALL') {
    return true;
  }

  if (election.eligibility_type === 'DEPARTMENTS') {
    if (!election.eligibility_criteria) return true;
    try {
      const allowedDepts: string[] = JSON.parse(election.eligibility_criteria);
      return allowedDepts.includes(voter.department);
    } catch {
      return true;
    }
  }

  if (election.eligibility_type === 'SPECIFIC_STUDENTS') {
    const match = db.prepare(`
      SELECT 1 FROM election_voter_eligibility 
      WHERE election_id = ? AND voter_id = ?
    `).get(election.id, voter.id);
    return !!match;
  }

  return false;
}

// 1. List Elections
electionRouter.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const isAdmin = user.role === 'ADMIN';

  let elections: (Election & { candidateCount?: number; totalVotes?: number; hasVoted?: boolean; isEligible?: boolean })[];

  if (isAdmin) {
    elections = db.prepare(`
      SELECT e.*, 
        (SELECT COUNT(*) FROM candidates c WHERE c.election_id = e.id) as candidateCount,
        (SELECT COUNT(*) FROM voter_participation vp WHERE vp.election_id = e.id) as totalVotes
      FROM elections e
      ORDER BY e.created_at DESC
    `).all() as any;
  } else {
    // For voter: fetch all non-draft elections, filter eligibility, and attach hasVoted
    const allActiveOrUpcoming = db.prepare(`
      SELECT e.*,
        (SELECT COUNT(*) FROM candidates c WHERE c.election_id = e.id) as candidateCount
      FROM elections e
      WHERE e.status != 'DRAFT'
      ORDER BY e.created_at DESC
    `).all() as Election[];

    elections = allActiveOrUpcoming.map(election => {
      const isEligible = checkVoterEligibility(user, election);
      const votedRow = db.prepare(`
        SELECT id, receipt_code, voted_at FROM voter_participation 
        WHERE election_id = ? AND voter_id = ?
      `).get(election.id, user.id) as { id: string; receipt_code: string; voted_at: string } | undefined;

      return {
        ...election,
        isEligible,
        hasVoted: !!votedRow,
        receiptCode: votedRow?.receipt_code || null,
        votedAt: votedRow?.voted_at || null,
      };
    });
  }

  res.json({ elections });
});

// 2. Get Election Details & Candidates
electionRouter.get('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const isAdmin = user.role === 'ADMIN';

  const election = db.prepare(`SELECT * FROM elections WHERE id = ?`).get(id) as Election | undefined;
  if (!election) {
    res.status(404).json({ error: 'Election not found' });
    return;
  }

  const candidates = db.prepare(`
    SELECT * FROM candidates WHERE election_id = ? ORDER BY ballot_number ASC
  `).all(id) as Candidate[];

  let voterStatus = null;
  if (!isAdmin) {
    const isEligible = checkVoterEligibility(user, election);
    const participation = db.prepare(`
      SELECT receipt_code, voted_at FROM voter_participation 
      WHERE election_id = ? AND voter_id = ?
    `).get(id, user.id) as { receipt_code: string; voted_at: string } | undefined;

    voterStatus = {
      isEligible,
      hasVoted: !!participation,
      receiptCode: participation?.receipt_code || null,
      votedAt: participation?.voted_at || null,
    };
  }

  // Voter turnout stats for this election
  const turnoutStats = db.prepare(`
    SELECT COUNT(*) as votesCast FROM voter_participation WHERE election_id = ?
  `).get(id) as { votesCast: number };

  res.json({
    election,
    candidates,
    voterStatus,
    votesCast: turnoutStats.votesCast,
  });
});

// 3. Create Election (Admin only)
electionRouter.post('/', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const parse = electionSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: 'Validation failed', details: parse.error.format() });
      return;
    }

    const { title, description, start_time, end_time, status, eligibility_type, eligibility_criteria, max_selections } = parse.data;

    const id = uuidv4();
    const criteriaJson = eligibility_criteria ? JSON.stringify(eligibility_criteria) : null;

    db.prepare(`
      INSERT INTO elections (id, title, description, start_time, end_time, status, eligibility_type, eligibility_criteria, max_selections, results_published, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(id, title, description, start_time, end_time, status, eligibility_type, criteriaJson, max_selections, req.user!.id);

    logAudit({
      userId: req.user!.id,
      action: 'ELECTION_CREATED',
      resourceType: 'elections',
      resourceId: id,
      details: { title, status, eligibility_type },
      ipAddress: req.ip,
    });

    res.status(201).json({ message: 'Election created successfully', id });
  } catch (err: any) {
    console.error('Create election error:', err);
    res.status(500).json({ error: 'Failed to create election' });
  }
});

// 4. Update Election (Admin only)
electionRouter.put('/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = db.prepare(`SELECT * FROM elections WHERE id = ?`).get(id) as Election | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Election not found' });
      return;
    }

    // Do not allow major re-configuration if votes have already been cast
    const votesCount = db.prepare(`SELECT COUNT(*) as count FROM voter_participation WHERE election_id = ?`).get(id) as { count: number };
    if (votesCount.count > 0 && req.body.max_selections && req.body.max_selections !== existing.max_selections) {
      res.status(400).json({ error: 'Cannot change ballot rules after voting has commenced.' });
      return;
    }

    const parse = electionSchema.partial().safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: 'Validation failed', details: parse.error.format() });
      return;
    }

    const updates = parse.data;
    const title = updates.title ?? existing.title;
    const description = updates.description ?? existing.description;
    const start_time = updates.start_time ?? existing.start_time;
    const end_time = updates.end_time ?? existing.end_time;
    const status = updates.status ?? existing.status;
    const eligibility_type = updates.eligibility_type ?? existing.eligibility_type;
    const criteriaJson = updates.eligibility_criteria ? JSON.stringify(updates.eligibility_criteria) : existing.eligibility_criteria;
    const max_selections = updates.max_selections ?? existing.max_selections;

    db.prepare(`
      UPDATE elections 
      SET title = ?, description = ?, start_time = ?, end_time = ?, status = ?, eligibility_type = ?, eligibility_criteria = ?, max_selections = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, description, start_time, end_time, status, eligibility_type, criteriaJson, max_selections, id);

    logAudit({
      userId: req.user!.id,
      action: 'ELECTION_UPDATED',
      resourceType: 'elections',
      resourceId: id,
      details: updates,
      ipAddress: req.ip,
    });

    res.json({ message: 'Election updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update election' });
  }
});

// 5. Update Status (Open, Pause, Resume, Close)
electionRouter.patch('/:id/status', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  const { status } = req.body as { status: ElectionStatus };

  if (!['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED', 'COMPLETED'].includes(status)) {
    res.status(400).json({ error: 'Invalid election status provided' });
    return;
  }

  const existing = db.prepare(`SELECT * FROM elections WHERE id = ?`).get(id) as Election | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Election not found' });
    return;
  }

  db.prepare(`UPDATE elections SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(status, id);

  logAudit({
    userId: req.user!.id,
    action: `ELECTION_STATUS_CHANGE_${status}`,
    resourceType: 'elections',
    resourceId: id,
    details: { previousStatus: existing.status, newStatus: status },
    ipAddress: req.ip,
  });

  res.json({ message: `Election status changed to ${status}` });
});

// 6. Publish / Withhold Results (Admin only)
electionRouter.patch('/:id/publish-results', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  const { publish } = req.body as { publish: boolean };

  const election = db.prepare(`SELECT * FROM elections WHERE id = ?`).get(id) as Election | undefined;
  if (!election) {
    res.status(404).json({ error: 'Election not found' });
    return;
  }

  if (publish && election.status !== 'CLOSED' && election.status !== 'COMPLETED') {
    res.status(400).json({ error: 'Results cannot be published while election is still active or in draft state.' });
    return;
  }

  db.prepare(`
    UPDATE elections 
    SET results_published = ?, status = CASE WHEN ? = 1 THEN 'COMPLETED' ELSE status END, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(publish ? 1 : 0, publish ? 1 : 0, id);

  logAudit({
    userId: req.user!.id,
    action: publish ? 'ELECTION_RESULTS_PUBLISHED' : 'ELECTION_RESULTS_WITHHELD',
    resourceType: 'elections',
    resourceId: id,
    details: { publish },
    ipAddress: req.ip,
  });

  res.json({ message: publish ? 'Results officially published' : 'Results withheld' });
});

// 7. Add Candidate to Election
electionRouter.post('/:id/candidates', authenticateToken, requireAdmin, upload.single('photo'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: electionId } = req.params;
    const { name, department, manifesto, qualifications, symbol_url } = req.body;

    if (!name || !department || !manifesto) {
      res.status(400).json({ error: 'Name, department, and manifesto are required.' });
      return;
    }

    const election = db.prepare(`SELECT * FROM elections WHERE id = ?`).get(electionId);
    if (!election) {
      res.status(404).json({ error: 'Election not found' });
      return;
    }

    // Auto-assign next ballot number
    const maxNumRow = db.prepare(`
      SELECT MAX(ballot_number) as maxNum FROM candidates WHERE election_id = ?
    `).get(electionId) as { maxNum: number | null };
    const nextBallotNumber = (maxNumRow.maxNum || 0) + 1;

    const candidateId = uuidv4();
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

    db.prepare(`
      INSERT INTO candidates (id, election_id, name, ballot_number, photo_url, symbol_url, department, manifesto, qualifications, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
    `).run(candidateId, electionId, name, nextBallotNumber, photoUrl, symbol_url || null, department, manifesto, qualifications || null);

    logAudit({
      userId: req.user!.id,
      action: 'CANDIDATE_ADDED',
      resourceType: 'candidates',
      resourceId: candidateId,
      details: { electionId, name, ballot_number: nextBallotNumber },
      ipAddress: req.ip,
    });

    res.status(201).json({ message: 'Candidate added successfully', candidateId });
  } catch (err: any) {
    console.error('Add candidate error:', err);
    res.status(500).json({ error: 'Failed to add candidate' });
  }
});

// 8. Delete Candidate
electionRouter.delete('/:id/candidates/:candidateId', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const electionId = req.params.id as string;
  const candidateId = req.params.candidateId as string;

  // Check if votes cast
  const votesCount = db.prepare(`SELECT COUNT(*) as count FROM voter_participation WHERE election_id = ?`).get(electionId) as { count: number };
  if (votesCount.count > 0) {
    res.status(400).json({ error: 'Cannot remove candidates after voting has already commenced.' });
    return;
  }

  db.prepare(`DELETE FROM candidates WHERE id = ? AND election_id = ?`).run(candidateId, electionId);

  logAudit({
    userId: req.user!.id,
    action: 'CANDIDATE_DELETED',
    resourceType: 'candidates',
    resourceId: candidateId,
    details: { electionId },
    ipAddress: req.ip,
  });

  res.json({ message: 'Candidate removed successfully' });
});

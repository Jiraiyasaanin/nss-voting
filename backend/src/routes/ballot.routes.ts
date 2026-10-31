import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/index.js';

const uuidv4 = () => crypto.randomUUID();
import { authenticateToken, AuthenticatedRequest, requireVoter } from '../middleware/auth.js';
import { logAudit } from '../services/audit.js';
import { createAuthenticationOptions, verifyUserAuthentication } from '../services/webauthn.js';
import { checkVoterEligibility } from './election.routes.js';
import { Election, Candidate } from '../types/index.js';

export const ballotRouter = Router();

// 1. Request WebAuthn Challenge to Unlock Ballot
ballotRouter.post('/unlock-challenge', authenticateToken, requireVoter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const voter = req.user!;
    const { electionId } = req.body;

    if (!electionId) {
      res.status(400).json({ error: 'Election ID is required' });
      return;
    }

    const election = db.prepare(`SELECT * FROM elections WHERE id = ?`).get(electionId) as Election | undefined;
    if (!election) {
      res.status(404).json({ error: 'Election not found' });
      return;
    }

    // A. Check Election Lifecycle
    if (election.status !== 'ACTIVE') {
      res.status(403).json({ error: `Ballot access denied: Election is currently ${election.status.toLowerCase()}` });
      return;
    }

    const now = new Date();
    if (new Date(election.start_time) > now) {
      res.status(403).json({ error: 'Ballot access denied: Voting has not yet commenced.' });
      return;
    }
    if (new Date(election.end_time) < now) {
      res.status(403).json({ error: 'Ballot access denied: Voting period has concluded.' });
      return;
    }

    // B. Check Voter Eligibility
    if (!checkVoterEligibility(voter, election)) {
      res.status(403).json({ error: 'Ballot access denied: You are not eligible for this election.' });
      return;
    }

    // C. Check If Already Voted
    const existingParticipation = db.prepare(`
      SELECT receipt_code FROM voter_participation 
      WHERE election_id = ? AND voter_id = ?
    `).get(electionId, voter.id);

    if (existingParticipation) {
      res.status(409).json({ error: 'One-person-one-vote rule: You have already cast your ballot in this election.' });
      return;
    }

    // D. Generate WebAuthn Challenge for Biometric Prompt
    // Note: If running in simulated test mode without physical biometrics enrolled, provide a test flow indicator
    const credCount = db.prepare(`SELECT COUNT(*) as count FROM webauthn_credentials WHERE user_id = ?`).get(voter.id) as { count: number };
    
    if (credCount.count === 0) {
      res.status(400).json({ 
        error: 'No biometric authenticator enrolled. Please enroll your fingerprint / passkey before accessing the ballot.',
        needsEnrollment: true,
      });
      return;
    }

    const options = await createAuthenticationOptions(voter.id, 'BALLOT_UNLOCK', electionId);
    res.json({ options });
  } catch (err: any) {
    console.error('Unlock challenge error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate ballot unlock challenge' });
  }
});

// 2. Verify Biometric Response & Issue Single-Use Ballot Token
ballotRouter.post('/verify-unlock', authenticateToken, requireVoter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const voter = req.user!;
    const { electionId, response, simulated } = req.body;

    if (!electionId) {
      res.status(400).json({ error: 'Election ID is required' });
      return;
    }

    // Double check that voter hasn't already voted
    const existingParticipation = db.prepare(`
      SELECT 1 FROM voter_participation WHERE election_id = ? AND voter_id = ?
    `).get(electionId, voter.id);

    if (existingParticipation) {
      res.status(409).json({ error: 'Ballot access denied: You have already voted.' });
      return;
    }

    // In simulated dev test environment, allow simulated biometric confirmation if explicitly requested
    if (simulated === true && process.env.NODE_ENV !== 'production') {
      // Dev simulation authorized
    } else {
      if (!response) {
        res.status(400).json({ error: 'Biometric response assertion required' });
        return;
      }
      // Cryptographically verify WebAuthn assertion signature
      await verifyUserAuthentication(voter.id, response, 'BALLOT_UNLOCK', electionId);
    }

    // Issue single-use Ballot Token with 5-minute expiry
    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO ballot_access_tokens (token_id, user_id, election_id, is_consumed, expires_at, created_at)
      VALUES (?, ?, ?, 0, ?, CURRENT_TIMESTAMP)
    `).run(tokenId, voter.id, electionId, expiresAt);

    logAudit({
      userId: voter.id,
      action: 'BALLOT_UNLOCKED_BIOMETRIC',
      resourceType: 'ballot_access_tokens',
      resourceId: tokenId,
      details: { electionId },
      ipAddress: req.ip,
    });

    res.json({
      unlocked: true,
      ballotToken: tokenId,
      expiresAt,
    });
  } catch (err: any) {
    console.error('Verify unlock error:', err);
    res.status(400).json({ error: err.message || 'Biometric authentication verification failed.' });
  }
});

// 3. Submit Ballot (Atomic Transaction: Strict 1-Person-1-Vote & Cryptographic Secrecy Split)
ballotRouter.post('/submit', authenticateToken, requireVoter, (req: AuthenticatedRequest, res: Response) => {
  const voter = req.user!;
  const { electionId, ballotToken, candidateId } = req.body;

  if (!electionId || !ballotToken || !candidateId) {
    res.status(400).json({ error: 'Missing required parameters: electionId, ballotToken, and candidateId.' });
    return;
  }

  // Execute database transaction in immediate exclusive mode
  const executeVote = db.transaction(() => {
    // A. Verify and consume the single-use Ballot Token
    const tokenRow = db.prepare(`
      SELECT * FROM ballot_access_tokens 
      WHERE token_id = ? AND user_id = ? AND election_id = ?
    `).get(ballotToken, voter.id, electionId) as { token_id: string; is_consumed: number; expires_at: string } | undefined;

    if (!tokenRow) {
      throw new Error('INVALID_TOKEN: Ballot access token not recognized.');
    }

    if (tokenRow.is_consumed) {
      throw new Error('CONSUMED_TOKEN: This ballot access token has already been used.');
    }

    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      throw new Error('EXPIRED_TOKEN: Ballot session timed out. Please authenticate biometrically again.');
    }

    // B. Verify Election is active
    const election = db.prepare(`SELECT * FROM elections WHERE id = ?`).get(electionId) as Election | undefined;
    if (!election || election.status !== 'ACTIVE') {
      throw new Error('ELECTION_INACTIVE: This election is not currently accepting votes.');
    }

    // C. Strict 1-person-1-vote duplicate check
    const existing = db.prepare(`
      SELECT id FROM voter_participation WHERE election_id = ? AND voter_id = ?
    `).get(electionId, voter.id);

    if (existing) {
      throw new Error('DUPLICATE_VOTE: Voter has already cast a ballot in this election.');
    }

    // D. Validate candidate exists and belongs to this election
    const candidate = db.prepare(`
      SELECT id, name FROM candidates WHERE id = ? AND election_id = ? AND is_active = 1
    `).get(candidateId, electionId) as Candidate | undefined;

    if (!candidate) {
      throw new Error('INVALID_CANDIDATE: Selected candidate is invalid for this election.');
    }

    // E. Mark token as consumed
    db.prepare(`UPDATE ballot_access_tokens SET is_consumed = 1 WHERE token_id = ?`).run(ballotToken);

    // F. Generate Cryptographic Receipt Code for the Voter
    // The receipt code proves to the voter that their ballot was recorded,
    // but the receipt DOES NOT reveal which candidate was selected!
    const receiptSalt = crypto.randomBytes(8).toString('hex').toUpperCase();
    const participationId = uuidv4();
    const receiptCode = `NSS-REC-${electionId.slice(0, 4).toUpperCase()}-${receiptSalt}`;

    // G. RECORD VOTER PARTICIPATION (Table 1: WHO voted)
    const ipHash = req.ip ? crypto.createHash('sha256').update(req.ip).digest('hex').slice(0, 16) : null;
    db.prepare(`
      INSERT INTO voter_participation (id, election_id, voter_id, receipt_code, voted_at, ip_hash, user_agent)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
    `).run(participationId, electionId, voter.id, receiptCode, ipHash, req.headers['user-agent'] || null);

    // H. INSERT ANONYMOUS BALLOT (Table 2: WHAT was voted)
    // CRITICAL SECRECY GUARANTEE:
    // Ballots table contains: id, election_id, candidate_id, ballot_hash, cast_at.
    // It contains ZERO references to voter_id, participation_id, or token_id!
    const ballotId = uuidv4();
    const ballotHashSalt = crypto.randomBytes(16).toString('hex');
    const ballotHash = crypto.createHash('sha256').update(`${electionId}:${candidateId}:${ballotHashSalt}`).digest('hex');

    db.prepare(`
      INSERT INTO ballots (id, election_id, candidate_id, ballot_hash, cast_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(ballotId, electionId, candidateId, ballotHash);

    return { receiptCode, votedAt: new Date().toISOString() };
  });

  try {
    const result = executeVote();

    logAudit({
      userId: voter.id,
      action: 'VOTE_SUBMITTED_SUCCESS',
      resourceType: 'voter_participation',
      resourceId: electionId,
      details: { receiptCode: result.receiptCode },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Your vote has been cast securely and registered anonymously.',
      receiptCode: result.receiptCode,
      votedAt: result.votedAt,
    });
  } catch (err: any) {
    const msg = err.message || '';
    if (msg.startsWith('DUPLICATE_VOTE') || msg.startsWith('CONSUMED_TOKEN')) {
      res.status(409).json({ error: 'One-person-one-vote violation: A vote has already been submitted.' });
    } else if (msg.startsWith('EXPIRED_TOKEN') || msg.startsWith('INVALID_TOKEN')) {
      res.status(401).json({ error: msg.replace(/^[A-Z_]+:\s*/, '') });
    } else {
      res.status(400).json({ error: msg.replace(/^[A-Z_]+:\s*/, '') || 'Vote submission failed' });
    }
  }
});

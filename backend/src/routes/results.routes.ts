import { Router, Response } from 'express';
import { db } from '../db/index.js';
import { authenticateToken, AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import { Election, Candidate, CandidateResult, ElectionResultsSummary } from '../types/index.js';

export const resultsRouter = Router();

// Helper: Calculate results from ballots table
export function calculateElectionResults(electionId: string): ElectionResultsSummary | null {
  const election = db.prepare(`SELECT * FROM elections WHERE id = ?`).get(electionId) as Election | undefined;
  if (!election) return null;

  // 1. Get all candidates in this election
  const candidates = db.prepare(`
    SELECT * FROM candidates WHERE election_id = ? ORDER BY ballot_number ASC
  `).all(electionId) as Candidate[];

  // 2. Count total ballots
  const totalBallotsRow = db.prepare(`
    SELECT COUNT(*) as total FROM ballots WHERE election_id = ?
  `).get(electionId) as { total: number };
  const totalVotesCast = totalBallotsRow.total;

  // 3. Count votes per candidate
  const voteCounts = db.prepare(`
    SELECT candidate_id, COUNT(*) as count 
    FROM ballots 
    WHERE election_id = ? 
    GROUP BY candidate_id
  `).all(electionId) as { candidate_id: string; count: number }[];

  const countMap = new Map<string, number>();
  voteCounts.forEach(vc => countMap.set(vc.candidate_id, vc.count));

  // Determine highest vote count
  let maxVotes = 0;
  candidates.forEach(c => {
    const votes = countMap.get(c.id) || 0;
    if (votes > maxVotes) maxVotes = votes;
  });

  // Calculate candidate results
  const candidateResults: CandidateResult[] = candidates.map(c => {
    const voteCount = countMap.get(c.id) || 0;
    const votePercentage = totalVotesCast > 0 ? Number(((voteCount / totalVotesCast) * 100).toFixed(2)) : 0;
    return {
      candidateId: c.id,
      name: c.name,
      ballotNumber: c.ballot_number,
      photoUrl: c.photo_url,
      department: c.department,
      voteCount,
      votePercentage,
      isWinner: totalVotesCast > 0 && voteCount === maxVotes && maxVotes > 0,
    };
  });

  // Calculate total eligible
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
  } else {
    const row = db.prepare(`
      SELECT COUNT(*) as count FROM election_voter_eligibility WHERE election_id = ?
    `).get(electionId) as { count: number };
    totalEligible = row.count;
  }

  const turnoutPercentage = totalEligible > 0 ? Number(((totalVotesCast / totalEligible) * 100).toFixed(2)) : 0;

  return {
    electionId: election.id,
    title: election.title,
    status: election.status,
    resultsPublished: election.results_published === 1,
    totalVotesCast,
    totalEligibleVoters: totalEligible,
    turnoutPercentage,
    candidateResults,
  };
}

// 1. Get Results for an Election
resultsRouter.get('/:electionId', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const electionId = req.params.electionId as string;
  const user = req.user!;
  const isAdmin = user.role === 'ADMIN' || user.role === 'ELECTION_OFFICER';

  const election = db.prepare(`SELECT * FROM elections WHERE id = ?`).get(electionId) as Election | undefined;
  if (!election) {
    res.status(404).json({ error: 'Election not found' });
    return;
  }

  // Strict election integrity enforcement:
  // Interim results must NEVER be leaked while voting is active!
  if (election.status === 'ACTIVE' || election.status === 'DRAFT') {
    res.status(403).json({
      error: 'Interim candidate counts are sealed while the election is active to preserve democratic neutrality.',
      status: election.status,
    });
    return;
  }

  // If election is closed, only admins can view unless results are officially published
  if (election.results_published !== 1 && !isAdmin) {
    res.status(403).json({
      error: 'Election results have not yet been published by the Election Commission.',
      status: election.status,
      resultsPublished: false,
    });
    return;
  }

  const results = calculateElectionResults(electionId);
  if (!results) {
    res.status(404).json({ error: 'Failed to compute election results' });
    return;
  }

  res.json({ results });
});

// 2. Export Certified Results CSV
resultsRouter.get('/:electionId/export-csv', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const electionId = req.params.electionId as string;
  const user = req.user!;
  const isAdmin = user.role === 'ADMIN' || user.role === 'ELECTION_OFFICER';

  const election = db.prepare(`SELECT * FROM elections WHERE id = ?`).get(electionId) as Election | undefined;
  if (!election) {
    res.status(404).json({ error: 'Election not found' });
    return;
  }

  if (election.results_published !== 1 && !isAdmin) {
    res.status(403).json({ error: 'Results not yet published.' });
    return;
  }

  const results = calculateElectionResults(electionId);
  if (!results) {
    res.status(500).json({ error: 'Failed to compute results' });
    return;
  }

  let csv = `Election Title,${results.title}\n`;
  csv += `Status,${results.status}\n`;
  csv += `Total Eligible Voters,${results.totalEligibleVoters}\n`;
  csv += `Total Ballots Cast,${results.totalVotesCast}\n`;
  csv += `Voter Turnout %,${results.turnoutPercentage}%\n\n`;
  csv += `Ballot Number,Candidate Name,Department,Votes Received,Vote Share (%),Elected Winner\n`;

  results.candidateResults.forEach(c => {
    csv += `"${c.ballotNumber}","${c.name}","${c.department}",${c.voteCount},${c.votePercentage}%,${c.isWinner ? 'YES' : 'NO'}\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=results_${electionId.slice(0, 8)}.csv`);
  res.status(200).send(csv);
});

// 3. Admin Overview Dashboard Stats
resultsRouter.get('/admin/overview', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const votersCount = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'VOTER'`).get() as { count: number };
  const verifiedVotersCount = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'VOTER' AND is_verified = 1`).get() as { count: number };
  const activeElectionsCount = db.prepare(`SELECT COUNT(*) as count FROM elections WHERE status = 'ACTIVE'`).get() as { count: number };
  const completedElectionsCount = db.prepare(`SELECT COUNT(*) as count FROM elections WHERE status = 'COMPLETED' OR status = 'CLOSED'`).get() as { count: number };
  const totalCandidatesCount = db.prepare(`SELECT COUNT(*) as count FROM candidates`).get() as { count: number };
  const totalVotesCastCount = db.prepare(`SELECT COUNT(*) as count FROM ballots`).get() as { count: number };

  // Recent 10 audit logs
  const recentLogs = db.prepare(`
    SELECT a.*, u.full_name as user_name, u.role as user_role 
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT 10
  `).all();

  // Active elections with their live turnout counts
  const liveElections = db.prepare(`
    SELECT e.id, e.title, e.status, e.start_time, e.end_time,
      (SELECT COUNT(*) FROM voter_participation vp WHERE vp.election_id = e.id) as votesCast
    FROM elections e
    WHERE e.status = 'ACTIVE'
    ORDER BY e.created_at DESC
  `).all();

  res.json({
    metrics: {
      totalRegisteredVoters: votersCount.count,
      totalVerifiedVoters: verifiedVotersCount.count,
      activeElections: activeElectionsCount.count,
      completedElections: completedElectionsCount.count,
      totalCandidates: totalCandidatesCount.count,
      totalVotesCast: totalVotesCastCount.count,
    },
    liveElections,
    recentLogs,
  });
});

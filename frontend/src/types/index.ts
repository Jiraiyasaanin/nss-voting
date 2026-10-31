export type UserRole = 'VOTER' | 'ADMIN' | 'ELECTION_OFFICER';

export interface User {
  id: string;
  student_id: string;
  email: string;
  full_name: string;
  department: string;
  batch_year: number;
  role: UserRole;
  is_active: number;
  is_verified: number; // 0 = Pending Officer Approval, 1 = Approved & Certified, -1 = Rejected/Flagged
  rejection_reason?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfficerStats {
  pendingCount: number;
  verifiedCount: number;
  rejectedCount: number;
  totalCount: number;
  departmentStats: Array<{
    department: string;
    pending: number;
    verified: number;
    rejected: number;
    total: number;
  }>;
}

export interface VoterVerificationRecord {
  id: string;
  student_id: string;
  email: string;
  full_name: string;
  department: string;
  batch_year: number;
  role: string;
  is_active: number;
  is_verified: number;
  rejection_reason?: string | null;
  verified_by?: string | null;
  verified_by_name?: string | null;
  verified_at?: string | null;
  created_at: string;
  updated_at: string;
  biometric_count: number;
}

export interface WebAuthnCredentialSummary {
  id: string;
  device_name: string;
  created_at: string;
  last_used_at: string | null;
}

export type ElectionStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'COMPLETED';
export type EligibilityType = 'ALL' | 'DEPARTMENTS' | 'SPECIFIC_STUDENTS';

export interface Election {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  status: ElectionStatus;
  eligibility_type: EligibilityType;
  eligibility_criteria: string | null;
  max_selections: number;
  results_published: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  candidateCount?: number;
  totalVotes?: number;
  isEligible?: boolean;
  hasVoted?: boolean;
  receiptCode?: string | null;
  votedAt?: string | null;
}

export interface Candidate {
  id: string;
  election_id: string;
  name: string;
  ballot_number: number;
  photo_url: string | null;
  symbol_url: string | null;
  department: string;
  manifesto: string;
  qualifications: string | null;
  is_active: number;
  created_at: string;
}

export interface CandidateResult {
  candidateId: string;
  name: string;
  ballotNumber: number;
  photoUrl: string | null;
  department: string;
  voteCount: number;
  votePercentage: number;
  isWinner: boolean;
}

export interface ElectionResultsSummary {
  electionId: string;
  title: string;
  status: ElectionStatus;
  resultsPublished: boolean;
  totalVotesCast: number;
  totalEligibleVoters: number;
  turnoutPercentage: number;
  candidateResults: CandidateResult[];
}

export interface TurnoutMonitoringData {
  election: {
    id: string;
    title: string;
    status: ElectionStatus;
    start_time: string;
    end_time: string;
    results_published: boolean;
  };
  turnout: {
    totalEligible: number;
    votesCast: number;
    remaining: number;
    turnoutPercentage: number;
  };
  recentParticipation: Array<{
    receipt_code: string;
    voted_at: string;
    full_name: string;
    student_id: string;
    department: string;
  }>;
}

export interface AdminOverviewMetrics {
  metrics: {
    totalRegisteredVoters: number;
    totalVerifiedVoters: number;
    activeElections: number;
    completedElections: number;
    totalCandidates: number;
    totalVotesCast: number;
  };
  liveElections: Array<{
    id: string;
    title: string;
    status: ElectionStatus;
    start_time: string;
    end_time: string;
    votesCast: number;
  }>;
  recentLogs: Array<{
    id: string;
    user_id: string | null;
    user_name: string | null;
    user_role: string | null;
    action: string;
    resource_type: string;
    resource_id: string | null;
    details: string | null;
    ip_address: string | null;
    created_at: string;
  }>;
}


export type UserRole = 'VOTER' | 'ADMIN' | 'ELECTION_OFFICER';

export interface User {
  id: string;
  student_id: string;
  email: string;
  full_name: string;
  department: string;
  batch_year: number;
  role: UserRole;
  password_hash: string;
  is_active: number;
  is_verified: number;
  created_at: string;
  updated_at: string;
}

export type SafeUser = Omit<User, 'password_hash'>;

export interface WebAuthnCredential {
  id: string;
  user_id: string;
  public_key: Buffer;
  counter: number;
  transports: string | null;
  device_name: string;
  aaguid: string | null;
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
  eligibility_criteria: string | null; // JSON array of departments or years
  max_selections: number;
  results_published: number;
  created_by: string;
  created_at: string;
  updated_at: string;
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

export interface VoterParticipation {
  id: string;
  election_id: string;
  voter_id: string;
  receipt_code: string;
  voted_at: string;
  ip_hash: string | null;
  user_agent: string | null;
}

export interface Ballot {
  id: string;
  election_id: string;
  candidate_id: string;
  ballot_hash: string;
  cast_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: string | null;
  ip_address: string | null;
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


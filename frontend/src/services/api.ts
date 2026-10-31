import {
  User,
  Election,
  Candidate,
  ElectionResultsSummary,
  TurnoutMonitoringData,
  AdminOverviewMetrics,
  OfficerStats,
  VoterVerificationRecord,
} from '../types/index.js';

const RAW_API_URL = (import.meta.env.VITE_API_URL as string | undefined) || '';
const API_BASE = RAW_API_URL ? `${RAW_API_URL.replace(/\/$/, '')}/api` : '/api';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('nss_auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('nss_auth_token', token);
    } else {
      localStorage.removeItem('nss_auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.error || (data.details ? JSON.stringify(data.details) : `Request failed (${res.status})`);
      throw new Error(errorMsg);
    }

    return data as T;
  }

  // --- Auth APIs ---
  async login(identifier: string, password: string) {
    const res = await this.request<{ token: string; user: User; hasBiometrics: boolean }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    this.setToken(res.token);
    return res;
  }

  async register(data: {
    student_id: string;
    email: string;
    full_name: string;
    department: string;
    batch_year: number;
    password: string;
  }) {
    const res = await this.request<{ token: string; user: User; hasBiometrics: boolean }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(res.token);
    return res;
  }

  async getCurrentUser() {
    return this.request<{ user: User; authenticators: any[]; hasBiometrics: boolean }>('/auth/me');
  }

  async resetBiometrics(password: string) {
    return this.request<{ message: string }>('/auth/recovery/reset-biometrics', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  // --- WebAuthn APIs ---
  async getRegisterOptions() {
    return this.request<any>('/auth/webauthn/register-options');
  }

  async verifyRegistration(response: any, deviceName?: string) {
    return this.request<{ verified: boolean; message: string }>('/auth/webauthn/verify-registration', {
      method: 'POST',
      body: JSON.stringify({ response, deviceName }),
    });
  }

  async getLoginOptions(identifier: string) {
    return this.request<{ options: any; userId: string }>('/auth/webauthn/login-options', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  }

  async verifyLogin(userId: string, response: any) {
    const res = await this.request<{ token: string; user: User; hasBiometrics: boolean }>('/auth/webauthn/verify-login', {
      method: 'POST',
      body: JSON.stringify({ userId, response }),
    });
    this.setToken(res.token);
    return res;
  }

  // --- Election APIs ---
  async getElections() {
    return this.request<{ elections: Election[] }>('/elections');
  }

  async getElectionDetails(id: string) {
    return this.request<{
      election: Election;
      candidates: Candidate[];
      voterStatus: { isEligible: boolean; hasVoted: boolean; receiptCode: string | null; votedAt: string | null } | null;
      votesCast: number;
    }>(`/elections/${id}`);
  }

  async createElection(data: any) {
    return this.request<{ message: string; id: string }>('/elections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateElection(id: string, data: any) {
    return this.request<{ message: string }>(`/elections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateElectionStatus(id: string, status: string) {
    return this.request<{ message: string }>(`/elections/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async publishResults(id: string, publish: boolean) {
    return this.request<{ message: string }>(`/elections/${id}/publish-results`, {
      method: 'PATCH',
      body: JSON.stringify({ publish }),
    });
  }

  async addCandidate(electionId: string, formData: FormData) {
    return this.request<{ message: string; candidateId: string }>(`/elections/${electionId}/candidates`, {
      method: 'POST',
      body: formData,
    });
  }

  async deleteCandidate(electionId: string, candidateId: string) {
    return this.request<{ message: string }>(`/elections/${electionId}/candidates/${candidateId}`, {
      method: 'DELETE',
    });
  }

  // --- Ballot & Voting APIs ---
  async getBallotUnlockChallenge(electionId: string) {
    return this.request<{ options: any }>(`/ballots/unlock-challenge`, {
      method: 'POST',
      body: JSON.stringify({ electionId }),
    });
  }

  async verifyBallotUnlock(electionId: string, response: any, simulated: boolean = false) {
    return this.request<{ unlocked: boolean; ballotToken: string; expiresAt: string }>(`/ballots/verify-unlock`, {
      method: 'POST',
      body: JSON.stringify({ electionId, response, simulated }),
    });
  }

  async submitBallot(electionId: string, ballotToken: string, candidateId: string) {
    return this.request<{
      success: boolean;
      message: string;
      receiptCode: string;
      votedAt: string;
    }>(`/ballots/submit`, {
      method: 'POST',
      body: JSON.stringify({ electionId, ballotToken, candidateId }),
    });
  }

  // --- Voter Management & Turnout APIs ---
  async getVoters(params: { search?: string; department?: string; electionId?: string; page?: number }) {
    const q = new URLSearchParams();
    if (params.search) q.append('search', params.search);
    if (params.department) q.append('department', params.department);
    if (params.electionId) q.append('electionId', params.electionId);
    if (params.page) q.append('page', params.page.toString());
    return this.request<{ voters: any[]; total: number; page: number; totalPages: number }>(`/voters?${q.toString()}`);
  }

  async createVoter(data: any) {
    return this.request<{ message: string; id: string; defaultPassword?: string }>('/voters', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async batchImportVoters(voters: any[]) {
    return this.request<{ message: string; createdCount: number; skippedCount: number; errors: any[] }>(
      '/voters/batch-import',
      {
        method: 'POST',
        body: JSON.stringify({ voters }),
      }
    );
  }

  async toggleVoterStatus(id: string, is_active: number) {
    return this.request<{ message: string }>(`/voters/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active }),
    });
  }

  async getElectionTurnout(electionId: string) {
    return this.request<TurnoutMonitoringData>(`/voters/monitoring/${electionId}`);
  }

  // --- Results & Dashboard APIs ---
  async getElectionResults(electionId: string) {
    return this.request<{ results: ElectionResultsSummary }>(`/results/${electionId}`);
  }

  getResultsExportCsvUrl(electionId: string): string {
    return `${API_BASE}/results/${electionId}/export-csv?token=${this.token || ''}`;
  }

  async getAdminOverview() {
    return this.request<AdminOverviewMetrics>('/results/admin/overview');
  }

  async getAuditLogs(params: { action?: string; resourceType?: string; page?: number } = {}) {
    const q = new URLSearchParams();
    if (params.action) q.append('action', params.action);
    if (params.resourceType) q.append('resourceType', params.resourceType);
    if (params.page) q.append('page', params.page.toString());
    return this.request<{ logs: any[]; total: number; page: number; totalPages: number }>(`/audit-logs?${q.toString()}`);
  }

  async cleanDummyData(password: string, wipeVoters: boolean = true) {
    return this.request<{ success: boolean; message: string }>('/audit-logs/system/clean-dummy-data', {
      method: 'POST',
      body: JSON.stringify({ password, wipeVoters }),
    });
  }

  // --- Returning Officer Identity Verification APIs ---
  async getOfficerStats() {
    return this.request<OfficerStats>('/officer/stats');
  }

  async getOfficerVoters(params: {
    status?: 'all' | 'pending' | 'verified' | 'rejected';
    search?: string;
    department?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const q = new URLSearchParams();
    if (params.status) q.append('status', params.status);
    if (params.search) q.append('search', params.search);
    if (params.department) q.append('department', params.department);
    if (params.page) q.append('page', params.page.toString());
    if (params.limit) q.append('limit', params.limit.toString());
    return this.request<{ voters: VoterVerificationRecord[]; total: number; page: number; totalPages: number }>(
      `/officer/voters?${q.toString()}`
    );
  }

  async verifyVoterIdentity(voterId: string) {
    return this.request<{ message: string; voter: VoterVerificationRecord }>(`/officer/verify-voter/${voterId}`, {
      method: 'POST',
    });
  }

  async rejectVoterIdentity(voterId: string, reason: string) {
    return this.request<{ message: string; voter: VoterVerificationRecord }>(`/officer/reject-voter/${voterId}`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async resetVoterIdentity(voterId: string) {
    return this.request<{ message: string; voter: VoterVerificationRecord }>(`/officer/reset-voter/${voterId}`, {
      method: 'POST',
    });
  }

  async batchVerifyVoters(voterIds: string[]) {
    return this.request<{ message: string; updatedCount: number }>(`/officer/batch-verify`, {
      method: 'POST',
      body: JSON.stringify({ voterIds }),
    });
  }
}

export const api = new ApiService();


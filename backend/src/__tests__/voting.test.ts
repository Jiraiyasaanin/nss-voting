import request from 'supertest';
import { createApp } from '../app.js';
import { db } from '../db/index.js';
import { seedDatabase } from '../db/seed.js';

const app = createApp();

beforeAll(async () => {
  await seedDatabase();
});

describe('NSS Biometric Digital Voting Platform - Automated Test Suite', () => {
  let adminToken: string;
  let voterToken: string;
  let voterId: string;
  let activeElectionId: string;
  let candidateId: string;

  // 1. Identity & Registration Tests
  describe('1. Identity Verification & Duplicate Account Prevention', () => {
    it('should successfully register a new unique student voter', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          student_id: 'NSS-2026-IT-999',
          email: 'test.voter@nss.edu',
          full_name: 'Test Student Voter',
          department: 'Information Technology',
          batch_year: 2026,
          password: 'Password@123',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.student_id).toBe('NSS-2026-IT-999');
    });

    it('should strictly reject duplicate registration with the same Student ID', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          student_id: 'NSS-2026-IT-999', // duplicate ID
          email: 'different.email@nss.edu',
          full_name: 'Imposter Account',
          department: 'Computer Science',
          batch_year: 2026,
          password: 'Password@123',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/Student ID is already registered/i);
    });

    it('should strictly reject duplicate registration with the same email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          student_id: 'NSS-2026-CS-888',
          email: 'test.voter@nss.edu', // duplicate email
          full_name: 'Second Account',
          department: 'Information Technology',
          batch_year: 2026,
          password: 'Password@123',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/email address already exists/i);
    });
  });

  // 2. Authentication & RBAC
  describe('2. Authentication & Role-Based Access Control', () => {
    it('should login admin with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'admin@nss.edu',
          password: 'Admin@2026',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.role).toBe('ADMIN');
      adminToken = res.body.token;
    });

    it('should login student voter with student roll number', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'NSS-2026-CS-001',
          password: 'Voter@123',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.role).toBe('VOTER');
      voterToken = res.body.token;
      voterId = res.body.user.id;
    });

    it('should deny voter access to admin election creation endpoint', async () => {
      const res = await request(app)
        .post('/api/elections')
        .set('Authorization', `Bearer ${voterToken}`)
        .send({
          title: 'Unauthorized Election',
          description: 'Hacked election',
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 86400000).toISOString(),
        });

      expect(res.status).toBe(403);
    });
  });

  // 3. Election Management
  describe('3. Election Management & Candidates', () => {
    it('should allow admin to create an election', async () => {
      const startTime = new Date(Date.now() - 10000).toISOString();
      const endTime = new Date(Date.now() + 86400000).toISOString();

      const res = await request(app)
        .post('/api/elections')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Council Election 2026',
          description: 'Automated test election for council',
          start_time: startTime,
          end_time: endTime,
          status: 'ACTIVE',
          eligibility_type: 'ALL',
          max_selections: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      activeElectionId = res.body.id;
    });

    it('should allow admin to add candidates to election', async () => {
      const res = await request(app)
        .post(`/api/elections/${activeElectionId}/candidates`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Candidate Alpha')
        .field('department', 'Computer Science')
        .field('manifesto', 'Manifesto for Candidate Alpha')
        .field('symbol_url', 'Shield');

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('candidateId');
      candidateId = res.body.candidateId;
    });
  });

  // 4. WebAuthn Biometric & Ballot Unlock Flow
  describe('4. Biometric Authentication & Single-Use Ballot Token Flow', () => {
    let ballotToken: string;

    it('should generate a biometric challenge for ballot unlock', async () => {
      const res = await request(app)
        .post('/api/ballots/unlock-challenge')
        .set('Authorization', `Bearer ${voterToken}`)
        .send({ electionId: activeElectionId });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('options');
      expect(res.body.options).toHaveProperty('challenge');
    });

    it('should verify unlock and issue a single-use Ballot Token', async () => {
      const res = await request(app)
        .post('/api/ballots/verify-unlock')
        .set('Authorization', `Bearer ${voterToken}`)
        .send({
          electionId: activeElectionId,
          simulated: true, // test simulation authorized in test env
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ballotToken');
      expect(res.body.unlocked).toBe(true);
      ballotToken = res.body.ballotToken;
    });

    it('should cast a vote successfully and return cryptographic receipt', async () => {
      const res = await request(app)
        .post('/api/ballots/submit')
        .set('Authorization', `Bearer ${voterToken}`)
        .send({
          electionId: activeElectionId,
          ballotToken,
          candidateId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('receiptCode');
      expect(res.body.receiptCode).toMatch(/^NSS-REC-/);
    });

    it('should STRICTLY prevent duplicate vote with consumed token or second attempt', async () => {
      // Attempt 1: Reusing consumed token
      const res1 = await request(app)
        .post('/api/ballots/submit')
        .set('Authorization', `Bearer ${voterToken}`)
        .send({
          electionId: activeElectionId,
          ballotToken,
          candidateId,
        });

      expect(res1.status).toBe(409);

      // Attempt 2: Requesting new unlock after having already voted
      const res2 = await request(app)
        .post('/api/ballots/unlock-challenge')
        .set('Authorization', `Bearer ${voterToken}`)
        .send({ electionId: activeElectionId });

      expect(res2.status).toBe(409);
      expect(res2.body.error).toMatch(/already cast your ballot/i);
    });
  });

  // 5. Critical Ballot Secrecy Verification
  describe('5. Database-Level Ballot Secrecy Verification', () => {
    it('should verify that ballots table contains ZERO reference to voterId or receiptCode', () => {
      const columns = db.prepare(`PRAGMA table_info(ballots)`).all() as Array<{ name: string }>;
      const columnNames = columns.map(c => c.name.toLowerCase());

      expect(columnNames).not.toContain('voter_id');
      expect(columnNames).not.toContain('user_id');
      expect(columnNames).not.toContain('student_id');
      expect(columnNames).not.toContain('receipt_code');
    });

    it('should verify that voter_participation table contains ZERO reference to candidateId', () => {
      const columns = db.prepare(`PRAGMA table_info(voter_participation)`).all() as Array<{ name: string }>;
      const columnNames = columns.map(c => c.name.toLowerCase());

      expect(columnNames).not.toContain('candidate_id');
      expect(columnNames).not.toContain('ballot_id');
      expect(columnNames).not.toContain('selection');
    });
  });

  // 6. Election Integrity: Sealed Interim Results
  describe('6. Election Integrity: Sealed Interim Results', () => {
    it('should seal interim candidate counts for active election', async () => {
      const res = await request(app)
        .get(`/api/results/${activeElectionId}`)
        .set('Authorization', `Bearer ${voterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Interim candidate counts are sealed/i);
    });

    it('should calculate verified results for concluded published election', async () => {
      const res = await request(app)
        .get('/api/results/el-service-sec-2026')
        .set('Authorization', `Bearer ${voterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.results).toHaveProperty('candidateResults');
      expect(res.body.results.totalVotesCast).toBe(5);
      expect(res.body.results.candidateResults.length).toBe(2);
      // Verify winner flag exists
      const winner = res.body.results.candidateResults.find((c: any) => c.isWinner);
      expect(winner).toBeDefined();
    });
  });
});


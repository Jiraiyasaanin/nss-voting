import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, initDatabase } from './index.js';

const uuidv4 = () => crypto.randomUUID();

export async function seedDatabase() {
  console.log('[SEED] Initializing schema...');
  initDatabase();

  console.log('[SEED] Clearing previous data for clean slate...');
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM ballots;
    DELETE FROM voter_participation;
    DELETE FROM election_voter_eligibility;
    DELETE FROM candidates;
    DELETE FROM ballot_access_tokens;
    DELETE FROM webauthn_challenges;
    DELETE FROM webauthn_credentials;
    DELETE FROM elections;
    DELETE FROM users;
  `);

  console.log('[SEED] Seeding Administrative and Voter accounts...');

  const adminPassHash = await bcrypt.hash('Admin@2026', 10);
  const officerPassHash = await bcrypt.hash('Officer@2026', 10);
  const voterPassHash = await bcrypt.hash('Voter@123', 10);

  const adminId = uuidv4();
  const officerId = uuidv4();

  // Admin and Officer
  const insertUser = db.prepare(`
    INSERT INTO users (id, student_id, email, full_name, department, batch_year, role, password_hash, is_active, is_verified, rejection_reason, verified_by, verified_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  insertUser.run(adminId, 'NSS-ADMIN-01', 'admin@nss.edu', 'Prof. Rajesh Kulkarni (Chief Election Officer)', 'Election Commission', 2020, 'ADMIN', adminPassHash, 1, null, officerId, new Date().toISOString());
  insertUser.run(officerId, 'NSS-OFFICER-01', 'officer@nss.edu', 'Dr. Meenakshi Sundaram (Returning Officer)', 'Student Affairs', 2021, 'ELECTION_OFFICER', officerPassHash, 1, null, officerId, new Date().toISOString());

  // Student Voters
  const studentData = [
    // Verified Students (eligible to vote immediately)
    { student_id: 'NSS-2026-CS-001', email: 'aarav.sharma@nss.edu', full_name: 'Aarav Sharma', department: 'Computer Science', batch_year: 2026, is_verified: 1, rejection_reason: null, verified_by: officerId },
    { student_id: 'NSS-2026-CS-002', email: 'diya.patel@nss.edu', full_name: 'Diya Patel', department: 'Computer Science', batch_year: 2026, is_verified: 1, rejection_reason: null, verified_by: officerId },
    { student_id: 'NSS-2026-ME-003', email: 'rohan.verma@nss.edu', full_name: 'Rohan Verma', department: 'Mechanical Engineering', batch_year: 2026, is_verified: 1, rejection_reason: null, verified_by: officerId },
    
    // Pending Students (awaiting officer verification)
    { student_id: 'NSS-2026-EE-004', email: 'ananya.iyer@nss.edu', full_name: 'Ananya Iyer', department: 'Electrical Engineering', batch_year: 2026, is_verified: 0, rejection_reason: null, verified_by: null },
    { student_id: 'NSS-2026-CE-005', email: 'kabir.singh@nss.edu', full_name: 'Kabir Singh', department: 'Civil Engineering', batch_year: 2026, is_verified: 0, rejection_reason: null, verified_by: null },
    { student_id: 'NSS-2026-CS-006', email: 'ishaan.gupta@nss.edu', full_name: 'Ishaan Gupta', department: 'Computer Science', batch_year: 2026, is_verified: 0, rejection_reason: null, verified_by: null },
    
    // Flagged / Rejected Student (e.g. invalid roll number)
    { student_id: 'NSS-2026-BT-007', email: 'tanya.reddy@nss.edu', full_name: 'Tanya Reddy', department: 'Biotechnology', batch_year: 2026, is_verified: -1, rejection_reason: 'Roll number does not match current university semester roster', verified_by: officerId },
  ];

  const studentIds: string[] = [];
  for (const s of studentData) {
    const sId = uuidv4();
    const verifiedAt = s.is_verified === 1 || s.is_verified === -1 ? new Date().toISOString() : null;
    insertUser.run(sId, s.student_id, s.email, s.full_name, s.department, s.batch_year, 'VOTER', voterPassHash, s.is_verified, s.rejection_reason, s.verified_by, verifiedAt);
    studentIds.push(sId);
  }

  // Pre-enroll a biometric mock credential for Aarav Sharma (voter #1) so it works out-of-the-box
  const aaravCredId = 'mock_credential_aarav_sharma_passkey';
  db.prepare(`
    INSERT INTO webauthn_credentials (id, user_id, public_key, counter, transports, device_name, aaguid, created_at)
    VALUES (?, ?, ?, 0, '["internal"]', 'Touch ID / Platform Fingerprint', 'mock-aaguid-1', CURRENT_TIMESTAMP)
  `).run(aaravCredId, studentIds[0], Buffer.from('mock_cose_key_aarav'));

  console.log('[SEED] Creating sample elections and candidates...');

  const insertElection = db.prepare(`
    INSERT INTO elections (id, title, description, start_time, end_time, status, eligibility_type, eligibility_criteria, max_selections, results_published, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  const insertCandidate = db.prepare(`
    INSERT INTO candidates (id, election_id, name, ballot_number, photo_url, symbol_url, department, manifesto, qualifications, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
  `);

  // Election 1: General Student Council President (ACTIVE, ALL ELIGIBLE)
  const el1Id = 'el-pres-2026';
  const now = new Date();
  const startTimeEl1 = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(); // started 2h ago
  const endTimeEl1 = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();  // ends in 48h

  insertElection.run(
    el1Id,
    'NSS General Student Council President 2026',
    'Official collegiate election to choose the NSS Student Council President for the 2026-2027 academic tenure. All registered campus students are eligible to vote.',
    startTimeEl1,
    endTimeEl1,
    'ACTIVE',
    'ALL',
    null,
    1,
    0,
    adminId
  );

  const c1_1 = uuidv4();
  const c1_2 = uuidv4();
  const c1_3 = uuidv4();

  insertCandidate.run(
    c1_1,
    el1Id,
    'Vikramaditya Rao',
    1,
    null,
    'Book & Lamp',
    'Computer Science',
    'Advancing 24/7 technical laboratory access, high-speed campus internet, transparent budgetary disclosure, and student entrepreneurship incubators.',
    'Former NSS Tech Wing Lead | IEEE Student Branch Chair'
  );

  insertCandidate.run(
    c1_2,
    el1Id,
    'Priyanka Nair',
    2,
    null,
    'Rising Sun',
    'Electrical Engineering',
    'Championing campus sustainability, solar-powered recreation hubs, 100% vegetarian healthy food choices in cafeterias, and expanded inter-college debate forums.',
    'NSS Community Service Secretary | Youth Parliament Gold Medalist'
  );

  insertCandidate.run(
    c1_3,
    el1Id,
    'Arjun Deshmukh',
    3,
    null,
    'Torch of Progress',
    'Mechanical Engineering',
    'Upgrading collegiate athletic infrastructure, round-the-clock mental wellness counselors, and guaranteed industrial summer internship tie-ups.',
    'University Football Captain | Robotics Team Core Coordinator'
  );

  // Election 2: CS Department Representative (ACTIVE, DEPARTMENTS: ["Computer Science"])
  const el2Id = 'el-cs-rep-2026';
  insertElection.run(
    el2Id,
    'Computer Science Department Representative 2026',
    'Departmental representative election exclusively for registered Computer Science students. Focus on computing lab equipment, industry curriculum feedback, and hackathons.',
    startTimeEl1,
    endTimeEl1,
    'ACTIVE',
    'DEPARTMENTS',
    JSON.stringify(['Computer Science']),
    1,
    0,
    adminId
  );

  insertCandidate.run(
    uuidv4(),
    el2Id,
    'Sneha Mukherjee',
    1,
    null,
    'Algorithm Gear',
    'Computer Science',
    'Establishing the Annual NSS 48-Hour National Hackathon, GPU compute clusters for AI coursework, and peer-to-peer coding tutoring sessions.',
    'Lead Organizer, CodeNSS 2025'
  );

  insertCandidate.run(
    uuidv4(),
    el2Id,
    'Karthik Sundaram',
    2,
    null,
    'Binary Matrix',
    'Computer Science',
    'Free cloud credits for engineering projects, open-source contribution workshops, and tech company recruitment drives on campus.',
    'Google Summer of Code Contributor 2025'
  );

  // Election 3: Community Service Secretary (COMPLETED & PUBLISHED)
  const el3Id = 'el-service-sec-2026';
  const pastStart = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();
  const pastEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  insertElection.run(
    el3Id,
    'NSS Annual Community Service Secretary 2025-2026',
    'Concluded election for overseeing village adoption drives, blood donation camps, and literacy initiatives.',
    pastStart,
    pastEnd,
    'COMPLETED',
    'ALL',
    null,
    1,
    1, // Results published
    adminId
  );

  const c3_1 = uuidv4();
  const c3_2 = uuidv4();

  insertCandidate.run(
    c3_1,
    el3Id,
    'Meera Krishnan',
    1,
    null,
    'Lotus of Service',
    'Biotechnology',
    'Dedicated to rural healthcare camps and medical diagnostic drives across district villages.',
    'NSS Volunteer of the Year 2024'
  );

  insertCandidate.run(
    c3_2,
    el3Id,
    'Tushar Joshi',
    2,
    null,
    'Olive Branch',
    'Civil Engineering',
    'Focusing on rainwater harvesting implementation in adjacent public schools and disaster relief readiness.',
    'Red Cross Youth Representative'
  );

  // Seed sample votes for Election 3 to showcase historical results analytics
  console.log('[SEED] Populating certified ballots for concluded election...');
  const votersForEl3 = [studentIds[2], studentIds[3], studentIds[4], studentIds[5], studentIds[6]];

  votersForEl3.forEach((voterId, index) => {
    const chosenCandidate = index % 3 === 0 ? c3_2 : c3_1; // Meera receives more votes
    const receiptCode = `NSS-REC-SERV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Table 1: Voter Participation (WHO voted)
    db.prepare(`
      INSERT INTO voter_participation (id, election_id, voter_id, receipt_code, voted_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(uuidv4(), el3Id, voterId, receiptCode);

    // Table 2: Anonymous Ballots (WHAT was voted - ZERO link to voterId!)
    const ballotHash = crypto.createHash('sha256').update(`${el3Id}:${chosenCandidate}:${index}`).digest('hex');
    db.prepare(`
      INSERT INTO ballots (id, election_id, candidate_id, ballot_hash, cast_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(uuidv4(), el3Id, chosenCandidate, ballotHash);
  });

  console.log('[SEED] Seeding initial audit trail entries...');
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, created_at)
    VALUES (?, ?, 'SYSTEM_INITIALIZATION', 'system', 'root', '{"status":"SEED_COMPLETED","mode":"PRODUCTION_READY"}', '127.0.0.1', CURRENT_TIMESTAMP)
  `).run(uuidv4(), adminId);

  console.log('=================================================================');
  console.log('  SEEDING COMPLETED SUCCESSFULLY!');
  console.log('  Default Admin:   admin@nss.edu   / Admin@2026 (NSS-ADMIN-01)');
  console.log('  Default Officer: officer@nss.edu / Officer@2026 (NSS-OFFICER-01)');
  console.log('  Default Voter:   aarav.sharma@nss.edu / Voter@123 (NSS-2026-CS-001)');
  console.log('=================================================================');
}

// If run directly
if (process.argv[1]?.includes('seed')) {
  seedDatabase();
}

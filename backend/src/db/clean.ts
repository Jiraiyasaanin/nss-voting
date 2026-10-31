import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, initDatabase } from './index.js';

export async function cleanDatabase(wipeAllUsers: boolean = false) {
  console.log('[CLEAN] Initializing database schema...');
  initDatabase();

  console.log('[CLEAN] Purging dummy ballots, elections, candidates, and participation records...');

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
  `);

  if (wipeAllUsers) {
    console.log('[CLEAN] Wiping ALL users from database...');
    db.exec(`DELETE FROM users;`);
    console.log('[CLEAN] Database completely wiped to empty state.');
  } else {
    console.log('[CLEAN] Purging test voters while preserving Administrator account...');
    db.exec(`DELETE FROM users WHERE role = 'VOTER';`);

    // Ensure at least one Super Admin exists so the user is never locked out
    const existingAdmin = db.prepare(`SELECT id FROM users WHERE role = 'ADMIN'`).get();
    if (!existingAdmin) {
      const adminPassHash = await bcrypt.hash('Admin@2026', 10);
      const adminId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO users (id, student_id, email, full_name, department, batch_year, role, password_hash, is_active, is_verified, created_at, updated_at)
        VALUES (?, 'NSS-ADMIN-01', 'admin@nss.edu', 'System Administrator', 'Election Commission', 2026, 'ADMIN', ?, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(adminId, adminPassHash);
      console.log('[CLEAN] Created fresh default Super Admin: admin@nss.edu / Admin@2026');
    }

    console.log('=================================================================');
    console.log('  DUMMY DATA REMOVED SUCCESSFULLY!');
    console.log('  - All dummy elections & candidates removed: 0');
    console.log('  - All dummy votes & ballots cleared: 0');
    console.log('  - All dummy test student voters removed: 0');
    console.log('  - Administrator account preserved: admin@nss.edu');
    console.log('=================================================================');
  }
}

// If run directly via CLI
if (process.argv[1]?.includes('clean')) {
  const wipeAll = process.argv.includes('--all') || process.argv.includes('--wipe');
  cleanDatabase(wipeAll);
}


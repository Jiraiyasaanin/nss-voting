-- NSS VOTING SYSTEM: Relational SQLite Schema with Strict Relational Integrity

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- 1. Users Table (College Students, Staff, and Administrators)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL UNIQUE,          -- Unique College Roll / Registration Number (e.g., NSS-2026-CS-001)
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    department TEXT NOT NULL,                 -- e.g. "Computer Engineering", "NSS Wing", "Mechanical"
    batch_year INTEGER NOT NULL,             -- e.g. 2026
    role TEXT NOT NULL CHECK(role IN ('VOTER', 'ADMIN', 'ELECTION_OFFICER')),
    password_hash TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,     -- Admin can activate / deactivate
    is_verified INTEGER NOT NULL DEFAULT 1,   -- Identity registry verification status
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. WebAuthn Biometric Credentials
CREATE TABLE IF NOT EXISTS webauthn_credentials (
    id TEXT PRIMARY KEY,                      -- Credential ID (Base64URL)
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    public_key BLOB NOT NULL,                 -- COSE encoded public key
    counter INTEGER NOT NULL DEFAULT 0,
    transports TEXT,                          -- JSON array string: ["internal", "hybrid"]
    device_name TEXT NOT NULL,                -- Descriptive name e.g. "Pixel Fingerprint", "MacBook TouchID"
    aaguid TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME
);

-- 3. WebAuthn Challenges (Ephemeral Challenges with 5-minute expiry)
CREATE TABLE IF NOT EXISTS webauthn_challenges (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK(purpose IN ('REGISTRATION', 'LOGIN', 'BALLOT_UNLOCK')),
    election_id TEXT,                         -- Populated when purpose = 'BALLOT_UNLOCK'
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Single-Use Ballot Tokens (Issued strictly after biometric verification)
CREATE TABLE IF NOT EXISTS ballot_access_tokens (
    token_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    election_id TEXT NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    is_consumed INTEGER NOT NULL DEFAULT 0,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Elections Table
CREATE TABLE IF NOT EXISTS elections (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED', 'COMPLETED')),
    eligibility_type TEXT NOT NULL CHECK(eligibility_type IN ('ALL', 'DEPARTMENTS', 'SPECIFIC_STUDENTS')),
    eligibility_criteria TEXT,               -- JSON array string of eligible departments or years
    max_selections INTEGER NOT NULL DEFAULT 1,
    results_published INTEGER NOT NULL DEFAULT 0,
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Candidates Table
CREATE TABLE IF NOT EXISTS candidates (
    id TEXT PRIMARY KEY,
    election_id TEXT NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    ballot_number INTEGER NOT NULL,
    photo_url TEXT,
    symbol_url TEXT,
    department TEXT NOT NULL,
    manifesto TEXT NOT NULL,
    qualifications TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(election_id, ballot_number)
);

-- 7. Election Voter Eligibility (Explicit assignment table)
CREATE TABLE IF NOT EXISTS election_voter_eligibility (
    election_id TEXT NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    voter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (election_id, voter_id)
);

-- 8. Voter Participation Table (WHO voted, NOT for WHOM)
-- CRITICAL BALLOT SECRECY: Does NOT reference candidate or ballot!
CREATE TABLE IF NOT EXISTS voter_participation (
    id TEXT PRIMARY KEY,
    election_id TEXT NOT NULL REFERENCES elections(id) ON DELETE RESTRICT,
    voter_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    receipt_code TEXT NOT NULL UNIQUE,       -- Cryptographic verification receipt given to voter
    voted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_hash TEXT,
    user_agent TEXT,
    UNIQUE(election_id, voter_id)            -- Absolute 1-person-1-vote constraint
);

-- 9. Ballots Table (WHAT was voted, NEVER by WHOM)
-- CRITICAL BALLOT SECRECY: Contains NO foreign key or identifier to voter!
CREATE TABLE IF NOT EXISTS ballots (
    id TEXT PRIMARY KEY,
    election_id TEXT NOT NULL REFERENCES elections(id) ON DELETE RESTRICT,
    candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT,
    ballot_hash TEXT NOT NULL UNIQUE,        -- Salted cryptographic signature of the choice
    cast_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. Audit Logs Table (Tamper-evident administrative activity tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details TEXT,                            -- JSON string of context & delta
    ip_address TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for ultra-fast query performance and constraint verification
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_webauthn_user ON webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_candidates_election ON candidates(election_id);
CREATE INDEX IF NOT EXISTS idx_voter_part_election ON voter_participation(election_id);
CREATE INDEX IF NOT EXISTS idx_voter_part_user ON voter_participation(voter_id);
CREATE INDEX IF NOT EXISTS idx_ballots_election ON ballots(election_id);
CREATE INDEX IF NOT EXISTS idx_ballots_candidate ON ballots(candidate_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);


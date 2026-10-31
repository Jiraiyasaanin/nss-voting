# NSS Secure Biometric Digital Voting Platform

A production-oriented, **Biometric-Based Digital Ballot Voting System** designed for collegiate elections and institutional governance, engineered on **WebAuthn / FIDO2 Level 3** passkey standards and the **Cryptographic Dual-Record Split** for zero-knowledge ballot secrecy.

---

## 1. Core Architecture & Philosophy

The platform operates on the democratic principle:

$$\text{1 Verified Individual} \Longleftrightarrow \text{1 Account} \Longleftrightarrow \text{1 Vote per Election}$$

### The Cryptographic Dual-Record Split
To guarantee that administrators and database operators **cannot determine how any specific voter voted**, while simultaneously proving that:
1. Every vote was cast by an eligible, biometrically verified voter,
2. No voter can vote more than once,
3. Every recorded ballot in the ballot box corresponds to an authentic voter,

the system separates identity verification from ballot storage at the database level:

```
[Voter Biometric Verification]
              │
              ▼
   ┌──────────────────────┐
   │ Atomic DB Transaction │
   └──────────┬───────────┘
              │
     ┌────────┴────────┐
     ▼                 ▼
Table 1: WHO Voted             Table 2: WHAT Was Voted
`voter_participation`          `ballots`
- id (UUID)                    - id (UUID)
- election_id (FK)             - election_id (FK)
- voter_id (FK to users)       - candidate_id (FK)
- receipt_code (HMAC SHA-256)  - ballot_hash (Salted SHA-256)
- voted_at (Timestamp)         - cast_at (Timestamp)
[NO candidate reference!]      [ZERO reference to voter_id!]
```

- **Ballot Secrecy Guarantee**: The `ballots` table contains only `id`, `election_id`, `candidate_id`, `ballot_hash`, and `cast_at`. It **never contains any voter ID, roll number, IP address, or token ID**.
- **Idempotency & Race Condition Prevention**: SQLite runs in WAL mode with immediate exclusive transaction locks. Duplicate submissions or parallel requests are rejected with a 409 Conflict.
- **Sealed Interim Results**: In strict accordance with democratic integrity, candidate vote totals are inaccessible while an election is in the active voting phase to prevent influencing voter behavior. Candidate-wise totals are unlocked only after election closure and certification.

---

## 2. Biometric Authentication via WebAuthn / FIDO2

- **Zero Biometric Storage**: The application server never stores raw fingerprints, facial scans, or biometric templates.
- **Cryptographic Challenge-Response**: Uses `@simplewebauthn/server` and `@simplewebauthn/browser` for platform authenticators (Apple Touch ID, Face ID, Windows Hello, Android Biometrics).
- **Single-Use Ballot Token**: Passing biometric verification issues a 5-minute time-bound single-use cryptographic token required to unlock and cast the electronic ballot.
- **Testing Simulator**: Includes a platform sensor simulator for headless or desktop environments without biometric hardware attached.

---

## 3. Technology Stack

- **Backend**: Node.js v22, Express, TypeScript, Better-SQLite3, `@simplewebauthn/server`, `bcryptjs`, `jsonwebtoken`, `zod`, `multer`, `helmet`, `cors`.
- **Frontend**: Vite, React 19, TypeScript, Tailwind CSS, Lucide React, `@simplewebauthn/browser`, `jspdf`, `canvas-confetti`.
- **UI Design**: Indian National Flag-inspired tricolour design (Saffron, Crisp Warm White, Indian Green, Ashoka Navy) adhering to `.agent/skills/frontend-design.md`.

---

## 4. Quick Start & Setup

### Prerequisites
- Node.js v20+ or v22+
- npm v10+

### Installation

From the project root directory:

```bash
# 1. Install dependencies
npm run install:all

# 2. Seed database with initial roles, candidates, and sample elections (optional)
npm run seed

# 3. Clear all dummy data / reset to fresh clean slate
npm run clean

# 4. Run development servers (Backend on :5000, Frontend on :3000)
npm run dev
```

### Database Management Commands

| Command | Action |
|---|---|
| `npm run seed` | Seeds initial sample elections, dummy candidates, test student voters (`CS-001`, `CS-002`, etc.), sample ballots, and demo Admin accounts for testing. |
| `npm run clean` | **Purges all dummy data**: Removes sample elections, test candidates, dummy votes/ballots, and dummy student accounts, while **safely preserving the Admin account** (`admin@nss.edu` / `Admin@2026`) so you can begin real elections. |
| `npm run wipe` | **Complete factory wipe**: Completely wipes all tables including users. |

*You can also clear dummy data directly from the **Admin Portal UI** via the **"Clear Dummy Data"** button on the Admin Dashboard.*

### Accessing the Application
- Open your browser at: **`http://localhost:3000`**

---

## 5. Pre-Configured Demo Accounts

| Role | Identifier / Email | Student ID / Roll | Password |
|---|---|---|---|
| **Chief Admin** | `admin@nss.edu` | `NSS-ADMIN-01` | `Admin@2026` |
| **Returning Officer** | `officer@nss.edu` | `NSS-OFFICER-01` | `Officer@2026` |
| **Student Voter 1** | `aarav.sharma@nss.edu` | `NSS-2026-CS-001` | `Voter@123` |
| **Student Voter 2** | `diya.patel@nss.edu` | `NSS-2026-CS-002` | `Voter@123` |
| **Student Voter 3** | `rohan.verma@nss.edu` | `NSS-2026-ME-003` | `Voter@123` |

*Note: The login screen also features one-click "Quick Demo Fast-Fill" buttons for instant testing.*

---

## 6. Automated Testing Suite

The repository includes a comprehensive automated test suite testing identity enforcement, biometric challenges, concurrent duplicate voting rejection, ballot secrecy, and results calculation:

```bash
npm run test
```

### Test Coverage Highlights:
- ✅ Student ID uniqueness constraint and duplicate account rejection
- ✅ Role-Based Access Control (RBAC) enforcement
- ✅ Biometric challenge generation and verification
- ✅ Single-use ballot token generation
- ✅ One-person-one-vote enforcement (rejecting double voting attempts)
- ✅ Database-level ballot secrecy verification (zero voter links in `ballots` table)
- ✅ Sealing interim results during active voting
- ✅ Concluded election result certification and winner calculation

---

## 7. Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config.ts              # Configuration & WebAuthn RP settings
│   │   ├── app.ts                 # Express app configuration & middleware
│   │   ├── server.ts              # HTTP Server entry point
│   │   ├── types/                 # TypeScript interfaces
│   │   ├── db/
│   │   │   ├── index.ts           # Better-SQLite3 connection & pragmas
│   │   │   ├── schema.sql         # Normalized relational schema
│   │   │   └── seed.ts            # Production seed script
│   │   ├── middleware/
│   │   │   └── auth.ts            # JWT authentication & RBAC guards
│   │   ├── services/
│   │   │   ├── audit.ts           # Append-only audit logging service
│   │   │   └── webauthn.ts        # SimpleWebAuthn challenge engine
│   │   ├── routes/
│   │   │   ├── auth.routes.ts     # Voter & Admin authentication
│   │   │   ├── election.routes.ts # Election lifecycle & candidate CRUD
│   │   │   ├── ballot.routes.ts   # Biometric challenge & vote submission
│   │   │   ├── voter.routes.ts    # Voter registry, CSV import, monitoring
│   │   │   ├── results.routes.ts  # Results tally & CSV export
│   │   │   └── audit.routes.ts    # Administrative audit trail
│   │   └── __tests__/
│   │       └── voting.test.ts     # Automated integration test suite
│   ├── tsconfig.json
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.tsx    # React Auth & Biometric Provider
│   │   ├── services/
│   │   │   ├── api.ts             # API client with token handling
│   │   │   └── webauthn.ts        # Client-side WebAuthn / Passkey engine
│   │   ├── components/
│   │   │   ├── Navbar.tsx         # Institutional Tricolour navigation
│   │   │   ├── Auth/              # Login, Registration, Passkey enrollment
│   │   │   ├── VoterPortal/       # EVM Ballot, Review, Biometric Prompt, Receipt
│   │   │   └── AdminPortal/       # Control Deck, Election Manager, Voter Registry, Turnout, Results
│   │   ├── types/
│   │   ├── index.css              # Custom Tricolour & EVM design tokens
│   │   └── App.tsx
│   ├── vite.config.ts
│   └── package.json
│
├── README.md
└── package.json
```

---

## 8. Democratic & Legal Notice

This application is designed for collegiate student unions, campus societies, and institutional governance. In compliance with security and privacy ethics, the system uses browser-native FIDO2/WebAuthn and institutional student roll registries, and does not access unauthorized government biometric registries.


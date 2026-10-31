import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import crypto from 'crypto';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { WebAuthnCredential } from '../types/index.js';

const uuidv4 = () => crypto.randomUUID();

export function saveChallenge(userId: string, challenge: string, purpose: 'REGISTRATION' | 'LOGIN' | 'BALLOT_UNLOCK', electionId?: string): string {
  // Clear any existing expired or pending challenges for this user and purpose
  db.prepare(`DELETE FROM webauthn_challenges WHERE user_id = ? AND purpose = ?`).run(userId, purpose);

  const id = uuidv4();
  // 5 minutes expiry
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO webauthn_challenges (id, user_id, challenge, purpose, election_id, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, challenge, purpose, electionId || null, expiresAt);

  return challenge;
}

export function getAndConsumeChallenge(userId: string, purpose: 'REGISTRATION' | 'LOGIN' | 'BALLOT_UNLOCK', electionId?: string): string | null {
  const row = db.prepare(`
    SELECT id, challenge, expires_at, election_id 
    FROM webauthn_challenges 
    WHERE user_id = ? AND purpose = ?
    ORDER BY created_at DESC LIMIT 1
  `).get(userId, purpose) as { id: string; challenge: string; expires_at: string; election_id: string | null } | undefined;

  if (!row) return null;

  // Check expiration
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare(`DELETE FROM webauthn_challenges WHERE id = ?`).run(row.id);
    return null;
  }

  // If electionId specified, verify match
  if (electionId && row.election_id !== electionId) {
    return null;
  }

  // Delete consumed challenge (one-time challenge)
  db.prepare(`DELETE FROM webauthn_challenges WHERE id = ?`).run(row.id);
  return row.challenge;
}

export async function createRegistrationOptions(userId: string, email: string, fullName: string) {
  // Existing credentials for user
  const userCredentials = db.prepare(`
    SELECT id, transports FROM webauthn_credentials WHERE user_id = ?
  `).all(userId) as { id: string; transports: string | null }[];

  const options = await generateRegistrationOptions({
    rpName: config.RP_NAME,
    rpID: config.RP_ID,
    userID: new Uint8Array(Buffer.from(userId)),
    userName: email,
    userDisplayName: fullName,
    attestationType: 'none',
    excludeCredentials: userCredentials.map(cred => ({
      id: cred.id,
      transports: cred.transports ? JSON.parse(cred.transports) : undefined,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      // platform allows Fingerprint (Touch ID, Windows Hello, Android Biometric)
      authenticatorAttachment: 'platform',
    },
    timeout: 60000,
  });

  saveChallenge(userId, options.challenge, 'REGISTRATION');
  return options;
}

export async function verifyUserRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  deviceName: string = 'Biometric Authenticator'
) {
  const expectedChallenge = getAndConsumeChallenge(userId, 'REGISTRATION');
  if (!expectedChallenge) {
    throw new Error('Registration challenge expired or not found. Please retry.');
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: config.RP_ORIGIN,
    expectedRPID: config.RP_ID,
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Biometric verification failed.');
  }

  const { credential } = verification.registrationInfo;

  // Store in database
  db.prepare(`
    INSERT INTO webauthn_credentials (id, user_id, public_key, counter, transports, device_name, aaguid, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(
    credential.id,
    userId,
    Buffer.from(credential.publicKey),
    credential.counter,
    response.response.transports ? JSON.stringify(response.response.transports) : null,
    deviceName,
    (credential as any).aaguid || null
  );

  return verification;
}

export async function createAuthenticationOptions(userId: string, purpose: 'LOGIN' | 'BALLOT_UNLOCK' = 'LOGIN', electionId?: string) {
  const userCredentials = db.prepare(`
    SELECT id, transports FROM webauthn_credentials WHERE user_id = ?
  `).all(userId) as { id: string; transports: string | null }[];

  if (userCredentials.length === 0) {
    throw new Error('No biometric authenticators registered for this account. Please enroll your authenticator first.');
  }

  const options = await generateAuthenticationOptions({
    rpID: config.RP_ID,
    allowCredentials: userCredentials.map(cred => ({
      id: cred.id,
      transports: cred.transports ? JSON.parse(cred.transports) : undefined,
    })),
    userVerification: 'preferred',
    timeout: 60000,
  });

  saveChallenge(userId, options.challenge, purpose, electionId);
  return options;
}

export async function verifyUserAuthentication(
  userId: string,
  response: AuthenticationResponseJSON,
  purpose: 'LOGIN' | 'BALLOT_UNLOCK' = 'LOGIN',
  electionId?: string
) {
  const expectedChallenge = getAndConsumeChallenge(userId, purpose, electionId);
  if (!expectedChallenge) {
    throw new Error('Biometric challenge expired or invalid. Please retry.');
  }

  const cred = db.prepare(`
    SELECT * FROM webauthn_credentials WHERE id = ? AND user_id = ?
  `).get(response.id, userId) as WebAuthnCredential | undefined;

  if (!cred) {
    throw new Error('Unrecognized biometric credential for this user.');
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: config.RP_ORIGIN,
    expectedRPID: config.RP_ID,
    credential: {
      id: cred.id,
      publicKey: new Uint8Array(cred.public_key),
      counter: cred.counter,
      transports: cred.transports ? JSON.parse(cred.transports) : undefined,
    },
    requireUserVerification: false,
  });

  if (!verification.verified) {
    throw new Error('Biometric authentication failed.');
  }

  // Update credential counter and last_used_at
  db.prepare(`
    UPDATE webauthn_credentials 
    SET counter = ?, last_used_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(verification.authenticationInfo.newCounter, cred.id);

  return verification;
}

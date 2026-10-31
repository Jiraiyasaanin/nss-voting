import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';

const uuidv4 = () => crypto.randomUUID();
import { config } from '../config.js';
import { db } from '../db/index.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../services/audit.js';
import {
  createRegistrationOptions,
  verifyUserRegistration,
  createAuthenticationOptions,
  verifyUserAuthentication,
} from '../services/webauthn.js';
import { SafeUser, User } from '../types/index.js';

export const authRouter = Router();

// Validation schemas
const registerSchema = z.object({
  student_id: z.string().min(3).max(30).trim(),
  email: z.string().email().toLowerCase().trim(),
  full_name: z.string().min(2).max(100).trim(),
  department: z.string().min(2).max(100).trim(),
  batch_year: z.number().int().min(2000).max(2100),
  password: z.string().min(6).max(100),
});

const loginSchema = z.object({
  identifier: z.string().trim(), // Student ID or Email
  password: z.string(),
});

// 1. Register Voter Account (Enforces strict Student ID uniqueness)
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation error', details: parseResult.error.format() });
      return;
    }

    const { student_id, email, full_name, department, batch_year, password } = parseResult.data;

    // Check duplicate Student ID
    const existingStudentId = db.prepare(`SELECT id FROM users WHERE UPPER(student_id) = UPPER(?)`).get(student_id);
    if (existingStudentId) {
      res.status(409).json({ error: 'A voter account with this Student ID is already registered.' });
      return;
    }

    // Check duplicate Email
    const existingEmail = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email);
    if (existingEmail) {
      res.status(409).json({ error: 'A voter account with this email address already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const userId = uuidv4();

    db.prepare(`
      INSERT INTO users (id, student_id, email, full_name, department, batch_year, role, password_hash, is_active, is_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'VOTER', ?, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(userId, student_id.toUpperCase(), email, full_name, department, batch_year, password_hash);

    logAudit({
      userId,
      action: 'USER_REGISTERED',
      resourceType: 'users',
      resourceId: userId,
      details: { student_id: student_id.toUpperCase(), email, department },
      ipAddress: req.ip,
    });

    const token = jwt.sign({ userId, role: 'VOTER' }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    });

    const user: SafeUser = {
      id: userId,
      student_id: student_id.toUpperCase(),
      email,
      full_name,
      department,
      batch_year,
      role: 'VOTER',
      is_active: 1,
      is_verified: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    res.status(201).json({
      message: 'Voter account created successfully. Please enroll your biometric passkey.',
      token,
      user,
      hasBiometrics: false,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during voter registration' });
  }
});

// 2. Password Login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid login credentials supplied' });
      return;
    }

    const { identifier, password } = parseResult.data;

    // Look up by email or student_id
    const user = db.prepare(`
      SELECT * FROM users WHERE email = ? OR UPPER(student_id) = UPPER(?)
    `).get(identifier.toLowerCase(), identifier) as User | undefined;

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials: user not found' });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ error: 'Account suspended: contact election commission' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials: incorrect password' });
      return;
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    });

    // Check biometric credential count
    const bioCount = db.prepare(`
      SELECT COUNT(*) as count FROM webauthn_credentials WHERE user_id = ?
    `).get(user.id) as { count: number };

    logAudit({
      userId: user.id,
      action: 'USER_LOGIN',
      resourceType: 'users',
      resourceId: user.id,
      details: { method: 'PASSWORD', role: user.role },
      ipAddress: req.ip,
    });

    const safeUser: SafeUser = {
      id: user.id,
      student_id: user.student_id,
      email: user.email,
      full_name: user.full_name,
      department: user.department,
      batch_year: user.batch_year,
      role: user.role,
      is_active: user.is_active,
      is_verified: user.is_verified,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    res.json({
      message: 'Login successful',
      token,
      user: safeUser,
      hasBiometrics: bioCount.count > 0,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// 3. Current User Profile
authRouter.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  // Get enrolled authenticators (device names and creation dates only, NO keys)
  const authenticators = db.prepare(`
    SELECT id, device_name, created_at, last_used_at 
    FROM webauthn_credentials 
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(req.user.id);

  res.json({
    user: req.user,
    authenticators,
    hasBiometrics: authenticators.length > 0,
  });
});

// 4. WebAuthn Registration Options (Initiate Biometric Enrollment)
authRouter.get('/webauthn/register-options', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const options = await createRegistrationOptions(user.id, user.email, user.full_name);
    res.json(options);
  } catch (err: any) {
    console.error('WebAuthn register options error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate biometric enrollment options' });
  }
});

// 5. WebAuthn Registration Verification (Complete Biometric Enrollment)
authRouter.post('/webauthn/verify-registration', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { response, deviceName } = req.body;

    if (!response) {
      res.status(400).json({ error: 'Missing biometric registration response' });
      return;
    }

    const verification = await verifyUserRegistration(
      user.id,
      response,
      deviceName || 'Device Biometrics'
    );

    logAudit({
      userId: user.id,
      action: 'BIOMETRIC_ENROLLED',
      resourceType: 'webauthn_credentials',
      resourceId: verification.registrationInfo?.credential.id,
      details: { deviceName },
      ipAddress: req.ip,
    });

    res.json({
      verified: true,
      message: 'Biometric authenticator successfully registered and linked to verified account.',
    });
  } catch (err: any) {
    console.error('WebAuthn registration verification error:', err);
    res.status(400).json({ error: err.message || 'Biometric registration verification failed' });
  }
});

// 6. WebAuthn Login Options (Passwordless Biometric Login)
authRouter.post('/webauthn/login-options', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      res.status(400).json({ error: 'Identifier (Student ID or Email) required' });
      return;
    }

    const user = db.prepare(`
      SELECT id FROM users WHERE email = ? OR UPPER(student_id) = UPPER(?)
    `).get(identifier.toLowerCase(), identifier) as { id: string } | undefined;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const options = await createAuthenticationOptions(user.id, 'LOGIN');
    res.json({ options, userId: user.id });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to generate biometric login options' });
  }
});

// 7. WebAuthn Login Verification
authRouter.post('/webauthn/verify-login', async (req: Request, res: Response) => {
  try {
    const { userId, response } = req.body;
    if (!userId || !response) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    const verification = await verifyUserAuthentication(userId, response, 'LOGIN');

    const user = db.prepare(`
      SELECT id, student_id, email, full_name, department, batch_year, role, is_active, is_verified, created_at, updated_at
      FROM users WHERE id = ?
    `).get(userId) as SafeUser;

    const token = jwt.sign({ userId: user.id, role: user.role }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    });

    logAudit({
      userId: user.id,
      action: 'WEBAUTHN_LOGIN_SUCCESS',
      resourceType: 'users',
      resourceId: user.id,
      details: { role: user.role },
      ipAddress: req.ip,
    });

    res.json({
      message: 'Biometric authentication verified successfully',
      token,
      user,
      hasBiometrics: true,
    });
  } catch (err: any) {
    console.error('WebAuthn login error:', err);
    res.status(400).json({ error: err.message || 'Biometric authentication failed' });
  }
});

// 8. Account Recovery & Authenticator Reset
authRouter.post('/recovery/reset-biometrics', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { password } = req.body;
    if (!password) {
      res.status(400).json({ error: 'Password required to re-authenticate and reset biometric credentials' });
      return;
    }

    const user = db.prepare(`SELECT password_hash FROM users WHERE id = ?`).get(req.user!.id) as { password_hash: string };
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Password verification failed' });
      return;
    }

    // Safely remove registered authenticators so user can enroll their new device
    db.prepare(`DELETE FROM webauthn_credentials WHERE user_id = ?`).run(req.user!.id);

    logAudit({
      userId: req.user!.id,
      action: 'BIOMETRIC_CREDENTIALS_RESET',
      resourceType: 'webauthn_credentials',
      resourceId: req.user!.id,
      details: { reason: 'User initiated replacement' },
      ipAddress: req.ip,
    });

    res.json({ message: 'Previous biometric authenticators revoked. You can now enroll your new device.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset biometric credentials' });
  }
});

import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'nss-voting-super-secret-jwt-key-2026-secure',
  JWT_EXPIRES_IN: 8 * 3600, // 8 hours in seconds
  BALLOT_TOKEN_SECRET: process.env.BALLOT_TOKEN_SECRET || 'nss-ballot-token-secret-key-salt-2026',
  
  // WebAuthn / FIDO2 Relying Party Configuration
  RP_NAME: process.env.RP_NAME || 'NSS Collegiate Digital Voting System',
  RP_ID: process.env.RP_ID || 'localhost',
  RP_ORIGIN: process.env.RP_ORIGIN || 'http://localhost:3000',

  // Storage
  UPLOAD_DIR: path.join(__dirname, '../../uploads'),
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '../../voting.db'),
};

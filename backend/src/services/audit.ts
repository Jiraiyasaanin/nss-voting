import crypto from 'crypto';
import { db } from '../db/index.js';

const uuidv4 = () => crypto.randomUUID();

export interface LogAuditOptions {
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, any> | string | null;
  ipAddress?: string | null;
}

export function logAudit({
  userId = null,
  action,
  resourceType,
  resourceId = null,
  details = null,
  ipAddress = null,
}: LogAuditOptions): void {
  try {
    const id = uuidv4();
    const detailsJson = details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null;

    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(id, userId, action, resourceType, resourceId, detailsJson, ipAddress);
  } catch (err) {
    console.error('Failed to write audit log entry:', err);
  }
}

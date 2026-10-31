import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../voting.db');

export const db: Database.Database = new Database(DB_PATH);

// Configure pragmas for ACID compliance, foreign key cascade, and performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

export function initDatabase(): void {
  const possiblePaths = [
    path.join(__dirname, 'schema.sql'),
    path.join(__dirname, '../../src/db/schema.sql'),
    path.join(__dirname, '../src/db/schema.sql'),
    path.join(process.cwd(), 'src/db/schema.sql'),
    path.join(process.cwd(), 'backend/src/db/schema.sql'),
  ];

  const foundPath = possiblePaths.find(p => fs.existsSync(p));
  if (!foundPath) {
    throw new Error('Database schema.sql file could not be located in search paths: ' + JSON.stringify(possiblePaths));
  }

  const schemaSql = fs.readFileSync(foundPath, 'utf-8');
  db.exec(schemaSql);

  // Safe schema migrations for existing databases
  try {
    db.exec(`ALTER TABLE users ADD COLUMN rejection_reason TEXT;`);
  } catch (_e) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN verified_by TEXT;`);
  } catch (_e) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN verified_at DATETIME;`);
  } catch (_e) {}
}

export function closeDatabase(): void {
  db.close();
}

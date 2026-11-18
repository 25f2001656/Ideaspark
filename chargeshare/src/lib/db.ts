import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

declare global {
  var chargeshareDb: Database.Database | undefined;
}

export function getDb() {
  if (global.chargeshareDb) return global.chargeshareDb;

  const dataDir = path.join(process.cwd(), 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, 'chargeshare.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('DRIVER','HOST','ADMIN')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS charging_locations (
      id TEXT PRIMARY KEY,
      host_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      socket_type TEXT NOT NULL,
      available INTEGER NOT NULL DEFAULT 1,
      address TEXT NOT NULL DEFAULT '',
      opening_time TEXT NOT NULL DEFAULT '08:00',
      closing_time TEXT NOT NULL DEFAULT '20:00',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(host_id) REFERENCES users(id)
    );
  `);

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@chargeshare.local').trim().toLowerCase();
  const existingAdmin = db.prepare('SELECT id FROM users WHERE role = ? LIMIT 1').get('ADMIN');
  if (!existingAdmin) {
    const password = process.env.ADMIN_PASSWORD || 'Admin@123456';
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, 'ADMIN', ?)
    `).run(
      crypto.randomUUID(),
      'ChargeShare Super Admin',
      adminEmail,
      `${salt}:${hash}`,
      new Date().toISOString(),
    );
  }

  global.chargeshareDb = db;
  return db;
}

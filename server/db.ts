import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dbFilePath = process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'andac_finans.db');
fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });

export const db = new DatabaseSync(dbFilePath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    email_verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS verification_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK(type IN ('verify_email', 'reset_password')),
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY,
    notify_price_alerts INTEGER NOT NULL DEFAULT 1,
    notify_dividend_calendar INTEGER NOT NULL DEFAULT 1,
    notify_market_brief INTEGER NOT NULL DEFAULT 1,
    notify_security_events INTEGER NOT NULL DEFAULT 1,
    profile_visibility TEXT NOT NULL DEFAULT 'private',
    analytics_consent INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS favorites (
    user_id TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK(asset_type IN ('fund', 'crypto', 'stock')),
    asset_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, asset_type, asset_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK(asset_type IN ('fund', 'crypto', 'stock')),
    asset_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity REAL NOT NULL,
    avg_cost REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'TRY',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS portfolio_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    holding_id TEXT,
    asset_type TEXT NOT NULL CHECK(asset_type IN ('fund', 'crypto', 'stock')),
    asset_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    tx_type TEXT NOT NULL CHECK(tx_type IN ('buy', 'sell', 'dividend')),
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    total_amount REAL NOT NULL,
    tx_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS outbox_emails (
    id TEXT PRIMARY KEY,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK(action_type IN ('verify_email', 'reset_password')),
    token TEXT NOT NULL,
    action_url TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS account_deletion_logs (
    id TEXT PRIMARY KEY,
    anonymized_ref TEXT NOT NULL,
    reason TEXT NOT NULL,
    deleted_at TEXT NOT NULL
  );

  -- Extensible tables reserved for future Admin, Support & Notification modules
  CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    subject TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

export function runInTransaction<T>(fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

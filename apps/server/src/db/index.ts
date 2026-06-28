import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import * as schema from './schema';
import { env } from '../config/env';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) throw new Error('Database not initialized. Call initDb() first.');
  return _db;
}

export function initDb() {
  mkdirSync(dirname(env.DB_PATH), { recursive: true });

  const sqlite = new Database(env.DB_PATH);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  _db = drizzle(sqlite, { schema });

  // Run inline migrations (no external migration files needed for SQLite)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      admin_id TEXT NOT NULL,
      admin_token_hash TEXT NOT NULL,
      card_set_id TEXT NOT NULL,
      custom_card_set TEXT,
      status TEXT NOT NULL DEFAULT 'waiting',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS room_members (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      session_token_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'participant',
      is_connected INTEGER NOT NULL DEFAULT 0,
      joined_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rounds (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      story TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'voting',
      started_at INTEGER NOT NULL,
      revealed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      value TEXT NOT NULL,
      submitted_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      session_token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      room_id TEXT NOT NULL,
      last_seen_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON room_members(room_id);
    CREATE INDEX IF NOT EXISTS idx_rounds_room_id ON rounds(room_id);
    CREATE INDEX IF NOT EXISTS idx_votes_round_id ON votes(round_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_room_id ON sessions(room_id);
  `);

  return _db;
}

export type Db = ReturnType<typeof getDb>;

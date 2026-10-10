// SQLite storage using Node's built-in sqlite module (Node >= 22).
// No native compilation needed.
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, 'familytrack.db');

export const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS enroll_codes (
    code       TEXT PRIMARY KEY,
    label      TEXT,
    used       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS devices (
    id          TEXT PRIMARY KEY,         -- device UUID
    api_key     TEXT UNIQUE NOT NULL,     -- secret the device sends with each ping
    label       TEXT NOT NULL,            -- e.g. child's name / phone model
    admin_held  INTEGER NOT NULL DEFAULT 0, -- 1 if Device Admin was granted on device
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen   TEXT
  );

  CREATE TABLE IF NOT EXISTS locations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id  TEXT NOT NULL,
    lat        REAL NOT NULL,
    lng        REAL NOT NULL,
    accuracy   REAL,
    speed      REAL,
    battery    INTEGER,
    recorded_at TEXT NOT NULL,            -- device clock (ISO)
    received_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (device_id) REFERENCES devices(id)
  );

  CREATE INDEX IF NOT EXISTS idx_loc_device_time
    ON locations (device_id, received_at DESC);
`);

export default db;

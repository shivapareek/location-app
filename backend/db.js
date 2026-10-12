// Storage layer that works with either Postgres (when DATABASE_URL is set —
// persistent, recommended for hosting) or Node's built-in SQLite (local dev).
//
// Queries are written with `?` placeholders and plain ISO strings for times
// (no datetime('now')/now()), so the same SQL runs on both engines. For
// Postgres we translate `?` to `$1, $2, ...` automatically.
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const usePg = !!process.env.DATABASE_URL;

let pgPool = null;
let sqlite = null;

if (usePg) {
  const pg = (await import('pg')).default;
  pgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // managed Postgres (Neon/Render/Supabase) needs SSL
  });
} else {
  const { DatabaseSync } = await import('node:sqlite');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const dbPath = process.env.DB_PATH || path.join(__dirname, 'familytrack.db');
  sqlite = new DatabaseSync(dbPath);
}

function toPg(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/** Run a statement that returns no rows (INSERT/UPDATE/DELETE/DDL). */
export async function run(sql, params = []) {
  if (usePg) { await pgPool.query(toPg(sql), params); return; }
  sqlite.prepare(sql).run(...params);
}

/** Return the first matching row, or undefined. */
export async function get(sql, params = []) {
  if (usePg) { const r = await pgPool.query(toPg(sql), params); return r.rows[0]; }
  return sqlite.prepare(sql).get(...params);
}

/** Return all matching rows. */
export async function all(sql, params = []) {
  if (usePg) { const r = await pgPool.query(toPg(sql), params); return r.rows; }
  return sqlite.prepare(sql).all(...params);
}

/** Create tables if they do not exist. Called once at startup. */
export async function initDb() {
  const idType = usePg ? 'BIGSERIAL' : 'INTEGER';
  const autoinc = usePg ? '' : 'AUTOINCREMENT';

  await run(`CREATE TABLE IF NOT EXISTS admins (
    id ${idType} PRIMARY KEY ${autoinc},
    username   TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS enroll_codes (
    code       TEXT PRIMARY KEY,
    label      TEXT,
    used       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS devices (
    id          TEXT PRIMARY KEY,
    api_key     TEXT UNIQUE NOT NULL,
    label       TEXT NOT NULL,
    admin_held  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL,
    last_seen   TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS locations (
    id ${idType} PRIMARY KEY ${autoinc},
    device_id   TEXT NOT NULL,
    lat         REAL NOT NULL,
    lng         REAL NOT NULL,
    accuracy    REAL,
    speed       REAL,
    battery     INTEGER,
    recorded_at TEXT NOT NULL,
    received_at TEXT NOT NULL
  )`);

  await run(`CREATE INDEX IF NOT EXISTS idx_loc_device_time
    ON locations (device_id, received_at DESC)`);

  console.log(`[db] using ${usePg ? 'Postgres (persistent)' : 'SQLite (local file)'}`);
}

/** ISO timestamp helper, used instead of SQL now()/datetime(). */
export const nowIso = () => new Date().toISOString();

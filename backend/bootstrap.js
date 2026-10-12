// On startup, create a first admin account if none exists yet, using
// ADMIN_USERNAME / ADMIN_PASSWORD from the environment. This makes hosted
// deployments (Render, Railway, etc.) turnkey — no shell access needed.
import bcrypt from 'bcryptjs';
import { get, run, nowIso } from './db.js';

export async function bootstrapAdmin() {
  const row = await get('SELECT COUNT(*) AS n FROM admins');
  if (Number(row.n) > 0) return;

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.warn(
      '[bootstrap] No admin exists and ADMIN_USERNAME/ADMIN_PASSWORD are not set. ' +
      'Create one with: node seed.js <username> <password>'
    );
    return;
  }
  await run('INSERT INTO admins (username, password, created_at) VALUES (?, ?, ?)',
    [username, bcrypt.hashSync(password, 10), nowIso()]);
  console.log(`[bootstrap] Created initial admin "${username}" from environment.`);
}

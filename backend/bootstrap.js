// On startup, create a first admin account if none exists yet, using
// ADMIN_USERNAME / ADMIN_PASSWORD from the environment. This makes hosted
// deployments (Render, Railway, etc.) turnkey — no shell access needed.
import bcrypt from 'bcryptjs';
import { db } from './db.js';

export function bootstrapAdmin() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM admins').get().n;
  if (count > 0) return;

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.warn(
      '[bootstrap] No admin exists and ADMIN_USERNAME/ADMIN_PASSWORD are not set. ' +
      'Create one with: node seed.js <username> <password>'
    );
    return;
  }
  db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)')
    .run(username, bcrypt.hashSync(password, 10));
  console.log(`[bootstrap] Created initial admin "${username}" from environment.`);
}

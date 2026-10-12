// Creates/updates the first admin account. Usage:
//   node seed.js <username> <password>
import bcrypt from 'bcryptjs';
import { initDb, get, run, nowIso } from './db.js';

const [, , username = 'admin', password = 'admin1234'] = process.argv;

await initDb();
const existing = await get('SELECT id FROM admins WHERE username = ?', [username]);
if (existing) {
  await run('UPDATE admins SET password = ? WHERE username = ?',
    [bcrypt.hashSync(password, 10), username]);
  console.log(`Updated password for admin "${username}".`);
} else {
  await run('INSERT INTO admins (username, password, created_at) VALUES (?, ?, ?)',
    [username, bcrypt.hashSync(password, 10), nowIso()]);
  console.log(`Created admin "${username}".`);
}
console.log('You can now log in to the admin panel.');
process.exit(0);

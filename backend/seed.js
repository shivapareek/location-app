// Creates the first admin account. Usage:
//   node seed.js <username> <password>
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const [, , username = 'admin', password = 'admin1234'] = process.argv;

const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(username);
if (existing) {
  db.prepare('UPDATE admins SET password = ? WHERE username = ?')
    .run(bcrypt.hashSync(password, 10), username);
  console.log(`Updated password for admin "${username}".`);
} else {
  db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)')
    .run(username, bcrypt.hashSync(password, 10));
  console.log(`Created admin "${username}".`);
}
console.log('You can now log in to the admin panel.');

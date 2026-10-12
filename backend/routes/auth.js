import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { get } from '../db.js';
import { JWT_SECRET } from '../middleware/auth.js';

const router = Router();

// POST /api/admin/login  { username, password } -> { token }
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: 'username and password required' });

  const admin = await get('SELECT * FROM admins WHERE username = ?', [username]);
  if (!admin || !bcrypt.compareSync(password, admin.password))
    return res.status(401).json({ error: 'invalid credentials' });

  const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, {
    expiresIn: '12h',
  });
  res.json({ token, username: admin.username });
});

export default router;

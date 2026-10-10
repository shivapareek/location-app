import jwt from 'jsonwebtoken';
import { db } from '../db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

// Protects admin-only routes. Expects "Authorization: Bearer <token>".
export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid token' });
  }
}

// Authenticates a device by its API key: "X-Device-Key: <key>".
export function requireDevice(req, res, next) {
  const key = req.headers['x-device-key'];
  if (!key) return res.status(401).json({ error: 'missing device key' });
  const device = db
    .prepare('SELECT * FROM devices WHERE api_key = ?')
    .get(key);
  if (!device) return res.status(401).json({ error: 'unknown device' });
  req.device = device;
  next();
}

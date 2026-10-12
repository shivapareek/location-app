import jwt from 'jsonwebtoken';
import { get } from '../db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

// Protects admin-only routes. Expects "Authorization: Bearer <token>".
export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing token' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'invalid token' });
  }
}

// Authenticates a device by its API key: "X-Device-Key: <key>".
export async function requireDevice(req, res, next) {
  const key = req.headers['x-device-key'];
  if (!key) return res.status(401).json({ error: 'missing device key' });
  try {
    const device = await get('SELECT * FROM devices WHERE api_key = ?', [key]);
    if (!device) return res.status(401).json({ error: 'unknown device' });
    req.device = device;
    next();
  } catch (e) {
    return res.status(500).json({ error: 'server error' });
  }
}

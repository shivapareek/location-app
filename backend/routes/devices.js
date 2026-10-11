import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// --- Admin: generate a one-time enrollment code for a new device -------------
// POST /api/admin/enroll-codes  { label }  -> { code }
router.post('/enroll-codes', requireAdmin, (req, res) => {
  const label = (req.body?.label || '').toString().slice(0, 80) || 'New device';
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  db.prepare('INSERT INTO enroll_codes (code, label) VALUES (?, ?)').run(code, label);
  res.json({ code, label });
});

// --- Device: enroll using a code, receive a permanent device id + api key ----
// POST /api/enroll  { code, label? }  -> { deviceId, apiKey }
router.post('/enroll', (req, res) => {
  const { code, label } = req.body || {};
  if (!code) return res.status(400).json({ error: 'enroll code required' });

  const row = db.prepare('SELECT * FROM enroll_codes WHERE code = ? AND used = 0').get(code);
  if (!row) return res.status(400).json({ error: 'invalid or used code' });

  const deviceId = crypto.randomUUID();
  const apiKey = crypto.randomBytes(24).toString('hex');
  const finalLabel = (label || row.label || 'Device').toString().slice(0, 80);

  db.prepare('INSERT INTO devices (id, api_key, label) VALUES (?, ?, ?)')
    .run(deviceId, apiKey, finalLabel);
  db.prepare('UPDATE enroll_codes SET used = 1 WHERE code = ?').run(code);

  res.json({ deviceId, apiKey, label: finalLabel });
});

// --- Admin: rename a device (fix an unclear label without re-enrolling) ------
// PATCH /api/admin/devices/:id  { label }
router.patch('/devices/:id', requireAdmin, (req, res) => {
  const label = (req.body?.label || '').toString().trim().slice(0, 80);
  if (!label) return res.status(400).json({ error: 'label required' });
  const info = db.prepare('UPDATE devices SET label = ? WHERE id = ?').run(label, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'device not found' });
  res.json({ ok: true, label });
});

// --- Admin: list devices with their latest known position -------------------
// GET /api/admin/devices
router.get('/devices', requireAdmin, (req, res) => {
  const devices = db.prepare('SELECT id, label, admin_held, created_at, last_seen FROM devices ORDER BY label').all();
  const latest = db.prepare(`
    SELECT lat, lng, accuracy, battery, recorded_at, received_at
    FROM locations WHERE device_id = ? ORDER BY received_at DESC LIMIT 1
  `);
  const result = devices.map((d) => ({ ...d, last: latest.get(d.id) || null }));
  res.json(result);
});

// --- Device: report whether Device Admin is active (for transparency) -------
// POST /api/device/admin-status { active }  (device-auth)  — see locations.js auth import
export default router;

import { Router } from 'express';
import crypto from 'node:crypto';
import { get, all, run, nowIso } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// --- Admin: generate a one-time enrollment code for a new device -------------
// POST /api/admin/enroll-codes  { label }  -> { code }
router.post('/enroll-codes', requireAdmin, async (req, res) => {
  const label = (req.body?.label || '').toString().slice(0, 80) || 'New device';
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  await run('INSERT INTO enroll_codes (code, label, used, created_at) VALUES (?, ?, 0, ?)',
    [code, label, nowIso()]);
  res.json({ code, label });
});

// --- Device: enroll using a code, receive a permanent device id + api key ----
// POST /api/enroll  { code, label? }  -> { deviceId, apiKey }
router.post('/enroll', async (req, res) => {
  const { code, label } = req.body || {};
  if (!code) return res.status(400).json({ error: 'enroll code required' });

  const row = await get('SELECT * FROM enroll_codes WHERE code = ? AND used = 0', [code]);
  if (!row) return res.status(400).json({ error: 'invalid or used code' });

  const deviceId = crypto.randomUUID();
  const apiKey = crypto.randomBytes(24).toString('hex');
  const finalLabel = (label || row.label || 'Device').toString().slice(0, 80);

  await run('INSERT INTO devices (id, api_key, label, admin_held, created_at) VALUES (?, ?, ?, 0, ?)',
    [deviceId, apiKey, finalLabel, nowIso()]);
  await run('UPDATE enroll_codes SET used = 1 WHERE code = ?', [code]);

  res.json({ deviceId, apiKey, label: finalLabel });
});

// --- Admin: rename a device (fix an unclear label without re-enrolling) ------
// PATCH /api/admin/devices/:id  { label }
router.patch('/devices/:id', requireAdmin, async (req, res) => {
  const label = (req.body?.label || '').toString().trim().slice(0, 80);
  if (!label) return res.status(400).json({ error: 'label required' });
  const existing = await get('SELECT id FROM devices WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'device not found' });
  await run('UPDATE devices SET label = ? WHERE id = ?', [label, req.params.id]);
  res.json({ ok: true, label });
});

// --- Admin: list devices with their latest known position -------------------
// GET /api/admin/devices
router.get('/devices', requireAdmin, async (req, res) => {
  const devices = await all(
    'SELECT id, label, admin_held, created_at, last_seen FROM devices ORDER BY label');
  const result = [];
  for (const d of devices) {
    const last = await get(
      `SELECT lat, lng, accuracy, battery, recorded_at, received_at
       FROM locations WHERE device_id = ? ORDER BY received_at DESC LIMIT 1`, [d.id]);
    result.push({ ...d, last: last || null });
  }
  res.json(result);
});

export default router;

import { Router } from 'express';
import { get, all, run, nowIso } from '../db.js';
import { requireAdmin, requireDevice } from '../middleware/auth.js';

const router = Router();

// --- Device: push a location sample -----------------------------------------
// POST /api/locations  (X-Device-Key)  { lat, lng, accuracy?, speed?, battery?, recordedAt? }
router.post('/locations', requireDevice, async (req, res) => {
  const { lat, lng, accuracy, speed, battery, recordedAt } = req.body || {};
  if (typeof lat !== 'number' || typeof lng !== 'number')
    return res.status(400).json({ error: 'lat and lng (numbers) required' });

  const recorded = recordedAt || nowIso();
  await run(
    `INSERT INTO locations (device_id, lat, lng, accuracy, speed, battery, recorded_at, received_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.device.id, lat, lng, accuracy ?? null, speed ?? null, battery ?? null, recorded, nowIso()]);

  await run('UPDATE devices SET last_seen = ? WHERE id = ?', [nowIso(), req.device.id]);
  res.json({ ok: true });
});

// --- Device: report Device Admin on/off state (shown in admin panel) --------
// POST /api/device/admin-status  (X-Device-Key)  { active: boolean }
router.post('/device/admin-status', requireDevice, async (req, res) => {
  const active = req.body?.active ? 1 : 0;
  await run('UPDATE devices SET admin_held = ? WHERE id = ?', [active, req.device.id]);
  res.json({ ok: true });
});

// --- Admin: location history for one device ---------------------------------
// GET /api/admin/devices/:id/locations?limit=200
router.get('/admin/devices/:id/locations', requireAdmin, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 200, 2000);
  const rows = await all(
    `SELECT lat, lng, accuracy, speed, battery, recorded_at, received_at
     FROM locations WHERE device_id = ? ORDER BY received_at DESC LIMIT ?`,
    [req.params.id, limit]);
  res.json(rows);
});

export default router;

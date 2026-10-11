import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import './db.js';
import { bootstrapAdmin } from './bootstrap.js';
import authRoutes from './routes/auth.js';
import deviceRoutes from './routes/devices.js';
import locationRoutes from './routes/locations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

bootstrapAdmin();

app.use(cors());
app.use(express.json({ limit: '64kb' }));

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Admin auth + admin-only device management
app.use('/api/admin', authRoutes);
app.use('/api/admin', deviceRoutes);   // /enroll-codes, /devices

// Device-facing + admin location routes
app.use('/api', deviceRoutes);         // /enroll
app.use('/api', locationRoutes);       // /locations, /device/admin-status, /admin/devices/:id/locations

// Serve the admin panel as static files
app.use('/', express.static(path.join(__dirname, '..', 'admin-panel')));

app.listen(PORT, () => {
  console.log(`FamilyTrack backend listening on http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/`);
});

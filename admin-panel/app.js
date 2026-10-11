'use strict';

const API = location.origin + '/api';
let token = localStorage.getItem('ft_token') || null;
let map, markers = {}, trackLine = null, selectedId = null, pollTimer = null;

const $ = (id) => document.getElementById(id);

// ---------- auth ----------
async function login(username, password) {
  const r = await fetch(API + '/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Login failed');
  const data = await r.json();
  token = data.token;
  localStorage.setItem('ft_token', token);
  $('who').textContent = 'Signed in as ' + data.username;
  return data;
}

function logout() {
  token = null;
  localStorage.removeItem('ft_token');
  if (pollTimer) clearInterval(pollTimer);
  $('app').classList.add('hidden');
  $('login').classList.remove('hidden');
}

async function api(path) {
  const r = await fetch(API + path, { headers: { authorization: 'Bearer ' + token } });
  if (r.status === 401) { logout(); throw new Error('session expired'); }
  if (!r.ok) throw new Error('request failed');
  return r.json();
}

// ---------- map ----------
function initMap() {
  if (map) return;
  map = L.map('map').setView([20.5937, 78.9629], 5); // India overview
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© OpenStreetMap',
  }).addTo(map);
}

function timeAgo(iso) {
  if (!iso) return 'never';
  const secs = Math.max(0, (Date.now() - new Date(iso.replace(' ', 'T') + 'Z')) / 1000);
  if (secs < 60) return Math.round(secs) + 's ago';
  if (secs < 3600) return Math.round(secs / 60) + 'm ago';
  if (secs < 86400) return Math.round(secs / 3600) + 'h ago';
  return Math.round(secs / 86400) + 'd ago';
}

// ---------- devices ----------
async function refreshDevices() {
  let devices;
  try { devices = await api('/admin/devices'); } catch { return; }
  const list = $('device-list');
  list.innerHTML = '';

  for (const d of devices) {
    const el = document.createElement('div');
    el.className = 'device' + (d.id === selectedId ? ' active' : '');
    const adminBadge = d.admin_held ? '<span class="badge on">uninstall-protected</span>' : '';
    const batt = d.last?.battery != null ? ` · 🔋${d.last.battery}%` : '';
    el.innerHTML = `
      <div class="name">${escapeHtml(d.label)} ${adminBadge}
        <button class="rename" title="Rename">✏️</button>
      </div>
      <div class="meta">seen ${timeAgo(d.last_seen)}${batt}</div>`;
    el.onclick = () => selectDevice(d.id);
    el.querySelector('.rename').onclick = (e) => { e.stopPropagation(); renameDevice(d.id, d.label); };
    list.appendChild(el);

    if (d.last) {
      const pos = [d.last.lat, d.last.lng];
      if (markers[d.id]) markers[d.id].setLatLng(pos);
      else markers[d.id] = L.marker(pos).addTo(map);
      markers[d.id].bindPopup(
        `<b>${escapeHtml(d.label)}</b><br>${timeAgo(d.last.received_at)}` +
        (d.last.accuracy ? `<br>±${Math.round(d.last.accuracy)}m` : ''));
    }
  }

  // drop markers for removed devices
  for (const id of Object.keys(markers)) {
    if (!devices.find((d) => d.id === id)) { map.removeLayer(markers[id]); delete markers[id]; }
  }
}

async function renameDevice(id, current) {
  const label = prompt('New name for this device:', current || '');
  if (!label || !label.trim()) return;
  const r = await fetch(API + '/admin/devices/' + id, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
    body: JSON.stringify({ label: label.trim() }),
  });
  if (r.ok) refreshDevices();
  else alert('Rename failed');
}

async function selectDevice(id) {
  selectedId = id;
  await refreshDevices();
  const history = await api(`/admin/devices/${id}/locations?limit=500`);
  if (trackLine) { map.removeLayer(trackLine); trackLine = null; }
  if (history.length) {
    const pts = history.map((h) => [h.lat, h.lng]);
    trackLine = L.polyline(pts, { color: '#4f8cff', weight: 3, opacity: 0.7 }).addTo(map);
    map.setView(pts[0], 15);
    if (markers[id]) markers[id].openPopup();
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ---------- enroll ----------
async function createEnrollCode() {
  const label = prompt('Label for the new device (e.g. child\'s name / phone):', '');
  if (label === null) return;
  const r = await fetch(API + '/admin/enroll-codes', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
    body: JSON.stringify({ label }),
  });
  const data = await r.json();
  alert(`Enrollment code: ${data.code}\n\nOpen the FamilyTrack app on the device and enter this code. ` +
        `It can be used once and expires after enrollment.`);
}

// ---------- boot ----------
function showApp() {
  $('login').classList.add('hidden');
  $('app').classList.remove('hidden');
  initMap();
  setTimeout(() => map.invalidateSize(), 50);
  refreshDevices();
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(refreshDevices, 10000); // refresh every 10s
}

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('login-error').textContent = '';
  try {
    await login($('username').value, $('password').value);
    showApp();
  } catch (err) {
    $('login-error').textContent = err.message;
  }
});
$('logout-btn').onclick = logout;
$('enroll-btn').onclick = createEnrollCode;

// try existing session
if (token) {
  api('/admin/devices').then(() => showApp()).catch(() => logout());
}

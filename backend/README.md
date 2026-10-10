# FamilyTrack Backend

Node.js + Express API. Stores data in SQLite via Node's built-in `node:sqlite`
(no native build step). Requires **Node 22+**.

## Setup

```bash
cd backend
npm install
node seed.js myadmin 'a-strong-password'   # create the admin login
npm start                                   # http://localhost:3000
```

The admin panel is served at `http://localhost:3000/`.

## API

### Admin (login required: `Authorization: Bearer <token>`)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/admin/login` | `{username,password}` → `{token}` |
| POST | `/api/admin/enroll-codes` | `{label}` → `{code}` — a 6-digit code to enroll one device |
| GET  | `/api/admin/devices` | all devices + latest position |
| GET  | `/api/admin/devices/:id/locations?limit=200` | location history |

### Device (device key required: `X-Device-Key: <apiKey>`)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/enroll` | `{code}` → `{deviceId, apiKey}` (no auth; consumes the code) |
| POST | `/api/locations` | `{lat,lng,accuracy?,speed?,battery?,recordedAt?}` |
| POST | `/api/device/admin-status` | `{active}` — reports Device Admin on/off |

## Enrollment flow

1. Admin logs in, calls `POST /api/admin/enroll-codes` → gets a 6-digit code.
2. On the child's phone, the Android app is opened and the code is entered.
3. The app calls `POST /api/enroll` and stores the returned `apiKey`.
4. From then on the app posts to `/api/locations` with that key.

Codes are single-use. API keys are per-device secrets — treat them as passwords.

## Quick manual test

```bash
# login
TOKEN=$(curl -s localhost:3000/api/admin/login -H 'content-type: application/json' \
  -d '{"username":"myadmin","password":"a-strong-password"}' | sed 's/.*"token":"//;s/".*//')
# make an enroll code
CODE=$(curl -s localhost:3000/api/admin/enroll-codes -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"label":"Test phone"}' | sed 's/.*"code":"//;s/".*//')
# enroll a device
KEY=$(curl -s localhost:3000/api/enroll -H 'content-type: application/json' \
  -d "{\"code\":\"$CODE\"}" | sed 's/.*"apiKey":"//;s/".*//')
# push a location
curl -s localhost:3000/api/locations -H "x-device-key: $KEY" \
  -H 'content-type: application/json' -d '{"lat":28.6139,"lng":77.2090,"battery":82}'
```

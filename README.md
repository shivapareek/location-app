# FamilyTrack — Parental Location Tracking

A **transparent parental-control** system that lets a parent/guardian (the "admin")
see the location of their family's devices on a map. Modelled on mainstream apps
such as Google Family Link and Life360.

> ⚠️ **Responsible use.** This is designed for a parent/legal guardian to monitor
> **their own minor children's** devices, or devices they own, **with the knowledge
> of the person carrying them**. The child app is *visible and not disguised*, and it
> shows a permanent notification whenever location is being shared — this is required
> by Android and is intentional. Installing tracking software on another adult's
> device, or any device, **without that person's knowledge and consent is illegal**
> in most countries (stalkerware) and is not a supported use of this project.

## What it does

- **Child/device app (Android, Kotlin):** reports GPS location to your server in the
  background via a foreground service, keeps running after the app is closed, and
  restarts after reboot. Optional **Device Admin** enrollment makes casual uninstall
  harder (the same mechanism Family Link uses) — the user is always shown this during
  setup.
- **Backend (Node.js):** receives location pings, authenticates devices, and exposes
  an admin API protected by login.
- **Admin panel (web):** only an authenticated admin can log in and see every enrolled
  device's latest position and history on a live map.

## Layout

```
backend/       Node.js + Express API + SQLite   (runnable here)
admin-panel/   Static web dashboard with Leaflet map
android-app/   Native Android child app (build with Android Studio / Gradle)
```

See each folder's README for setup. Start with `backend/README.md`.

# FamilyTrack — Android child/device app

Native Kotlin app that reports the device's location to your FamilyTrack server.

## Responsible use

This app is meant to be installed by a parent/guardian on **their own device or
their minor child's device, with the knowledge of the person who carries it**.
It is deliberately **not** hidden:

- The app has a normal launcher icon and name.
- A **permanent notification** is shown the whole time location is shared
  (Android requires this for background location — it is a feature, not a bug).
- Device Admin (uninstall protection) is only enabled after the user confirms it
  on a system screen, and can be turned off from
  **Settings → Security → Device admin apps**.

Installing location tracking on another person's device without their knowledge
is illegal in most countries. Don't do it.

## Build

Open the `android-app/` folder in **Android Studio** (Giraffe or newer) and let it
sync, or from the command line with a local Android SDK:

```bash
cd android-app
# point to your SDK (or set sdk.dir in local.properties)
./gradlew assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk
```

> This repo does not include the Gradle wrapper JAR (a binary). Generate it once
> with `gradle wrapper --gradle-version 8.7` or just open the project in Android
> Studio, which provides Gradle automatically.

## Setup on the device

1. Install and open the app.
2. Enter your **server URL** (e.g. `https://track.example.com`) and the **6-digit
   enrollment code** generated from the admin panel ("+ Add device").
3. Tap **Enroll this device** and grant location + notification permissions.
   For continuous background tracking, choose **Allow all the time** when Android
   asks for background location.
4. (Optional) Tap **Enable uninstall protection** and confirm on the system screen.

The device now reports its location roughly once a minute, continues after the
app is closed, and restarts after a reboot. The parent sees it in the admin panel.

## How the key requirements are met

| Requirement | How |
|-------------|-----|
| Track location on a map | `LocationForegroundService` → `POST /api/locations`; admin panel draws it with Leaflet |
| Install once | One-time enrollment stores a device API key in `SharedPreferences` |
| Hard to delete after admin access | `AdminReceiver` (Device Admin) blocks normal uninstall until disabled |
| Keeps tracking when app is closed | Foreground service with `START_STICKY` + boot receiver |
| Only admin sees everyone | Admin panel requires login; device keys can't read data |

## Files

- `MainActivity.kt` — enrollment, permissions, Device Admin toggle, status
- `LocationForegroundService.kt` — background location + upload
- `AdminReceiver.kt` — Device Admin (uninstall protection)
- `BootReceiver.kt` — restart after reboot
- `Api.kt` — HTTP calls to the backend
- `Prefs.kt` — stored server URL / device id / api key

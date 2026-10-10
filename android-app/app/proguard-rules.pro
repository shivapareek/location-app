# Keep Device Admin and boot receivers referenced from the manifest.
-keep class com.familytrack.locator.AdminReceiver { *; }
-keep class com.familytrack.locator.BootReceiver { *; }
-keep class com.familytrack.locator.LocationForegroundService { *; }

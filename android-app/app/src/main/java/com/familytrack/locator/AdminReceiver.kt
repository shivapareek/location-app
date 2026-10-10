package com.familytrack.locator

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.widget.Toast

/**
 * Device Admin receiver. While this admin is active, Android blocks a normal
 * uninstall of the app until the user first disables device administration.
 * This is the same, officially-supported mechanism used by Google Family Link.
 * It is NOT hidden: the user confirms it on a system screen and can revoke it
 * from Settings > Security > Device admin apps at any time.
 */
class AdminReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        Toast.makeText(context, "Location protection enabled", Toast.LENGTH_SHORT).show()
    }

    override fun onDisabled(context: Context, intent: Intent) {
        Toast.makeText(context, "Location protection disabled", Toast.LENGTH_SHORT).show()
    }

    /** Shown to the user on the system screen before they confirm disabling admin. */
    override fun onDisableRequested(context: Context, intent: Intent): CharSequence {
        return "Turning this off will allow the app to be uninstalled and location " +
               "sharing to stop."
    }
}

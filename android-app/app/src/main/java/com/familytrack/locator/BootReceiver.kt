package com.familytrack.locator

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.familytrack.locator.Prefs.isEnrolled

/** Restarts the location service after the phone reboots. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED && context.isEnrolled()) {
            LocationForegroundService.start(context)
        }
    }
}

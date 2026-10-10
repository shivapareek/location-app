package com.familytrack.locator

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.BatteryManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import com.familytrack.locator.Prefs.apiKey
import com.familytrack.locator.Prefs.serverUrl
import com.google.android.gms.location.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Foreground service that keeps reporting location even after the app's UI is
 * closed. Android requires a persistent, user-visible notification for this —
 * which is intentional: the person carrying the phone can always see that
 * location is being shared.
 */
class LocationForegroundService : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var fused: FusedLocationProviderClient
    private lateinit var callback: LocationCallback

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createChannel()
        startForeground(NOTIF_ID, buildNotification())
        fused = LocationServices.getFusedLocationProviderClient(this)
        startLocationUpdates()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // If killed by the system, ask Android to recreate it.
        return START_STICKY
    }

    private fun startLocationUpdates() {
        val request = LocationRequest.Builder(
            Priority.PRIORITY_BALANCED_POWER_ACCURACY,
            INTERVAL_MS
        ).setMinUpdateIntervalMillis(INTERVAL_MS / 2).build()

        callback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val loc = result.lastLocation ?: return
                val battery = batteryPercent()
                val url = serverUrl
                val key = apiKey
                if (url.isEmpty() || key.isEmpty()) return
                scope.launch {
                    try {
                        Api.sendLocation(
                            url, key,
                            loc.latitude, loc.longitude,
                            if (loc.hasAccuracy()) loc.accuracy else null,
                            if (loc.hasSpeed()) loc.speed else null,
                            battery,
                        )
                    } catch (e: Exception) {
                        Log.w(TAG, "upload failed: ${e.message}")
                    }
                }
            }
        }

        try {
            fused.requestLocationUpdates(request, callback, mainLooper)
        } catch (e: SecurityException) {
            Log.e(TAG, "missing location permission", e)
            stopSelf()
        }
    }

    private fun batteryPercent(): Int? {
        val bm = getSystemService(Context.BATTERY_SERVICE) as? BatteryManager ?: return null
        return bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID, "Location sharing", NotificationManager.IMPORTANCE_LOW
            ).apply { description = "Shown while FamilyTrack is sharing location" }
            (getSystemService(NotificationManager::class.java)).createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            Notification.Builder(this, CHANNEL_ID) else @Suppress("DEPRECATION") Notification.Builder(this)
        return builder
            .setContentTitle("FamilyTrack")
            .setContentText("Location is being shared with your family admin")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        if (::callback.isInitialized) fused.removeLocationUpdates(callback)
        scope.cancel()
        super.onDestroy()
    }

    companion object {
        private const val TAG = "FamilyTrackSvc"
        private const val CHANNEL_ID = "familytrack_location"
        private const val NOTIF_ID = 1001
        private const val INTERVAL_MS = 60_000L // report ~every minute

        fun start(context: Context) {
            val intent = Intent(context, LocationForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                context.startForegroundService(intent)
            else context.startService(intent)
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, LocationForegroundService::class.java))
        }
    }
}

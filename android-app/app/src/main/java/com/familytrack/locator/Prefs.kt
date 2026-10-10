package com.familytrack.locator

import android.content.Context

/** Simple persistent storage for the device's server URL, id and api key. */
object Prefs {
    private const val FILE = "familytrack"

    private fun p(ctx: Context) =
        ctx.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    var Context.serverUrl: String
        get() = p(this).getString("server_url", "") ?: ""
        set(v) { p(this).edit().putString("server_url", v).apply() }

    var Context.apiKey: String
        get() = p(this).getString("api_key", "") ?: ""
        set(v) { p(this).edit().putString("api_key", v).apply() }

    var Context.deviceId: String
        get() = p(this).getString("device_id", "") ?: ""
        set(v) { p(this).edit().putString("device_id", v).apply() }

    fun Context.isEnrolled(): Boolean =
        serverUrl.isNotEmpty() && apiKey.isNotEmpty()
}

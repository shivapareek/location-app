package com.familytrack.locator

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/** Minimal HTTP client using HttpURLConnection — no third-party networking libs. */
object Api {

    data class EnrollResult(val deviceId: String, val apiKey: String)

    /** POST /api/enroll with a 6-digit code. Returns device id + api key. */
    fun enroll(serverUrl: String, code: String, label: String): EnrollResult {
        val body = JSONObject().put("code", code).put("label", label).toString()
        val res = post("$serverUrl/api/enroll", body, null)
        val json = JSONObject(res)
        return EnrollResult(json.getString("deviceId"), json.getString("apiKey"))
    }

    /** POST /api/locations authenticated with the device key. */
    fun sendLocation(
        serverUrl: String, apiKey: String,
        lat: Double, lng: Double, accuracy: Float?, speed: Float?, battery: Int?,
    ) {
        val body = JSONObject().apply {
            put("lat", lat); put("lng", lng)
            accuracy?.let { put("accuracy", it) }
            speed?.let { put("speed", it) }
            battery?.let { put("battery", it) }
            put("recordedAt", nowIso())
        }.toString()
        post("$serverUrl/api/locations", body, apiKey)
    }

    /** Report whether Device Admin is currently active, for the parent to see. */
    fun reportAdminStatus(serverUrl: String, apiKey: String, active: Boolean) {
        val body = JSONObject().put("active", active).toString()
        post("$serverUrl/api/device/admin-status", body, apiKey)
    }

    private fun post(urlStr: String, body: String, deviceKey: String?): String {
        val conn = (URL(urlStr).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15000
            readTimeout = 15000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            deviceKey?.let { setRequestProperty("X-Device-Key", it) }
        }
        conn.outputStream.use { it.write(body.toByteArray()) }
        val code = conn.responseCode
        val stream = if (code in 200..299) conn.inputStream else conn.errorStream
        val text = stream?.bufferedReader()?.use { it.readText() } ?: ""
        conn.disconnect()
        if (code !in 200..299) throw RuntimeException("HTTP $code: $text")
        return text
    }

    private fun nowIso(): String {
        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
        sdf.timeZone = java.util.TimeZone.getTimeZone("UTC")
        return sdf.format(java.util.Date())
    }
}

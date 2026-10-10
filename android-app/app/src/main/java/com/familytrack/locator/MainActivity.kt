package com.familytrack.locator

import android.Manifest
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import androidx.lifecycle.lifecycleScope
import com.familytrack.locator.Prefs.apiKey
import com.familytrack.locator.Prefs.enrolledDeviceId
import com.familytrack.locator.Prefs.isEnrolled
import com.familytrack.locator.Prefs.serverUrl

class MainActivity : AppCompatActivity() {

    private lateinit var dpm: DevicePolicyManager
    private lateinit var adminComponent: ComponentName

    private val requestPermissions = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { grants ->
        val fine = grants[Manifest.permission.ACCESS_FINE_LOCATION] == true
        if (fine) {
            maybeRequestBackground()
            startSharing()
        } else {
            toast("Location permission is required to share location.")
        }
    }

    private val enableAdmin = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { render() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        adminComponent = ComponentName(this, AdminReceiver::class.java)

        findViewById<EditText>(R.id.serverUrl).setText(serverUrl)

        findViewById<Button>(R.id.enrollBtn).setOnClickListener { onEnrollClicked() }
        findViewById<Button>(R.id.adminBtn).setOnClickListener { onAdminClicked() }

        render()
        if (isEnrolled()) ensurePermissionsThenStart()
    }

    private fun onEnrollClicked() {
        val url = findViewById<EditText>(R.id.serverUrl).text.toString().trim().trimEnd('/')
        val code = findViewById<EditText>(R.id.code).text.toString().trim()
        if (url.isEmpty() || code.length != 6) {
            toast("Enter a server URL and a 6-digit code.")
            return
        }
        lifecycleScope.launch {
            try {
                val result = withContext(Dispatchers.IO) {
                    Api.enroll(url, code, Build.MODEL ?: "Android device")
                }
                serverUrl = url
                apiKey = result.apiKey
                enrolledDeviceId = result.deviceId
                toast("Enrolled successfully.")
                ensurePermissionsThenStart()
                render()
            } catch (e: Exception) {
                toast("Enroll failed: ${e.message}")
            }
        }
    }

    private fun ensurePermissionsThenStart() {
        val needed = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU)
            needed += Manifest.permission.POST_NOTIFICATIONS

        val missing = needed.filter {
            checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isEmpty()) { maybeRequestBackground(); startSharing() }
        else requestPermissions.launch(missing.toTypedArray())
    }

    /** Background location must be requested separately on Android 10+. */
    private fun maybeRequestBackground() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
            checkSelfPermission(Manifest.permission.ACCESS_BACKGROUND_LOCATION) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions.launch(arrayOf(Manifest.permission.ACCESS_BACKGROUND_LOCATION))
        }
    }

    private fun startSharing() {
        if (isEnrolled()) {
            LocationForegroundService.start(this)
            render()
        }
    }

    private fun onAdminClicked() {
        if (dpm.isAdminActive(adminComponent)) {
            // Let the user turn it off via the system settings screen.
            startActivity(Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN))
            toast("Open Settings > Security > Device admin apps to disable.")
        } else {
            val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
                putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent)
                putExtra(
                    DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                    getString(R.string.device_admin_description)
                )
            }
            enableAdmin.launch(intent)
        }
        reportAdminStatusAsync()
    }

    private fun reportAdminStatusAsync() {
        if (!isEnrolled()) return
        val active = dpm.isAdminActive(adminComponent)
        lifecycleScope.launch(Dispatchers.IO) {
            try { Api.reportAdminStatus(serverUrl, apiKey, active) } catch (_: Exception) {}
        }
    }

    private fun render() {
        val status = findViewById<TextView>(R.id.status)
        val adminBtn = findViewById<Button>(R.id.adminBtn)
        val adminOn = dpm.isAdminActive(adminComponent)
        adminBtn.text = if (adminOn) "Disable uninstall protection" else "Enable uninstall protection"
        status.text = buildString {
            append(if (isEnrolled()) "Enrolled ✓\n" else "Not enrolled yet.\n")
            if (isEnrolled()) append("Sharing location in the background.\n")
            append(if (adminOn) "Uninstall protection: ON" else "Uninstall protection: OFF")
        }
        reportAdminStatusAsync()
    }

    private fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_LONG).show()
}

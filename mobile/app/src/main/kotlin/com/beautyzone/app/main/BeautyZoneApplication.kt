package com.beautyzone.app.main

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import androidx.work.Configuration
import androidx.work.WorkManager
import androidx.hilt.work.HiltWorkerFactory
import com.beautyzone.app.background.WorkEnqueuer
import com.beautyzone.app.data.local.datastore.AppDataStore
import com.google.firebase.FirebaseApp
import javax.inject.Inject

@HiltAndroidApp
class BeautyZoneApplication : Application() {

    @Inject lateinit var workEnqueuer: WorkEnqueuer
    @Inject lateinit var appDataStore: AppDataStore

    override fun onCreate() {
        super.onCreate()

        // Firebase (Auth, Firestore, Storage, Messaging) is configured via
        // google-services.json — injected per environment, never committed.
        FirebaseApp.initializeApp(this)

        // WorkManager with Hilt's worker factory so @HiltWorker classes can
        // take constructor-injected dependencies.
        WorkManager.initialize(
            this,
            Configuration.Builder()
                .setWorkerFactory(HiltWorkerFactory(this))
                .build()
        )

        createNotificationChannels()

        // Periodic catalogue sync (network-constrained).
        workEnqueuer.enqueuePeriodicSalonSync()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannelIfMissing(
            "beauty_zone_reminders",
            getString(R.string.common_booking_reminder_channel),
            NotificationManager.IMPORTANCE_HIGH,
            getString(R.string.common_booking_reminder_description)
        )
        manager.createNotificationChannelIfMissing(
            "beauty_zone_fcm",
            getString(R.string.common_notification_channel_name),
            NotificationManager.IMPORTANCE_DEFAULT,
            getString(R.string.common_notification_channel_description)
        )
    }
}

private fun NotificationManager.createNotificationChannelIfMissing(
    id: String,
    name: String,
    importance: Int,
    description: String?
) {
    if (getNotificationChannel(id) != null) return
    createNotificationChannel(NotificationChannel(id, name, importance).apply {
        this.description = description
        enableVibration(true)
    })
}

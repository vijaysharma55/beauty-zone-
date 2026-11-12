package com.beautyzone.app.background

import androidx.work.Configuration
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.Constraints
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import com.beautyzone.app.background.workers.BookingReminderWorker
import com.beautyzone.app.background.workers.SalonSyncWorker
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Entry point for all WorkManager enqueuing. Kept as a single injectable class
 * so the rest of the app never calls WorkManager directly.
 *
 * Bookings are reminded {@value #REMINDER_BEFORE_MINUTES} minutes before
 * their start time; the salon catalogue sync runs every 6 hours when the
 * device is online.
 */
@Singleton
class WorkEnqueuer @Inject constructor(
    @ApplicationContext private val context: android.content.Context,
    private val workManager: WorkManager
) {

    internal const val REMINDER_BEFORE_MINUTES = 30L
    internal const val REMINDER_PREFIX = "booking_reminder_"
    internal const val SYNC_WORKER_NAME = "salon_sync_periodic"

    fun enqueueBookingReminder(bookingId: String, startAtMillis: Long) {
        val delayMillis = (startAtMillis - System.currentTimeMillis() - REMINDER_BEFORE_MINUTES * 60 * 1000L)
            .coerceAtLeast(0)
        val request = OneTimeWorkRequestBuilder<BookingReminderWorker>()
            .setInputData(workDataOf("bookingId" to bookingId))
            .setInitialDelay(delayMillis, TimeUnit.MILLISECONDS)
            .build()
        workManager.enqueueUniqueWork("${REMINDER_PREFIX}$bookingId", ExistingWorkPolicy.REPLACE, request)
    }

    fun cancelBookingReminder(bookingId: String) {
        workManager.cancelUniqueWork("${REMINDER_PREFIX}$bookingId")
    }

    fun enqueuePeriodicSalonSync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        val request = PeriodicWorkRequestBuilder<SalonSyncWorker>(6, TimeUnit.HOURS)
            .setConstraints(constraints)
            .build()
        workManager.enqueueUniquePeriodicWork(
            SYNC_WORKER_NAME,
            ExistingPeriodicWorkPolicy.REPLACE,
            request
        )
    }
}

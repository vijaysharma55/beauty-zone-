package com.beautyzone.app.background

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.beautyzone.app.R
import com.beautyzone.app.domain.model.Booking
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Shows local booking-reminder notifications. Requires the POST_NOTIFICATIONS
 * permission on Android 13+; failures are swallowed so a denied permission
 * never crashes the worker.
 */
@Singleton
class BookingReminderNotifier @Inject constructor(
    private val context: Context
) {

    private val manager by lazy { NotificationManagerCompat.from(context) }

    fun sendReminder(booking: Booking) {
        try {
            val channelId = "beauty_zone_reminders"
            createChannelIfNeeded(channelId)

            val intent = Intent(context, MainActivity::class.java).apply {
                action = "com.beautyzone.app.ACTION_VIEW_BOOKING"
                putExtra("booking_id", booking.id)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context, booking.id.hashCode(), intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val notification = NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(context.getString(R.string.booking_reminder_title))
                .setContentText("${booking.salonName} — ${booking.serviceName} at ${formatTime(booking.startAt)}")
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setContentIntent(pendingIntent)
                .build()

            manager.notify(booking.id.hashCode(), notification)
        } catch (e: Exception) {
            // Notification disabled or unavailable — worker still reports success.
        }
    }

    private fun createChannelIfNeeded(channelId: String) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (manager.getNotificationChannel(channelId) != null) return
        manager.createNotificationChannel(NotificationChannel(channelId,
            context.getString(R.string.common_booking_reminder_channel),
            NotificationManager.IMPORTANCE_HIGH).apply {
            description = context.getString(R.string.common_booking_reminder_description)
            enableVibration(true)
        })
    }

    private fun formatTime(millis: Long): String =
        java.text.SimpleDateFormat("hh:mm a", java.util.Locale.getDefault()).format(java.util.Date(millis))
}

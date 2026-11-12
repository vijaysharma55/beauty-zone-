package com.beautyzone.app.data.remote.firebase

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.beautyzone.app.R
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Handles FCM messages and registration tokens.
 *
 * The FCM token is cached in Preferences DataStore (same file as the app) so
 * the next app start can associate it with the signed-in user via
 * AuthRepository.saveFcmToken. Push messages are shown as local notifications;
 * tapping one opens the app.
 */
class BeautyZoneFirebaseMessagingService : FirebaseMessagingService() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private companion object {
        const val PREF_NAME = "beautyzone.preferences"
        const val FCM_TOKEN_KEY = "fcm_token"
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        scope.launch {
            val dataStore = applicationContext.createDataStore(PREF_NAME)
            dataStore.edit { it[stringPreferencesKey(FCM_TOKEN_KEY)] = token }
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        val notification = message.notification
        if (notification != null) {
            showNotification(
                title = notification.title ?: getString(R.string.app_name),
                body = notification.body ?: "",
                id = message.messageId?.hashCode() ?: 0
            )
        }
    }

    private fun showNotification(title: String, body: String, id: Int) {
        val channelId = "beauty_zone_fcm"
        val context = applicationContext
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (manager.getNotificationChannel(channelId) == null) {
                manager.createNotificationChannel(NotificationChannel(
                    channelId,
                    context.getString(R.string.common_notification_channel_name),
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = context.getString(R.string.common_notification_channel_description)
                }))
            }
        }

        val intent = Intent(context, com.beautyzone.app.MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            context, id, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .build()

        NotificationManagerCompat.from(context).notify(id, notification)
    }
}

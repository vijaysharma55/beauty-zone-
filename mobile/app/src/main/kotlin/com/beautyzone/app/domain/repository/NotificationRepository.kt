package com.beautyzone.app.domain.repository

import com.beautyzone.app.domain.model.Resource

interface NotificationRepository {

    /**
     * Current FCM registration token (cold flow; emits the cached token).
     */
    val fcmToken: Flow<String?>

    suspend fun getToken(): Resource<String>

    suspend fun subscribeToTopic(topic: String): Resource<Unit>

    suspend fun unsubscribeFromTopic(topic: String): Resource<Unit>

    /**
     * Enable / disable push notifications for this device (stored in
     * DataStore + reflected on the user profile).
     */
    suspend fun setNotificationsEnabled(enabled: Boolean): Resource<Unit>
    val notificationsEnabled: Flow<Boolean>
}

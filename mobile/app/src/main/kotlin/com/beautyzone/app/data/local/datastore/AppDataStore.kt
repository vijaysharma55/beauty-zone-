package com.beautyzone.app.data.local.datastore

import androidx.datastore.preferences.core.BooleanPreferencesKey
import androidx.datastore.preferences.core.DataStore
import androidx.datastore.preferences.core.LongPreferencesKey
import androidx.datastore.preferences.core.StringPreferencesKey
import androidx.datastore.preferences.core.edit
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

/**
 * Typed wrapper over Preferences DataStore. Holds runtime user preferences only
 * — never API keys, credentials, or long-lived secrets (the FCM token is cached
 * here as a convenience; Firebase Messaging remains the source of truth).
 */
class AppDataStore @Inject constructor(private val dataStore: DataStore<Preferences>) {

    companion object {
        val NOTIFICATIONS_ENABLED = BooleanPreferencesKey("notifications_enabled")
        val FCM_TOKEN = StringPreferencesKey("fcm_token")
        val LAST_SYNC_MILLIS = LongPreferencesKey("last_sync_millis")
        val USER_PHONE = StringPreferencesKey("user_phone")
        val THEME_DARK_MODE = BooleanPreferencesKey("theme_dark_mode")
        val LAST_VERIFICATION_ID = StringPreferencesKey("last_verification_id")
    }

    suspend fun setNotificationsEnabled(enabled: Boolean) {
        dataStore.edit { it[NOTIFICATIONS_ENABLED] = enabled }
    }

    val notificationsEnabled: Flow<Boolean> =
        dataStore.data.map { it[NOTIFICATIONS_ENABLED] ?: true }

    suspend fun setFcmToken(token: String?) {
        dataStore.edit { it[FCM_TOKEN] = token }
    }

    val fcmToken: Flow<String?> = dataStore.data.map { it[FCM_TOKEN] }

    suspend fun setLastSync(millis: Long) {
        dataStore.edit { it[LAST_SYNC_MILLIS] = millis }
    }

    val lastSync: Flow<Long> = dataStore.data.map { it[LAST_SYNC_MILLIS] ?: 0L }

    suspend fun setUserPhone(phone: String?) {
        dataStore.edit { it[USER_PHONE] = phone }
    }

    val userPhone: Flow<String?> = dataStore.data.map { it[USER_PHONE] }

    suspend fun setVerificationId(id: String?) {
        dataStore.edit { it[LAST_VERIFICATION_ID] = id }
    }

    val verificationId: Flow<String?> = dataStore.data.map { it[LAST_VERIFICATION_ID] }
}

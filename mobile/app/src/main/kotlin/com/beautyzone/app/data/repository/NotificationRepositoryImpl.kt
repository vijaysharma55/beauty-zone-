package com.beautyzone.app.data.repository

import com.beautyzone.app.data.local.datastore.AppDataStore
import com.beautyzone.app.data.remote.firebase.FirebaseMessagingDataSource
import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.repository.NotificationRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers
import javax.inject.Inject

class NotificationRepositoryImpl @Inject constructor(
    private val messagingDataSource: FirebaseMessagingDataSource,
    private val appDataStore: AppDataStore,
    private val authRepository: com.beautyzone.app.domain.repository.AuthRepository
) : NotificationRepository {

    override val fcmToken: Flow<String?> = messagingDataSource.tokenFlow

    override suspend fun getToken(): Resource<String> =
        try {
            Resource.Success(messagingDataSource.getToken() ?: throw IllegalStateException("No FCM token"))
        } catch (e: Exception) {
            Resource.Error(e)
        }

    override suspend fun subscribeToTopic(topic: String): Resource<Unit> =
        try {
            messagingDataSource.subscribeToTopic(topic)
            Resource.Success(Unit)
        } catch (e: Exception) {
            Resource.Error(e)
        }

    override suspend fun unsubscribeFromTopic(topic: String): Resource<Unit> =
        try {
            messagingDataSource.unsubscribeFromTopic(topic)
            Resource.Success(Unit)
        } catch (e: Exception) {
            Resource.Error(e)
        }

    override suspend fun setNotificationsEnabled(enabled: Boolean): Resource<Unit> =
        withContext(Dispatchers.IO) {
            try {
                appDataStore.setNotificationsEnabled(enabled)
                val currentUser = authRepository.getCurrentUser()
                if (currentUser != null && enabled) {
                    messagingDataSource.subscribeToTopic("user_${currentUser.id}")
                }
                Resource.Success(Unit)
            } catch (e: Exception) {
                Resource.Error(e)
            }
        }

    override val notificationsEnabled: Flow<Boolean> = appDataStore.notificationsEnabled
}

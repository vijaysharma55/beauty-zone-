package com.beautyzone.app.data.remote.firebase

import com.google.android.gms.tasks.Tasks
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject

class FirebaseMessagingDataSource @Inject constructor(
    private val messaging: FirebaseMessaging
) {

    suspend fun getToken(): String? = Tasks.await(messaging.token, 10, java.util.concurrent.TimeUnit.SECONDS)

    val tokenFlow: Flow<String?> = flow {
        emit(Tasks.await(messaging.token, 10, java.util.concurrent.TimeUnit.SECONDS))
    }

    suspend fun subscribeToTopic(topic: String) =
        Tasks.await(messaging.subscribeToTopic(topic), 10, java.util.concurrent.TimeUnit.SECONDS)

    suspend fun unsubscribeFromTopic(topic: String) =
        Tasks.await(messaging.unsubscribeFromTopic(topic), 10, java.util.concurrent.TimeUnit.SECONDS)

    suspend fun deleteToken() =
        Tasks.await(messaging.deleteToken(), 10, java.util.concurrent.TimeUnit.SECONDS)
}

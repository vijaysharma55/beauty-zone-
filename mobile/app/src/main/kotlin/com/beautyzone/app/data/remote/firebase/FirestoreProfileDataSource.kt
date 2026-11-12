package com.beautyzone.app.data.remote.firebase

import com.beautyzone.app.domain.model.User
import com.google.android.gms.tasks.Tasks
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import javax.inject.Inject

class FirestoreProfileDataSource @Inject constructor(
    private val firestore: FirebaseFirestore,
    private val auth: FirebaseAuth
) {

    private val userCollection = firestore.collection("users")

    private val currentUserId: String
        get() = auth.currentUser?.uid
            ?: throw IllegalStateException("No signed-in user")

    suspend fun getProfile(userId: String): User? {
        val doc = Tasks.await(
            userCollection.document(userId).get(),
            10,
            java.util.concurrent.TimeUnit.SECONDS
        )
        return doc.toUser()
    }

    suspend fun updateProfile(user: User): User {
        Tasks.await(
            userCollection.document(user.id).update(mapOf(
                "name" to user.name,
                "email" to user.email,
                "photoUrl" to user.photoUrl,
                "notificationsEnabled" to user.notificationsEnabled,
                "updatedAt" to FieldValue.serverTimestamp()
            )),
            10,
            java.util.concurrent.TimeUnit.SECONDS
        )
        return user
    }

    suspend fun setDocumentUrl(userId: String, downloadUrl: String) {
        Tasks.await(
            userCollection.document(userId).update(mapOf(
                "documentUrl" to downloadUrl,
                "documentUploadedAt" to FieldValue.serverTimestamp()
            )),
            10,
            java.util.concurrent.TimeUnit.SECONDS
        )
    }

    suspend fun ensureCurrentUserProfile(user: User) {
        val doc = Tasks.await(
            userCollection.document(user.id).get(),
            10,
            java.util.concurrent.TimeUnit.SECONDS
        )
        if (!doc.exists()) {
            Tasks.await(
                userCollection.document(user.id).set(mapOf(
                    "id" to user.id,
                    "phone" to user.phone,
                    "name" to user.name,
                    "email" to user.email,
                    "photoUrl" to user.photoUrl,
                    "fcmToken" to user.fcmToken,
                    "notificationsEnabled" to user.notificationsEnabled,
                    "createdAt" to FieldValue.serverTimestamp()
                )),
                10,
                java.util.concurrent.TimeUnit.SECONDS
            )
        }
    }
}

private fun com.google.firebase.firestore.DocumentSnapshot.toUser(): User? {
    val id = id ?: return null
    return User(
        id = id,
        phone = getString("phone") ?: "",
        name = getString("name"),
        email = getString("email"),
        photoUrl = getString("photoUrl"),
        fcmToken = getString("fcmToken"),
        createdAt = getLong("createdAt") ?: System.currentTimeMillis(),
        notificationsEnabled = getBoolean("notificationsEnabled") ?: true
    )
}

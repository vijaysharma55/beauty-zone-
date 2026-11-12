package com.beautyzone.app.domain.repository

import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.model.User
import kotlinx.coroutines.flow.Flow

interface AuthRepository {

    /**
     * Request an OTP via Firebase Auth phone verification. Returns the
     * verification id (used by [verifyOtp]) wrapped in Resource.
     */
    suspend fun sendOtp(phone: String): Resource<String>

    /**
     * Verify the 6-digit OTP and sign the user in / create the account.
     */
    suspend fun verifyOtp(phone: String, otp: String, verificationId: String): Resource<User>

    /**
     * Signed-in user, or null when signed out. Emits initially and on every
     * auth state change.
     */
    val currentUser: Flow<User?>

    /**
     * One-shot emission of the current user without subscribing to state
     * changes.
     */
    suspend fun getCurrentUser(): User?

    suspend fun signOut(): Resource<Unit>

    /**
     * Persist the FCM device token against the user record (for targeted
     * push notifications).
     */
    suspend fun saveFcmToken(token: String): Resource<Unit>
}

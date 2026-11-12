package com.beautyzone.app.data.repository

import android.app.Application
import androidx.datastore.preferences.core.DataStore
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.model.User
import com.beautyzone.app.domain.repository.AuthRepository
import com.beautyzone.app.util.Extensions.mapToUser
import com.google.android.gms.tasks.Tasks
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseException
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import com.google.firebase.auth.ktx.authState
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import javax.inject.Inject
import javax.inject.Named
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

class AuthRepositoryImpl @Inject constructor(
    private val application: Application,
    private val auth: FirebaseAuth,
    private val firestore: FirebaseFirestore,
    private val dataStore: DataStore<androidx.datastore.preferences.core.Preferences>,
    @Named("IoDispatcher") private val ioDispatcher: CoroutineDispatcher
) : AuthRepository {

    companion object {
        private const val VERIFICATION_ID_KEY = "auth_verification_id"
        private const val USER_ID_KEY = "auth_user_id"
        private const val FCM_TOKEN_KEY = "fcm_token"
        private const val VERIFY_TIMEOUT_SECONDS = 60L
    }

    override suspend fun sendOtp(phone: String): Resource<String> =
        withContext(ioDispatcher) {
            try {
                val verificationId = sendPhoneOtp(phone)
                dataStore.edit { it[stringPreferencesKey(VERIFICATION_ID_KEY)] = verificationId }
                Resource.Success(verificationId)
            } catch (e: Exception) {
                Resource.Error(e)
            }
        }

    private suspend fun sendPhoneOtp(phone: String): String =
        kotlinx.coroutines.suspendCancellableCoroutine { cont ->
            val callbacks = object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
                override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                    // Auto-retrieval succeeded; caller can sign in with this credential.
                    cont.resume(credential.id)
                }

                override fun onVerificationFailed(e: FirebaseException) {
                    cont.resumeWith(kotlin.Result.failure(e))
                }

                override fun onCodeSent(
                    verificationId: String,
                    token: PhoneAuthProvider.ForceResendingToken
                ) {
                    cont.resume(verificationId)
                }

                override fun onCodeAutoRetrievalTimeout(verificationId: String) {
                    cont.resume(verificationId)
                }
            }
            auth.verifyPhoneNumber(
                PhoneAuthOptions.newBuilder(auth)
                    .setPhoneNumber(phone)
                    .setTimeout(VERIFY_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                    .setCallbacks(callbacks)
                    .build()
            )
        }

    override suspend fun verifyOtp(phone: String, otp: String, verificationId: String): Resource<User> =
        withContext(ioDispatcher) {
            try {
                val credential = PhoneAuthProvider.getCredential(verificationId, otp)
                val result = Tasks.await(auth.signInWithCredential(credential), 60, TimeUnit.SECONDS)
                val firebaseUser = result.user ?: throw IllegalStateException("No user returned")
                val user = firebaseUser.mapToUser()
                dataStore.edit { it[stringPreferencesKey(USER_ID_KEY)] = user.id }
                Resource.Success(user)
            } catch (e: Exception) {
                Resource.Error(e)
            }
        }

    override val currentUser: kotlinx.coroutines.flow.Flow<User?> =
        auth.authState.map { firebaseUser ->
            firebaseUser?.mapToUser()
        }

    override suspend fun getCurrentUser(): User? =
        auth.currentUser?.mapToUser()

    override suspend fun signOut(): Resource<Unit> =
        withContext(ioDispatcher) {
            try {
                auth.signOut()
                dataStore.edit {
                    it[stringPreferencesKey(USER_ID_KEY)] = null
                    it[stringPreferencesKey(VERIFICATION_ID_KEY)] = null
                    it[stringPreferencesKey(FCM_TOKEN_KEY)] = null
                }
                Resource.Success(Unit)
            } catch (e: Exception) {
                Resource.Error(e)
            }
        }

    override suspend fun saveFcmToken(token: String): Resource<Unit> =
        withContext(ioDispatcher) {
            try {
                val userId = auth.currentUser?.uid
                    ?: throw IllegalStateException("Not signed in")
                firestore.collection("users").document(userId)
                    .update("fcmToken", token, "updatedAt", FieldValue.serverTimestamp())
                dataStore.edit { it[stringPreferencesKey(FCM_TOKEN_KEY)] = token }
                Resource.Success(Unit)
            } catch (e: Exception) {
                Resource.Error(e)
            }
        }
}

/**
 * Maps a Firebase user record to the pure domain User model. Kept in the data
 * layer so the domain never imports Firebase types.
 */
fun com.google.firebase.auth.FirebaseUser.mapToUser(): User =
    User(
        id = uid,
        phone = phoneNumber ?: "",
        name = displayName,
        email = email,
        photoUrl = photoUrl?.toString(),
        createdAt = metadata.creationTimestamp,
        notificationsEnabled = true
    )

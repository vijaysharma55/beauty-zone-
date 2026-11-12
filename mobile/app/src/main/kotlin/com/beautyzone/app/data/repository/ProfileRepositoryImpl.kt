package com.beautyzone.app.data.repository

import com.beautyzone.app.data.local.datastore.AppDataStore
import com.beautyzone.app.data.remote.firebase.FirebaseStorageDataSource
import com.beautyzone.app.data.remote.firebase.FirestoreProfileDataSource
import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.model.User
import com.beautyzone.app.domain.repository.ProfileRepository
import javax.inject.Inject

class ProfileRepositoryImpl @Inject constructor(
    private val firestoreProfileDataSource: FirestoreProfileDataSource,
    private val storageDataSource: FirebaseStorageDataSource,
    private val appDataStore: AppDataStore
) : ProfileRepository {

    override suspend fun getProfile(userId: String): Resource<User> =
        try {
            val user = firestoreProfileDataSource.getProfile(userId)
                ?: throw IllegalStateException("Profile not found")
            Resource.Success(user)
        } catch (e: Exception) {
            Resource.Error(e)
        }

    override suspend fun updateProfile(user: User): Resource<User> =
        try {
            val updated = firestoreProfileDataSource.updateProfile(user)
            Resource.Success(updated)
        } catch (e: Exception) {
            Resource.Error(e)
        }

    override suspend fun uploadDocument(userId: String, filePath: String, fileName: String): Resource<String> =
        try {
            val downloadUrl = storageDataSource.uploadDocument(userId, filePath, fileName)
            // Store the document URL on the profile so the salon/staff can verify it.
            firestoreProfileDataSource.setDocumentUrl(userId, downloadUrl)
            Resource.Success(downloadUrl)
        } catch (e: Exception) {
            Resource.Error(e)
        }
}

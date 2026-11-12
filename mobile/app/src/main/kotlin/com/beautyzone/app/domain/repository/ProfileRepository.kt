package com.beautyzone.app.domain.repository

import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.model.User

interface ProfileRepository {

    suspend fun getProfile(userId: String): Resource<User>

    suspend fun updateProfile(user: User): Resource<User>

    /**
     * Upload an identity/document file to Firebase Storage and return the
     * download URL to be stored on the user profile.
     */
    suspend fun uploadDocument(userId: String, filePath: String, fileName: String): Resource<String>
}

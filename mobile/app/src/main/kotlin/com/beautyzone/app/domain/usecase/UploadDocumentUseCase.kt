package com.beautyzone.app.domain.usecase

import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.repository.ProfileRepository

data class UploadDocumentParams(
    val userId: String,
    val filePath: String, // content URI or file path string
    val fileName: String
)

class UploadDocumentUseCase(
    private val profileRepository: ProfileRepository
) : UseCase<UploadDocumentParams, String>() {

    override suspend fun invoke(params: UploadDocumentParams): Resource<String> =
        profileRepository.uploadDocument(params.userId, params.filePath, params.fileName)
}

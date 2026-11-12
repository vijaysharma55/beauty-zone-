package com.beautyzone.app.domain.usecase

import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.repository.AuthRepository

class SaveFcmTokenUseCase(
    private val authRepository: AuthRepository
) : UseCase<String, Unit>() {

    override suspend fun invoke(params: String): Resource<Unit> =
        authRepository.saveFcmToken(params)
}

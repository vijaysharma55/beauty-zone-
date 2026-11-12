package com.beautyzone.app.domain.usecase

import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.repository.AuthRepository

class SendOtpUseCase(
    private val authRepository: AuthRepository
) : UseCase<String, String>() {

    override suspend fun invoke(params: String): Resource<String> =
        authRepository.sendOtp(params)
}

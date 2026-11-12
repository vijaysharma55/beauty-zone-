package com.beautyzone.app.domain.usecase

import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.model.User
import com.beautyzone.app.domain.repository.AuthRepository

data class OtpParams(val phone: String, val otp: String, val verificationId: String)

class VerifyOtpUseCase(
    private val authRepository: AuthRepository
) : UseCase<OtpParams, User>() {

    override suspend fun invoke(params: OtpParams): Resource<User> =
        authRepository.verifyOtp(params.phone, params.otp, params.verificationId)
}

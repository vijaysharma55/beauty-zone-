package com.beautyzone.app.domain.usecase

import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.model.User
import com.beautyzone.app.domain.repository.AuthRepository

class GetCurrentUserUseCase(
    private val authRepository: AuthRepository
) : UseCase<NoParams, User>() {

    override suspend fun invoke(params: NoParams): Resource<User> {
        val user = authRepository.getCurrentUser()
            ?: throw IllegalStateException("No signed-in user")
        return Resource.Success(user)
    }
}

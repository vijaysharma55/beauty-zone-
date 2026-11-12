package com.beautyzone.app.domain.usecase

import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.model.User
import com.beautyzone.app.domain.repository.ProfileRepository

class UpdateProfileUseCase(
    private val profileRepository: ProfileRepository
) : UseCase<User, User>() {

    override suspend fun invoke(params: User): Resource<User> =
        profileRepository.updateProfile(params)
}

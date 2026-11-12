package com.beautyzone.app.domain.usecase

import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.model.Service
import com.beautyzone.app.domain.repository.SalonRepository

class GetSalonServicesUseCase(
    private val salonRepository: SalonRepository
) : UseCase<String, List<Service>>() {

    override suspend fun invoke(params: String): Resource<List<Service>> =
        salonRepository.getSalonServices(params)
}

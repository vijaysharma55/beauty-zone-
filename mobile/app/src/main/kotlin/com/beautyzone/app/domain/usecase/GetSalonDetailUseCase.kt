package com.beautyzone.app.domain.usecase

import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.model.Salon
import com.beautyzone.app.domain.repository.SalonRepository

class GetSalonDetailUseCase(
    private val salonRepository: SalonRepository
) : UseCase<String, Salon>() {

    override suspend fun invoke(params: String): Resource<Salon> =
        salonRepository.getSalonDetail(params)
}

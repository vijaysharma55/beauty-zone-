package com.beautyzone.app.domain.usecase

import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.model.Salon
import com.beautyzone.app.domain.repository.SalonRepository

data class SalonSearchParams(
    val lat: Double? = null,
    val lng: Double? = null,
    val query: String? = null,
    val limit: Int = 20
)

class SearchSalonsUseCase(
    private val salonRepository: SalonRepository
) : UseCase<SalonSearchParams, List<Salon>>() {

    override suspend fun invoke(params: SalonSearchParams): Resource<List<Salon>> =
        salonRepository.searchSalons(params.lat, params.lng, params.query, params.limit)
}

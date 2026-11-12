package com.beautyzone.app.domain.usecase

import com.beautyzone.app.domain.model.Coordinate
import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.model.RouteResult
import com.beautyzone.app.domain.repository.MapRepository

data class DirectionsParams(
    val origin: Coordinate,
    val destination: Coordinate,
    val mode: String = "driving"
)

class GetDirectionsUseCase(
    private val mapRepository: MapRepository
) : UseCase<DirectionsParams, RouteResult>() {

    override suspend fun invoke(params: DirectionsParams): Resource<RouteResult> =
        mapRepository.getDirections(params.origin, params.destination, params.mode)
}

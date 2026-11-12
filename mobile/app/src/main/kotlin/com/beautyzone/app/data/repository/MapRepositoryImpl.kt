package com.beautyzone.app.data.repository

import com.beautyzone.app.data.remote.firebase.directions.DirectionsProxyDataSource
import com.beautyzone.app.domain.model.Coordinate
import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.model.RouteResult
import com.beautyzone.app.domain.repository.MapRepository
import javax.inject.Inject

class MapRepositoryImpl @Inject constructor(
    private val directionsProxyDataSource: DirectionsProxyDataSource
) : MapRepository {

    override suspend fun getDirections(
        origin: Coordinate,
        destination: Coordinate,
        mode: String = "driving"
    ): Resource<RouteResult> =
        try {
            Resource.Success(
                directionsProxyDataSource.getDirections(origin, destination, mode)
            )
        } catch (e: Exception) {
            Resource.Error(e)
        }
}

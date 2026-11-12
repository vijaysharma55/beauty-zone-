package com.beautyzone.app.domain.repository

import com.beautyzone.app.domain.model.Coordinate
import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.model.RouteResult

interface MapRepository {

    /**
     * Route between two coordinates via the backend-protected Directions proxy
     * (Google Directions API key stays on the server).
     */
    suspend fun getDirections(
        origin: Coordinate,
        destination: Coordinate,
        mode: String = "driving"
    ): Resource<RouteResult>
}

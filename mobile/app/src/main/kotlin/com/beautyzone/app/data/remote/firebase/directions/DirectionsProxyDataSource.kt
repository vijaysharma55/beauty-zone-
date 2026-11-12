package com.beautyzone.app.data.remote.firebase.directions

import com.beautyzone.app.domain.model.Coordinate
import com.beautyzone.app.domain.model.RouteResult
import com.beautyzone.app.network.directions.DirectionsApi
import com.google.gson.Gson
import javax.inject.Inject

/**
 * Calls Google Directions API through the backend proxy
 * (`GET /api/maps/directions`). The Directions API key lives only on the
 * backend — the mobile client never sees it.
 */
class DirectionsProxyDataSource @Inject constructor(
    private val directionsApi: DirectionsApi,
    private val gson: Gson = Gson()
) {

    suspend fun getDirections(origin: Coordinate, destination: Coordinate, mode: String): RouteResult {
        val originStr = "${origin.latitude},${origin.longitude}"
        val destinationStr = "${destination.latitude},${destination.longitude}"
        val response = directionsApi.getDirections(originStr, destinationStr, mode)

        if (!response.isSuccessful || response.body() == null) {
            throw RuntimeException("Directions request failed: HTTP ${response.code}")
        }

        val parsed = gson.fromJson(response.body()!!, DirectionsResponse::class.java)
        val route = parsed.routes.firstOrNull()
            ?: throw RuntimeException("No routes returned")
        val leg = route.legs.firstOrNull()
            ?: throw RuntimeException("No route legs returned")

        return RouteResult(
            polyline = decodePolyline(route.overviewPolyline.points),
            distanceMeters = leg.distance?.value ?: 0L,
            durationSeconds = leg.duration?.value ?: 0L
        )
    }

    /**
     * Decodes a Google-encoded polyline string into a list of coordinates.
     */
    private fun decodePolyline(encoded: String): List<Coordinate> {
        val polylineCoordinates = mutableListOf<Coordinate>()
        var index = 0
        var lat = 0
        var lng = 0
        while (index < encoded.length) {
            var result = 1
            var shift = 0
            var b: Int
            repeat(5) {
                b = encoded.codePointAt(index) - 63
                index++
                result += (b and 0x1F) shl shift
                shift += 5
                if (b < 0x20) break
            }
            if ((result and 1) != 0) result = ~(result shr 1)
            lat += result

            result = 1
            shift = 0
            repeat(5) {
                b = encoded.codePointAt(index) - 63
                index++
                result += (b and 0x1F) shl shift
                shift += 5
                if (b < 0x20) break
            }
            if ((result and 1) != 0) result = ~(result shr 1)
            lng += result

            polylineCoordinates.add(Coordinate(lat / 1E5, lng / 1E5))
        }
        return polylineCoordinates
    }
}

// ---------------------------------------------------------------------------
// Google Directions API response DTOs (proxy returns the raw Google JSON)
// ---------------------------------------------------------------------------

data class DirectionsResponse(
    val routes: List<DirectionsRoute> = emptyList(),
    val status: String? = null,
    val errorMessage: String? = null
)

data class DirectionsRoute(
    val overviewPolyline: DirectionsPolyline? = null,
    val legs: List<DirectionsLeg> = emptyList()
)

data class DirectionsPolyline(val points: String? = null)

data class DirectionsLeg(
    val distance: DirectionsDistance? = null,
    val duration: DirectionsDuration? = null
)

data class DirectionsDistance(val value: Long? = null)
data class DirectionsDuration(val value: Long? = null)

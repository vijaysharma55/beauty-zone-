package com.beautyzone.app.network.directions

import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

/**
 * Thin Retrofit interface for the directions proxy endpoint. The response is
 * the raw Google Directions JSON (as a String), parsed in the data layer.
 * Kept separate from BeautyZoneApi so a mock server can be swapped in for
 * the maps module in tests.
 */
interface DirectionsApi {

    @GET("/api/maps/directions")
    suspend fun getDirections(
        @Query("origin") origin: String,
        @Query("destination") destination: String,
        @Query("mode") mode: String? = "driving"
    ): Response<String>
}

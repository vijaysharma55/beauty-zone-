package com.beautyzone.app.network

import com.beautyzone.app.network.dto.BookingDto
import com.beautyzone.app.network.dto.CreateBookingRequest
import com.beautyzone.app.network.dto.SalonListDto
import com.beautyzone.app.network.dto.SalonDto
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * BeautyZone backend API (our own server — see repo `server/`).
 *
 * Endpoints used by the app:
 *   GET    /api/public/salons          public salon catalog
 *   GET    /api/public/salons/:slug    single salon public page data
 *   POST   /api/public/bookings        customer booking intake
 *   GET    /api/maps/directions        server-side proxy to Google Directions API
 *
 * The base URL is injected via BuildConfig (local.properties / CI secrets).
 */
interface BeautyZoneApi {

    @GET("/api/public/salons")
    suspend fun listSalons(
        @Query("city") city: String? = null,
        @Query("lat") lat: Double? = null,
        @Query("lng") lng: Double? = null,
        @Query("limit") limit: Int = 20
    ): Response<SalonListDto>

    @GET("/api/public/salons/{slug}")
    suspend fun getSalon(@Path("slug") slug: String): Response<SalonDto>

    @POST("/api/public/bookings")
    suspend fun createBooking(@Body request: CreateBookingRequest): Response<BookingDto>

    /**
     * Server-side proxy to the Google Directions API. The backend adds the
     * Directions key, so the mobile client never touches it.
     */
    @GET("/api/maps/directions")
    suspend fun getDirections(
        @Query("origin") origin: String,
        @Query("destination") destination: String,
        @Query("mode") mode: String? = "driving"
    ): Response<ResponseBody>
}

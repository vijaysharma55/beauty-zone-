package com.beautyzone.app.data.remote.retrofit

import com.beautyzone.app.network.BeautyZoneApi
import com.beautyzone.app.network.dto.CreateBookingRequest
import retrofit2.Response
import javax.inject.Inject
import javax.inject.Named

/**
 * Thin Retrofit client for the BeautyZone backend. Used for:
 *   * public salon catalog (fallback / legacy mirror)
 *   * booking intake mirror (secondary write path)
 *
 * All calls go through the auth/connectivity OkHttp interceptors configured in
 * NetworkModule; the Firebase ID token is attached automatically for
 * authenticated endpoints. Google Directions calls go through
 * DirectionsProxyDataSource so the Directions key never reaches the client.
 */
class BeautyZoneRetrofitDataSource @Inject constructor(
    @Named("BeautyZoneApi") private val api: BeautyZoneApi
) {

    suspend fun listSalons(city: String? = null, lat: Double? = null, lng: Double? = null, limit: Int = 20): Response<com.beautyzone.app.network.dto.SalonListDto> =
        api.listSalons(city = city, lat = lat, lng = lng, limit = limit)

    suspend fun getSalon(slug: String): Response<com.beautyzone.app.network.dto.SalonDto> =
        api.getSalon(slug)

    /**
     * Mirrors a Firestore-created booking into the legacy backend booking
     * intake (best-effort; failures are swallowed by the repository).
     */
    suspend fun createBookingMirror(
        salonId: String,
        serviceId: String,
        staffId: String?,
        startAtIso: String,
        endAtIso: String,
        notes: String?
    ): Response<com.beautyzone.app.network.dto.BookingDto> =
        api.createBooking(
            CreateBookingRequest(
                salonId = salonId,
                serviceId = serviceId,
                staffId = staffId,
                startAt = startAtIso,
                endAt = endAtIso,
                notes = notes
            )
        )
}

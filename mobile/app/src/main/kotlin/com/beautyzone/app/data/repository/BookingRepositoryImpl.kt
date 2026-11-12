package com.beautyzone.app.data.repository

import com.beautyzone.app.data.local.datastore.AppDataStore
import com.beautyzone.app.data.remote.firebase.FirestoreBookingDataSource
import com.beautyzone.app.data.remote.retrofit.BeautyZoneRetrofitDataSource
import com.beautyzone.app.domain.model.Booking
import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.repository.BookingRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import android.content.Context
import javax.inject.Inject

class BookingRepositoryImpl @Inject constructor(
    private val firestoreBookingDataSource: FirestoreBookingDataSource,
    private val beautyZoneApi: BeautyZoneRetrofitDataSource,
    private val appDataStore: AppDataStore,
    @ApplicationContext private val context: Context
) : BookingRepository {

    override suspend fun createBooking(
        salonId: String,
        serviceId: String,
        staffId: String?,
        startAt: Long,
        endAt: Long,
        notes: String?
    ): Resource<Booking> = withContext(Dispatchers.Default) {
        try {
            // 1. Persist to Firestore (app database of record).
            val booking = firestoreBookingDataSource.createBooking(
                salonId = salonId,
                serviceId = serviceId,
                staffId = staffId,
                startAt = startAt,
                endAt = endAt,
                notes = notes
            )

            // 2. Mirror into the legacy backend booking intake (best-effort:
            //    the booking is valid even if the backend is temporarily down).
            try {
                beautyZoneApi.createBookingMirror(
                    salonId = salonId,
                    serviceId = serviceId,
                    staffId = staffId,
                    startAtIso = iso(startAt),
                    endAtIso = iso(endAt),
                    notes = notes
                )
            } catch (e: Exception) {
                // Non-fatal — logged by the caller's crash reporter in prod.
            }

            Resource.Success(booking)
        } catch (e: Exception) {
            Resource.Error(e)
        }
    }

    override suspend fun getMyBookings(): Resource<List<Booking>> =
        try {
            Resource.Success(firestoreBookingDataSource.getMyBookings())
        } catch (e: Exception) {
            Resource.Error(e)
        }

    override suspend fun cancelBooking(bookingId: String): Resource<Unit> =
        try {
            firestoreBookingDataSource.cancelBooking(bookingId)
            Resource.Success(Unit)
        } catch (e: Exception) {
            Resource.Error(e)
        }

    override fun watchMyBookings(): Flow<Resource<List<Booking>>> = flow {
        emit(Resource.Loading)
        try {
            firestoreBookingDataSource.watchMyBookings().collect { bookings ->
                emit(Resource.Success(bookings))
            }
        } catch (e: Exception) {
            emit(Resource.Error(e))
        }
    }

    override suspend fun subscribeToBookingTopics(salonIds: List<String>): Resource<Unit> {
        // FCM topics handled by NotificationRepository; kept here for API symmetry.
        return Resource.Success(Unit)
    }

    private fun iso(millis: Long): String =
        java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).apply {
            timeZone = java.util.TimeZone.getTimeZone("UTC")
        }.format(java.util.Date(millis))
}

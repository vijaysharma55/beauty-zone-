package com.beautyzone.app.domain.repository

import com.beautyzone.app.domain.model.Booking
import com.beautyzone.app.domain.model.Resource
import kotlinx.coroutines.flow.Flow

interface BookingRepository {

    suspend fun createBooking(
        salonId: String,
        serviceId: String,
        staffId: String?,
        startAt: Long,
        endAt: Long,
        notes: String?
    ): Resource<Booking>

    suspend fun getMyBookings(): Resource<List<Booking>>

    suspend fun cancelBooking(bookingId: String): Resource<Unit>

    /**
     * Realtime bookings for the signed-in customer.
     */
    fun watchMyBookings(): Flow<Resource<List<Booking>>>

    /**
     * Subscribe to topics (e.g. booking reminders for the user's salons).
     */
    suspend fun subscribeToBookingTopics(salonIds: List<String>): Resource<Unit>
}

package com.beautyzone.app.domain.usecase

import com.beautyzone.app.domain.model.Booking
import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.repository.BookingRepository

data class CreateBookingParams(
    val salonId: String,
    val serviceId: String,
    val staffId: String? = null,
    val startAt: Long,
    val endAt: Long,
    val notes: String? = null
)

class CreateBookingUseCase(
    private val bookingRepository: BookingRepository
) : UseCase<CreateBookingParams, Booking>() {

    override suspend fun invoke(params: CreateBookingParams): Resource<Booking> =
        bookingRepository.createBooking(
            salonId = params.salonId,
            serviceId = params.serviceId,
            staffId = params.staffId,
            startAt = params.startAt,
            endAt = params.endAt,
            notes = params.notes
        )
}

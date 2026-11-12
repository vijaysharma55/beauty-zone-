package com.beautyzone.app.domain.usecase

import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.repository.BookingRepository

class CancelBookingUseCase(
    private val bookingRepository: BookingRepository
) : UseCase<String, Unit>() {

    override suspend fun invoke(params: String): Resource<Unit> =
        bookingRepository.cancelBooking(params)
}

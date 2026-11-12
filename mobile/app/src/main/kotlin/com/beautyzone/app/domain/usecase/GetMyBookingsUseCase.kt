package com.beautyzone.app.domain.usecase

import com.beautyzone.app.domain.model.Booking
import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.repository.BookingRepository

class GetMyBookingsUseCase(
    private val bookingRepository: BookingRepository
) : UseCase<NoParams, List<Booking>>() {

    override suspend fun invoke(params: NoParams): Resource<List<Booking>> =
        bookingRepository.getMyBookings()
}

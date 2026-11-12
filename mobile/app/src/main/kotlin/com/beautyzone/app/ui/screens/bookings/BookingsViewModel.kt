package com.beautyzone.app.ui.screens.bookings

import androidx.hilt.lifecycle.HiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.beautyzone.app.domain.model.Booking
import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.usecase.CancelBookingUseCase
import com.beautyzone.app.domain.usecase.GetMyBookingsUseCase
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

@HiltViewModel
class BookingsViewModel @Inject constructor(
    private val getMyBookingsUseCase: GetMyBookingsUseCase,
    private val cancelBookingUseCase: CancelBookingUseCase
) : ViewModel() {

    data class UiState(
        val bookings: List<Booking> = emptyList(),
        val isLoading: Boolean = false,
        val error: String? = null
    )

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    fun load() = viewModelScope.launch {
        _uiState.update { it.copy(isLoading = true, error = null) }
        val result = getMyBookingsUseCase()
        when (result) {
            is Resource.Success -> _uiState.update { it.copy(isLoading = false, bookings = result.data) }
            is Resource.Error -> _uiState.update {
                it.copy(isLoading = false, error = result.exception.message ?: "Failed to load bookings")
            }
        }
    }

    fun cancel(bookingId: String) = viewModelScope.launch {
        val result = cancelBookingUseCase(bookingId)
        when (result) {
            is Resource.Success -> load()
            is Resource.Error -> _uiState.update {
                it.copy(error = result.exception.message ?: "Failed to cancel booking")
            }
        }
    }

    fun statusText(booking: Booking): String = when (booking.status) {
        com.beautyzone.app.domain.model.BookingStatus.REQUESTED -> "Requested"
        com.beautyzone.app.domain.model.BookingStatus.PENDING_PAYMENT -> "Payment pending"
        com.beautyzone.app.domain.model.BookingStatus.CONFIRMED -> "Confirmed"
        com.beautyzone.app.domain.model.BookingStatus.COMPLETED -> "Completed"
        com.beautyzone.app.domain.model.BookingStatus.CANCELLED -> "Cancelled"
        com.beautyzone.app.domain.model.BookingStatus.DECLINED -> "Declined"
    }
}

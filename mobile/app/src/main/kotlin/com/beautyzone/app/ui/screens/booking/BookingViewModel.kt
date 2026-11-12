package com.beautyzone.app.ui.screens.booking

import androidx.hilt.lifecycle.HiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.beautyzone.app.domain.model.Booking
import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.model.Service
import com.beautyzone.app.domain.repository.SalonRepository
import com.beautyzone.app.domain.usecase.CreateBookingUseCase
import com.beautyzone.app.domain.usecase.CreateBookingParams
import com.beautyzone.app.background.WorkEnqueuer
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

@HiltViewModel
class BookingViewModel @Inject constructor(
    private val salonRepository: SalonRepository,
    private val createBookingUseCase: CreateBookingUseCase,
    private val workEnqueuer: WorkEnqueuer
) : ViewModel() {

    data class UiState(
        val salonId: String = "",
        val services: List<Service> = emptyList(),
        val selectedService: Service? = null,
        val selectedDateIndex: Int = 0,
        val selectedStartIndex: Int = -1,
        val notes: String = "",
        val isLoading: Boolean = false,
        val error: String? = null,
        val advanceAmount: Int = 0
    )

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    private val _events = MutableSharedFlow<Event>(replay = 0, extraBufferCapacity = 1)
    val events: SharedFlow<Event> = _events.asSharedFlow()

    sealed class Event {
        data class BookingConfirmed(val booking: Booking) : Event()
    }

    fun loadServices(salonId: String) = viewModelScope.launch {
        _uiState.update { it.copy(salonId = salonId, isLoading = true, error = null) }
        val result = salonRepository.getSalonServices(salonId)
        when (result) {
            is Resource.Success -> {
                _uiState.update { it.copy(isLoading = false, services = result.data) }
            }
            is Resource.Error -> {
                _uiState.update { it.copy(isLoading = false, error = result.exception.message ?: "Failed to load services") }
            }
        }
    }

    fun selectService(service: Service) {
        _uiState.update { it.copy(
            selectedService = service,
            selectedStartIndex = -1,
            advanceAmount = (service.price * 25 / 100)
        ) }
    }

    fun selectDate(index: Int) = _uiState.update { it.copy(selectedDateIndex = index) }

    fun selectTime(index: Int) = _uiState.update { it.copy(selectedStartIndex = index) }

    val availableDates: List<String> = (0..6).map { offset ->
        java.text.SimpleDateFormat("EEE, d MMM", java.util.Locale.getDefault())
            .format(java.util.Date(System.currentTimeMillis() + offset * 86400000L))
    }

    val timeSlots: List<String> = generateTimeSlots(9, 21, 30)

    fun book(notes: String) = viewModelScope.launch {
        val state = _uiState.value
        val service = state.selectedService ?: return@launch
        if (state.selectedStartIndex < 0) return@launch

        val chosenDate = java.util.Date(System.currentTimeMillis() + state.selectedDateIndex * 86400000L)
        val timeParts = timeSlots[state.selectedStartIndex].split(":").map { it.toInt() }
        val calendar = java.util.Calendar.getInstance()
        calendar.time = chosenDate
        calendar.set(java.util.Calendar.HOUR_OF_DAY, timeParts[0])
        calendar.set(java.util.Calendar.MINUTE, timeParts[1])
        calendar.set(java.util.Calendar.SECOND, 0)
        calendar.set(java.util.Calendar.MILLISECOND, 0)
        val startAt = calendar.timeInMillis
        val endAt = startAt + service.durationMin * 60000L

        _uiState.update { it.copy(isLoading = true, error = null) }
        val result = createBookingUseCase(
            CreateBookingParams(
                salonId = state.salonId,
                serviceId = service.id,
                staffId = null,
                startAt = startAt,
                endAt = endAt,
                notes = notes
            )
        )
        when (result) {
            is Resource.Success -> {
                _uiState.update { it.copy(isLoading = false) }
                workEnqueuer.enqueueBookingReminder(result.data.id, result.data.startAt)
                _events.tryEmit(Event.BookingConfirmed(result.data))
            }
            is Resource.Error -> _uiState.update {
                it.copy(isLoading = false, error = result.exception.message ?: "Booking failed")
            }
        }
    }

    companion object {
        private fun generateTimeSlots(startHour: Int, endHour: Int, stepMin: Int): List<String> {
            val slots = mutableListOf<String>()
            var h = startHour
            var m = 0
            while (h < endHour || (h == endHour && m == 0)) {
                slots.add("%02d:%02d".format(h, m))
                m += stepMin
                if (m >= 60) {
                    m = 0
                    h++
                }
            }
            return slots
        }
    }
}

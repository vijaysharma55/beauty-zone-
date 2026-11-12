package com.beautyzone.app.ui.screens.booking

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.HiltViewModel
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import com.beautyzone.app.domain.model.Booking
import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.repository.BookingRepository
import com.beautyzone.app.ui.components.LoadingScreen
import com.beautyzone.app.ui.theme.SectionTitle
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class BookingConfirmationViewModel @Inject constructor(
    private val bookingRepository: BookingRepository
) : ViewModel() {

    data class UiState(val booking: Booking? = null, val isLoading: Boolean = false, val error: String? = null)

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    fun load(bookingId: String) = viewModelScope.launch {
        _uiState.update { it.copy(isLoading = true, error = null) }
        val result = bookingRepository.getMyBookings()
        when (result) {
            is Resource.Success -> {
                val booking = result.data.firstOrNull { it.id == bookingId }
                _uiState.update { it.copy(isLoading = false, booking = booking) }
            }
            is Resource.Error -> _uiState.update {
                it.copy(isLoading = false, error = result.exception.message ?: "Failed to load booking")
            }
        }
    }
}

@Composable
fun BookingConfirmationScreen(bookingId: String) {
    val viewModel: BookingConfirmationViewModel = hiltViewModel()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(bookingId) { viewModel.load(bookingId) }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text(
            text = "Booking confirmed",
            style = MaterialTheme.typography.displayMedium ?: MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.primary
        )

        uiState.booking?.let { booking ->
            Column(modifier = Modifier.padding(top = 24.dp)) {
                Text(text = booking.salonName, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface)
                Text(text = booking.serviceName, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(
                    text = java.text.SimpleDateFormat("EEE, d MMM yyyy hh:mm a", java.util.Locale.getDefault())
                        .format(java.util.Date(booking.startAt)),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(top = 8.dp)
                )
                Text(
                    text = "Status: Confirmed",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(top = 16.dp)
                )
                if (booking.advanceAmount > 0) {
                    Text(
                        text = "Advance paid: ${String.format("₹%.2f", booking.advanceAmount / 100.0)}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }
                SectionTitle(
                    text = "We'll remind you 30 minutes before your appointment.",
                    modifier = Modifier.padding(top = 24.dp)
                )
            }
        }

        uiState.error?.let {
            Text(text = it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
        }
    }
}

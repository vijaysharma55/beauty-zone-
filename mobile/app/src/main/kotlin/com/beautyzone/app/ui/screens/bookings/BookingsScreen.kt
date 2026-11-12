package com.beautyzone.app.ui.screens.bookings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.HiltViewModel
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.beautyzone.app.domain.model.Booking
import com.beautyzone.app.ui.components.AppScaffold
import com.beautyzone.app.ui.components.LoadingScreen
import com.beautyzone.app.ui.theme.SectionTitle

@Composable
fun BookingsScreen(modifier: Modifier = Modifier) {
    val viewModel: BookingsViewModel = hiltViewModel()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) { viewModel.load() }

    Column(modifier = modifier.fillMaxSize().padding(16.dp)) {
        Text(
            text = "My appointments",
            style = MaterialTheme.typography.displayMedium ?: MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onSurface
        )

        if (uiState.isLoading && uiState.bookings.isEmpty()) {
            com.beautyzone.app.ui.components.LoadingScreen(
                modifier = Modifier.fillMaxSize().padding(top = 48.dp)
            )
        } else if (uiState.bookings.isEmpty()) {
            Text(
                text = "No appointments yet",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 24.dp)
            )
        } else {
            SectionTitle(text = "Upcoming", modifier = Modifier.padding(top = 16.dp))
            LazyColumn(
                modifier = Modifier.fillMaxWidth(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(top = 8.dp)
            ) {
                items(uiState.bookings, key = { it.id }) { booking ->
                    BookingRow(booking = booking, onCancel = { viewModel.cancel(booking.id) })
                }
            }
        }

        uiState.error?.let {
            Text(text = it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
        }
    }
}

@Composable
private fun BookingRow(booking: Booking, onCancel: () -> Unit) {
    androidx.compose.material3.Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
        shape = MaterialTheme.shapes.medium,
        colors = androidx.compose.material3.CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer
        )
    ) {
        androidx.compose.foundation.layout.Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = androidx.compose.foundation.layout.Alignment.CenterVertically
        ) {
            androidx.compose.foundation.layout.Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = booking.salonName,
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "${booking.serviceName} • ${booking.statusText(booking)}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = java.text.SimpleDateFormat("EEE, d MMM hh:mm a", java.util.Locale.getDefault())
                        .format(java.util.Date(booking.startAt)),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            if (booking.status == com.beautyzone.app.domain.model.BookingStatus.CONFIRMED) {
                TextButton(onClick = onCancel) {
                    Text(text = "Cancel", color = MaterialTheme.colorScheme.error)
                }
            }
        }
    }
}

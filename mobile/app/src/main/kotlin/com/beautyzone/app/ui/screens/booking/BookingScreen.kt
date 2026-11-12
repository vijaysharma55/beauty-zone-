package com.beautyzone.app.ui.screens.booking

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
import androidx.compose.ui.unit.sp
import androidx.hilt.lifecycle.HiltViewModel
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.LocalNavController
import com.beautyzone.app.domain.model.Service
import com.beautyzone.app.ui.components.LoadingScreen
import com.beautyzone.app.ui.components.BeautyButton
import com.beautyzone.app.ui.theme.SectionTitle
import com.beautyzone.app.ui.navigation.Routes

@Composable
fun BookingScreen(salonId: String) {
    val viewModel: BookingViewModel = hiltViewModel()
    val navController = LocalNavController.current
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val events by viewModel.events.collectAsStateWithLifecycle()

    LaunchedEffect(salonId) {
        viewModel.loadServices(salonId)
    }

    events?.let { event ->
        if (event is BookingViewModel.Event.BookingConfirmed) {
            navController.navigate("${Routes.BookingConfirmation}/${event.booking.id}") {
                popUpTo(Routes.Home) { inclusive = true }
            }
        }
    }

    Column(modifier = modifier.fillMaxSize().padding(16.dp)) {
        Text(
            text = "New booking",
            style = MaterialTheme.typography.displayMedium ?: MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onSurface
        )

        if (uiState.isLoading && uiState.selectedService == null) {
            LoadingScreen(
                modifier = Modifier.fillMaxSize().padding(top = 48.dp)
            )
        } else {
            SectionTitle(text = "Choose a service", modifier = Modifier.padding(top = 16.dp))
            if (uiState.services.isEmpty()) {
                Text(text = "No services available", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(8.dp)
                ) {
                    uiState.services.forEach { service ->
                        ServiceChip(
                            service = service,
                            selected = uiState.selectedService?.id == service.id,
                            onClick = { viewModel.selectService(service) }
                        )
                    }
                }
            }

            uiState.selectedService?.let { service ->
                Column(modifier = Modifier.padding(top = 16.dp)) {
                    SectionTitle(text = "Choose a day", modifier = Modifier.padding(top = 8.dp))
                    DayRow(
                        dates = viewModel.availableDates,
                        selectedIndex = uiState.selectedDateIndex,
                        onSelect = { viewModel.selectDate(it) }
                    )

                    SectionTitle(text = "Choose a time", modifier = Modifier.padding(top = 16.dp))
                    TimeRow(
                        slots = viewModel.timeSlots,
                        selectedIndex = uiState.selectedStartIndex,
                        onSelect = { viewModel.selectTime(it) }
                    )

                    Text(
                        text = "Advance due (25%): ${String.format("₹%.2f", uiState.advanceAmount / 100.0)}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 16.dp)
                    )

                    BeautyButton(
                        onClick = { viewModel.book(notes = "") },
                        enabled = uiState.selectedStartIndex >= 0 && !uiState.isLoading
                    ) {
                        if (uiState.isLoading) {
                            Text(text = "Booking…")
                        } else {
                            Text(text = "Confirm booking")
                        }
                    }
                }
            }

            uiState.error?.let {
                Text(text = it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
            }
        }
    }
}

@Composable
private fun ServiceChip(
    service: Service,
    selected: Boolean,
    onClick: () -> Unit
) {
    androidx.compose.material3.Chip(
        onClick = onClick,
        selected = selected,
        modifier = androidx.compose.foundation.layout.Size(150.dp, 70.dp),
        colors = androidx.compose.material3.ChipDefaults.colors(
            containerColor = if (selected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceContainer,
            selectedContainerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        androidx.compose.foundation.layout.Column(
            modifier = androidx.compose.foundation.layout.fillMaxSize(),
            horizontalAlignment = androidx.compose.foundation.layout.Alignment.CenterHorizontally,
            verticalArrangement = androidx.compose.foundation.layout.Arrangement.Center
        ) {
            Text(
                text = service.name,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1
            )
            Text(
                text = String.format("₹%.2f", service.price / 100.0),
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun DayRow(dates: List<String>, selectedIndex: Int, onSelect: (Int) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(6.dp)
    ) {
        dates.forEachIndexed { index, date ->
            val selected = index == selectedIndex
            androidx.compose.material3.Button(
                onClick = { onSelect(index) },
                selected = selected,
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                    containerColor = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceContainer,
                    contentColor = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
                )
            ) {
                Column(
                    horizontalAlignment = androidx.compose.foundation.layout.Alignment.CenterHorizontally
                ) {
                    Text(text = date.substringBefore(" • "), style = MaterialTheme.typography.labelLarge)
                    Text(text = date.substringAfter(" • ").take(2), style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
    }
}

@Composable
private fun TimeRow(slots: List<String>, selectedIndex: Int, onSelect: (Int) -> Unit) {
    LazyColumn(
        modifier = Modifier.fillMaxWidth().height(120.dp),
        horizontalArrangement = androidx.compose.foundation.layout.Arrangement.Center
    ) {
        items(slots, key = { it }) { slot ->
            val slotIndex = slots.indexOf(slot)
            val selected = slotIndex == selectedIndex
            androidx.compose.material3.Button(
                onClick = { onSelect(slotIndex) },
                selected = selected,
                modifier = Modifier.width(64.dp).height(40.dp),
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                    containerColor = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceContainer,
                    contentColor = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
                )
            ) {
                Text(text = slot, style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}

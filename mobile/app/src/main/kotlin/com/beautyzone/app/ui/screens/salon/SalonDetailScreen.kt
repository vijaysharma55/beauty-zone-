package com.beautyzone.app.ui.screens.salon

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
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
import coil.compose.AsyncImage
import com.beautyzone.app.domain.model.Salon
import com.beautyzone.app.ui.components.AppScaffold
import com.beautyzone.app.ui.components.BeautyButton
import com.beautyzone.app.ui.theme.SectionTitle
import com.beautyzone.app.ui.navigation.NavArgs
import com.beautyzone.app.ui.navigation.Routes

@Composable
fun SalonDetailScreen(salonId: String) {
    val viewModel: SalonDetailViewModel = hiltViewModel()
    val navController = LocalNavController.current
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(salonId) {
        viewModel.load(salonId)
    }

    val salon = uiState.salon

    androidx.compose.material3.Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        if (uiState.isLoading && salon == null) {
            com.beautyzone.app.ui.components.LoadingScreen()
        } else if (uiState.error != null && salon == null) {
            com.beautyzone.app.ui.components.ErrorScreen(
                error = uiState.error ?: "Unknown error",
                onRetry = { viewModel.load(salonId) }
            )
        } else if (salon != null) {
            SalonDetailContent(salon = salon, services = uiState.services, onBook = {
                navController.navigate("${Routes.Booking}/${salon.id}")
            })
        }
    }
}

@Composable
private fun SalonDetailContent(
    salon: Salon,
    services: List<com.beautyzone.app.domain.model.Service>,
    onBook: () -> Unit
) {
    Column(modifier = Modifier.fillMaxSize()) {
        salon.imageUrl?.let {
            AsyncImage(
                model = it,
                contentDescription = null,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp),
                contentScale = androidx.compose.foundation.layout.ContentScale.Crop
            )
        }

        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = salon.name,
                style = MaterialTheme.typography.displayMedium ?: MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
            salon.rating?.let {
                Text(
                    text = "★ ${String.format("%.1f", it)}  •  ${salon.city}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Text(
                text = salon.address,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurface
            )
            salon.phone?.let {
                Row(
                    modifier = Modifier.padding(top = 8.dp),
                    verticalAlignment = androidx.compose.foundation.layout.Alignment.CenterVertically
                ) {
                    androidx.compose.material3.Icon(
                        imageVector = androidx.compose.material.icons.Icons.Default.Phone,
                        contentDescription = "Call",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
            BeautyButton(onClick = { /* tel:${salon.phone} dialer intent */ }) {
                Text(text = "Call salon")
            }
            BeautyButton(
                onClick = {
                    navController.navigate("map?selectedSalonId=${salon.id}")
                }
            ) {
                Text(text = "Get directions")
            }

            SectionTitle(text = "Services", modifier = Modifier.padding(top = 24.dp))
            if (services.isEmpty()) {
                Text(text = "No services listed", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                services.forEach { service ->
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                        verticalAlignment = androidx.compose.foundation.layout.Alignment.CenterVertically
                    ) {
                        Text(
                            text = service.name,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.weight(1f)
                        )
                        Text(
                            text = String.format("₹%.2f", service.price / 100.0),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            BeautyButton(
                onClick = onBook,
                enabled = services.isNotEmpty()
            ) {
                Text(text = "Book an appointment")
            }
        }
    }
}

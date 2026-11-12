package com.beautyzone.app.ui.screens.splash

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.derivedStateOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.beautyzone.app.ui.theme.BeautyZoneTheme
import com.beautyzone.app.ui.theme.beautyCard

@Composable
fun SplashScreen(onAuthenticated: () -> Unit, onNotAuthenticated: () -> Unit) {
    val splashContent = remember { mutableStateOf(true) }

    BeautyZoneTheme {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = androidx.compose.foundation.layout.Arrangement.Center
        ) {
            AnimatedVisibility(
                visible = splashContent.value,
                enter = fadeIn(),
                exit = fadeOut()
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(24.dp)
                ) {
                    beautyCard {
                        Text(
                            text = "BeautyZone",
                            style = MaterialTheme.typography.displaySmall ?: MaterialTheme.typography.headlineMedium,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = "Salon, spa & bridal bookings",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    CircularProgressIndicator(
                        modifier = Modifier.padding(top = 24.dp),
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }

        // Auth state is observed by the caller; this screen is a visual shell.
        // The ViewModel (injected at the NavGraph level) decides the route.
        if (!splashContent.value) {
            // Delayed handoff handled by SplashViewModel.
        }
    }
}

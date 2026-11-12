package com.beautyzone.app.ui.screens.profile

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.HiltViewModel
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.LocalNavController
import com.beautyzone.app.ui.components.AppScaffold
import com.beautyzone.app.ui.components.BeautyButton
import com.beautyzone.app.ui.theme.SectionTitle
import com.beautyzone.app.ui.navigation.Routes

@Composable
fun ProfileScreen(modifier: Modifier = Modifier) {
    val viewModel: ProfileViewModel = hiltViewModel()
    val navController = LocalNavController.current
    val user by viewModel.user.collectAsStateWithLifecycle()

    var notificationsEnabled by remember { mutableStateOf(true) }

    Column(modifier = modifier.fillMaxSize().padding(16.dp)) {
        Text(
            text = "Profile",
            style = MaterialTheme.typography.displayMedium ?: MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onSurface
        )

        user?.let { u ->
            Column(modifier = Modifier.padding(top = 24.dp)) {
                Text(
                    text = u.name ?: "Guest",
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = u.phone,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                u.email?.let {
                    Text(text = it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }

        SectionTitle(text = "Preferences", modifier = Modifier.padding(top = 32.dp))
        androidx.compose.foundation.layout.Row(
            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
            verticalAlignment = androidx.compose.foundation.layout.Alignment.CenterVertically
        ) {
            Text(
                text = "Push notifications",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
            Switch(
                checked = notificationsEnabled,
                onCheckedChange = { viewModel.toggleNotifications(it); notificationsEnabled = it }
            )
        }

        BeautyButton(
            onClick = { navController.navigate(Routes.DocumentUpload) }
        ) {
            Text(text = "Upload ID / document")
        }

        BeautyButton(
            onClick = { viewModel.signOut() }
        ) {
            Text(text = "Sign out")
        }
    }
}

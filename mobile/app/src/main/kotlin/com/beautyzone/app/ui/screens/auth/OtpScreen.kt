package com.beautyzone.app.ui.screens.auth

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.KeyboardType
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.HiltViewModel
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.beautyzone.app.ui.components.BeautyButton
import com.beautyzone.app.ui.components.BeautyTextField
import com.beautyzone.app.ui.theme.SectionTitle

@Composable
fun OtpScreen(onVerified: () -> Unit) {
    val viewModel: AuthViewModel = hiltViewModel()
    var otp by remember { mutableStateOf("") }
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier.fillMaxWidth().padding(24.dp),
        verticalArrangement = androidx.compose.foundation.layout.Arrangement.Center
    ) {
        Text(
            text = "Verify your number",
            style = MaterialTheme.typography.displayMedium ?: MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onSurface
        )
        Text(
            text = "Enter the 6-digit code sent to ${uiState.phone}",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        BeautyTextField(
            value = otp,
            onValueChange = { otp = it.filter { it.isDigit() }.take(6) },
            label = "Verification code",
            placeholder = "123456",
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            singleLine = true,
            maxLines = 1,
            error = uiState.error != null
        )

        uiState.error?.let {
            Text(text = it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
        }

        BeautyButton(
            onClick = { if (otp.length == 6) viewModel.verifyOtp(otp) },
            enabled = otp.length == 6 && !uiState.isLoading
        ) {
            if (uiState.isLoading) {
                Text(text = "Verifying…")
            } else {
                Text(text = "Verify & continue")
            }
        }

        androidx.compose.foundation.layout.Row(
            modifier = Modifier.padding(top = 12.dp),
            horizontalArrangement = androidx.compose.foundation.layout.Arrangement.Center
        ) {
            Text(
                text = "Didn't receive the code? ",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            BeautyButton(onClick = { viewModel.sendOtp(uiState.phone) }, enabled = !uiState.isLoading) {
                Text(text = "Resend", style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}

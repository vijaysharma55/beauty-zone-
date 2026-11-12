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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.lifecycle.HiltViewModel
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.hilt.navigation.compose.hiltViewModel
import com.beautyzone.app.ui.components.BeautyButton
import com.beautyzone.app.ui.components.BeautyTextField
import com.beautyzone.app.ui.theme.SectionTitle

@Composable
fun PhoneLoginScreen(onOtpSent: (verificationId: String) -> Unit) {
    val viewModel: AuthViewModel = hiltViewModel()
    var phone by remember { mutableStateOf("") }
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier.fillMaxWidth().padding(24.dp),
        verticalArrangement = androidx.compose.foundation.layout.Arrangement.Center
    ) {
        Text(
            text = "Welcome back",
            style = MaterialTheme.typography.displayMedium ?: MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onSurface
        )
        Text(
            text = "Sign in with your phone number",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        BeautyTextField(
            value = phone,
            onValueChange = { phone = it },
            label = "Phone number",
            placeholder = "+91 98765 43210",
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            singleLine = true,
            error = uiState.error != null
        )

        uiState.error?.let {
            Text(text = it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
        }

        BeautyButton(
            onClick = { viewModel.sendOtp(phone) },
            enabled = phone.isNotBlank() && !uiState.isLoading
        ) {
            if (uiState.isLoading) {
                Text(text = "Sending code…")
            } else {
                Text(text = "Send verification code")
            }
        }

        Text(
            text = "By continuing you agree to our Terms and Privacy Policy.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
            modifier = Modifier.padding(top = 16.dp)
        )
    }
}

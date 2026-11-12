package com.beautyzone.app.ui.screens.profile

import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.HiltViewModel
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.repository.AuthRepository
import com.beautyzone.app.domain.usecase.UploadDocumentUseCase
import com.beautyzone.app.ui.theme.SectionTitle
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DocumentUploadViewModel @Inject constructor(
    private val uploadDocumentUseCase: UploadDocumentUseCase,
    private val authRepository: AuthRepository
) : ViewModel() {

    data class UiState(
        val isUploading: Boolean = false,
        val uploadUrl: String? = null,
        val error: String? = null
    )

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    fun upload(filePath: String, fileName: String) = viewModelScope.launch {
        val userId = authRepository.getCurrentUser()?.id
            ?: throw IllegalStateException("Not signed in")
        _uiState.update { it.copy(isUploading = true, error = null, uploadUrl = null) }
        val result = uploadDocumentUseCase(UploadDocumentUseCase.UploadDocumentParams(userId, filePath, fileName))
        when (result) {
            is Resource.Success -> _uiState.update { it.copy(isUploading = false, uploadUrl = result.data) }
            is Resource.Error -> _uiState.update {
                it.copy(isUploading = false, error = result.exception.message ?: "Upload failed")
            }
        }
    }
}

@Composable
fun DocumentUploadScreen() {
    val viewModel: DocumentUploadViewModel = hiltViewModel()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    val pickLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let {
            val fileName = "document_${System.currentTimeMillis()}"
            viewModel.upload(uri.toString(), fileName)
        }
    }

    Column(modifier = Modifier.fillMaxSize().padding(24.dp)) {
        Text(
            text = "Upload document",
            style = MaterialTheme.typography.displayMedium ?: MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onSurface
        )
        Text(
            text = "Upload a government ID or salon authorization document.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        androidx.compose.material3.Button(
            onClick = { pickLauncher.launch("*/*") },
            enabled = !uiState.isUploading
        ) {
            if (uiState.isUploading) {
                Text(text = "Uploading…")
            } else {
                Text(text = "Choose file")
            }
        }

        uiState.uploadUrl?.let { url ->
            Text(
                text = "Uploaded: $url",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(top = 16.dp)
            )
        }

        uiState.error?.let {
            Text(text = it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
        }
    }
}

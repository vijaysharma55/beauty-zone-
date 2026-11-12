package com.beautyzone.app.ui.screens.auth

import androidx.hilt.lifecycle.HiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.beautyzone.app.data.local.datastore.AppDataStore
import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.model.User
import com.beautyzone.app.domain.repository.AuthRepository
import com.beautyzone.app.domain.usecase.OtpParams
import com.beautyzone.app.domain.usecase.SaveFcmTokenUseCase
import com.beautyzone.app.domain.usecase.SendOtpUseCase
import com.beautyzone.app.domain.usecase.VerifyOtpUseCase
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val sendOtpUseCase: SendOtpUseCase,
    private val verifyOtpUseCase: VerifyOtpUseCase,
    private val saveFcmTokenUseCase: SaveFcmTokenUseCase,
    private val authRepository: AuthRepository,
    private val appDataStore: AppDataStore
) : ViewModel() {

    data class UiState(
        val isLoading: Boolean = false,
        val error: String? = null,
        val phone: String = "",
        val verificationId: String? = null,
        val user: User? = null
    )

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    private val _events = MutableSharedFlow<Event>(replay = 0, extraBufferCapacity = 1)
    val events: SharedFlow<Event> = _events.asSharedFlow()

    sealed class Event {
        object NavigateToHome : Event()
    }

    init {
        viewModelScope.launch {
            authRepository.currentUser.collect { user ->
                _uiState.update { it.copy(user = user) }
                if (user != null) {
                    // Associate the FCM token (cached by the Messaging service on
                    // token refresh) with the signed-in user's profile.
                    ensureFcmTokenSynced()
                }
            }
        }
    }

    private suspend fun ensureFcmTokenSynced() {
        val token = appDataStore.fcmToken.firstOrNull { it != null }
        if (token != null) {
            saveFcmTokenUseCase(token)
        }
    }

    fun sendOtp(phone: String) = viewModelScope.launch {
        _uiState.update { it.copy(isLoading = true, error = null) }
        val result = sendOtpUseCase(phone)
        when (result) {
            is Resource.Success -> {
                _uiState.update { it.copy(isLoading = false, verificationId = result.data, phone = phone) }
            }
            is Resource.Error -> {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = result.exception.message ?: "Failed to send verification code"
                    )
                }
            }
        }
    }

    fun verifyOtp(otp: String) = viewModelScope.launch {
        val state = _uiState.value
        val phone = state.phone
        val verificationId = state.verificationId ?: return@launch
        _uiState.update { it.copy(isLoading = true, error = null) }
        val result = verifyOtpUseCase(OtpParams(phone, otp, verificationId))
        when (result) {
            is Resource.Success -> {
                _uiState.update { it.copy(isLoading = false, user = result.data) }
                ensureFcmTokenSynced()
                _events.tryEmit(Event.NavigateToHome)
            }
            is Resource.Error -> {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = result.exception.message ?: "Invalid verification code"
                    )
                }
            }
        }
    }

    fun signOut() = viewModelScope.launch {
        val result = authRepository.signOut()
        if (result is Resource.Success) {
            _uiState.update { it.copy(user = null, verificationId = null, phone = "") }
        }
    }
}

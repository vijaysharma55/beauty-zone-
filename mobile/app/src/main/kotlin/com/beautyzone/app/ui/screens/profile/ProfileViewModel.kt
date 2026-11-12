package com.beautyzone.app.ui.screens.profile

import androidx.hilt.lifecycle.HiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.model.User
import com.beautyzone.app.domain.repository.AuthRepository
import com.beautyzone.app.domain.repository.NotificationRepository
import com.beautyzone.app.domain.usecase.UpdateProfileUseCase
import javax.inject.Inject
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.launch

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val notificationRepository: NotificationRepository,
    private val updateProfileUseCase: UpdateProfileUseCase
) : ViewModel() {

    val user: Flow<User?> =
        authRepository.currentUser.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    fun toggleNotifications(enabled: Boolean) = viewModelScope.launch {
        val result = notificationRepository.setNotificationsEnabled(enabled)
        if (result is Resource.Error) {
            // Surface via a snackbar in the UI layer in production.
        }
    }

    fun updateDisplayName(name: String) = viewModelScope.launch {
        val current = authRepository.getCurrentUser() ?: return@launch
        val result = updateProfileUseCase(current.copy(name = name))
        if (result is Resource.Error) {
            // Surface error in UI.
        }
    }

    fun signOut() = viewModelScope.launch {
        authRepository.signOut()
    }
}

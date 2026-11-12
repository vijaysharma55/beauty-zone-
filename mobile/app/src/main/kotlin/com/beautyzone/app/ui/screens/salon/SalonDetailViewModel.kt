package com.beautyzone.app.ui.screens.salon

import androidx.hilt.lifecycle.HiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.model.Salon
import com.beautyzone.app.domain.model.Service
import com.beautyzone.app.domain.usecase.GetSalonDetailUseCase
import com.beautyzone.app.domain.usecase.GetSalonServicesUseCase
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

@HiltViewModel
class SalonDetailViewModel @Inject constructor(
    private val getSalonDetailUseCase: GetSalonDetailUseCase,
    private val getSalonServicesUseCase: GetSalonServicesUseCase
) : ViewModel() {

    data class UiState(
        val salon: Salon? = null,
        val services: List<Service> = emptyList(),
        val isLoading: Boolean = false,
        val error: String? = null
    )

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    fun load(salonId: String) = viewModelScope.launch {
        _uiState.update { it.copy(isLoading = true, error = null) }
        val salonResult = getSalonDetailUseCase(salonId)
        val servicesResult = getSalonServicesUseCase(salonId)
        _uiState.update { it.copy(isLoading = false) }
        when (salonResult) {
            is Resource.Success -> _uiState.update { it.copy(salon = salonResult.data) }
            is Resource.Error -> _uiState.update {
                it.copy(error = salonResult.exception.message ?: "Salon not found")
            }
        }
        when (servicesResult) {
            is Resource.Success -> _uiState.update { it.copy(services = servicesResult.data) }
            is Resource.Error -> /* non-fatal */ Unit
        }
    }
}

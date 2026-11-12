package com.beautyzone.app.ui.screens.home

import androidx.hilt.lifecycle.HiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.model.Salon
import com.beautyzone.app.domain.usecase.SearchSalonsUseCase
import com.beautyzone.app.domain.usecase.SalonSearchParams
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val searchSalonsUseCase: SearchSalonsUseCase
) : ViewModel() {

    data class UiState(
        val salons: List<Salon> = emptyList(),
        val isLoading: Boolean = false,
        val error: String? = null,
        val query: String = ""
    )

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    fun search(query: String, lat: Double?, lng: Double?) = viewModelScope.launch {
        _uiState.update { it.copy(isLoading = true, error = null, query = query) }
        val result = searchSalonsUseCase(SalonSearchParams(lat, lng, query))
        when (result) {
            is Resource.Success -> _uiState.update { it.copy(isLoading = false, salons = result.data) }
            is Resource.Error -> _uiState.update {
                it.copy(isLoading = false, error = result.exception.message ?: "Search failed")
            }
        }
    }
}

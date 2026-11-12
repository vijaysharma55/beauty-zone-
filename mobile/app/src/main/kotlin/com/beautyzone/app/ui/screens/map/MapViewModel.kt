package com.beautyzone.app.ui.screens.map

import androidx.hilt.lifecycle.HiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.beautyzone.app.data.datasource.LocationDataSource
import com.beautyzone.app.domain.model.Coordinate
import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.model.RouteResult
import com.beautyzone.app.domain.model.Salon
import com.beautyzone.app.domain.usecase.DirectionsParams
import com.beautyzone.app.domain.usecase.GetDirectionsUseCase
import com.beautyzone.app.domain.usecase.SearchSalonsUseCase
import com.beautyzone.app.domain.usecase.SalonSearchParams
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

@HiltViewModel
class MapViewModel @Inject constructor(
    private val searchSalonsUseCase: SearchSalonsUseCase,
    private val getDirectionsUseCase: GetDirectionsUseCase,
    private val locationDataSource: LocationDataSource
) : ViewModel() {

    data class UiState(
        val salons: List<Salon> = emptyList(),
        val selectedSalon: Salon? = null,
        val route: RouteResult? = null,
        val isLoading: Boolean = false,
        val error: String? = null
    )

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    /**
     * Current device location. Collected once and replayed to late subscribers
     * for 5 seconds after the last subscriber leaves.
     */
    val currentLocation: StateFlow<Resource<Coordinate>> =
        locationDataSource.getCurrentLocationFlow()
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), Resource.Loading())

    private val _events = MutableSharedFlow<Event>(replay = 0, extraBufferCapacity = 1)
    val events: SharedFlow<Event> = _events.asSharedFlow()

    sealed class Event {
        object CenterOnMyLocation : Event()
    }

    fun loadSalons(lat: Double?, lng: Double?) = viewModelScope.launch {
        _uiState.update { it.copy(isLoading = true, error = null) }
        val result = searchSalonsUseCase(SalonSearchParams(lat, lng, null))
        when (result) {
            is Resource.Success -> _uiState.update { it.copy(isLoading = false, salons = result.data) }
            is Resource.Error -> _uiState.update {
                it.copy(isLoading = false, error = result.exception.message ?: "Map load failed")
            }
        }
    }

    fun selectSalon(salon: Salon, origin: Coordinate) = viewModelScope.launch {
        _uiState.update { it.copy(selectedSalon = salon, route = null) }
        val result = getDirectionsUseCase(DirectionsParams(origin, Coordinate(salon.lat, salon.lng)))
        when (result) {
            is Resource.Success -> _uiState.update { it.copy(route = result.data) }
            is Resource.Error -> Unit // directions are optional; the map still works without them
        }
    }
}

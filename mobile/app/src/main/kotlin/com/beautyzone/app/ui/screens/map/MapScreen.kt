package com.beautyzone.app.ui.screens.map

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.hilt.lifecycle.HiltViewModel
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.beautyzone.app.domain.model.Coordinate
import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.util.Extensions.toLatLng
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.maps.compose.GoogleMap
import com.google.maps.android.maps.compose.MapUiSettings
import com.google.maps.android.maps.compose.Marker
import com.google.maps.android.maps.compose.MarkerState
import com.google.maps.android.maps.compose.Polyline
import com.google.maps.android.maps.compose.RoundCap
import com.google.maps.android.maps.compose.rememberCameraPositionState
import com.beautyzone.app.ui.components.LoadingScreen

/**
 * Map of nearby salons with optional route polyline from the user's location to
 * a selected salon. Requires ACCESS_FINE_LOCATION, requested at runtime.
 */
@Composable
fun MapScreen(
    selectedSalonId: String? = null,
    modifier: Modifier = Modifier
) {
    val viewModel: MapViewModel = hiltViewModel()
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val location by viewModel.currentLocation.collectAsStateWithLifecycle()

    val cameraPositionState = rememberCameraPositionState {}

    // Runtime location permission.
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            // currentLocation flow in the ViewModel will emit once granted.
        }
    }

    LaunchedEffect(Unit) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED
        ) {
            permissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
        }
    }

    // Move the camera to the user's location on first fix.
    val origin by remember { mutableStateOf<LatLng?>(null) }
    LaunchedEffect(location) {
        if (location is Resource.Success) {
            val latLng = location.data.toLatLng()
            origin = latLng
            cameraPositionState.moveTo(CameraUpdateFactory.newLatLngZoom(latLng, 13f))
            viewModel.loadSalons(latLng.latitude, latLng.longitude)
        }
    }

    Column(modifier = modifier.fillMaxSize()) {
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState,
            uiSettings = MapUiSettings(zoomControlsEnabled = true)
        ) {
            uiState.salons.forEach { salon ->
                Marker(
                    state = MarkerState(salon.coordinate().toLatLng()),
                    title = salon.name,
                    snippet = salon.address,
                    onClick = {
                        origin?.let { viewModel.selectSalon(salon, Coordinate(it.latitude, it.longitude)) }
                    }
                )
            }

            uiState.route?.let { route ->
                Polyline(
                    points = route.polyline.map { it.toLatLng() },
                    color = MaterialTheme.colorScheme.primary,
                    width = 5f,
                    startCap = RoundCap(),
                    endCap = RoundCap()
                )
            }
        }

        if (uiState.isLoading && uiState.salons.isEmpty()) {
            LoadingScreen(
                modifier = Modifier
                    .fillMaxSize()
                    .align(androidx.compose.ui.Alignment.Center)
            )
        }

        uiState.error?.let {
            Text(
                text = it,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(8.dp)
                    .align(androidx.compose.ui.Alignment.BottomCenter)
            )
        }

        FloatingActionButton(
            onClick = {
                viewModel.events.tryEmit(MapViewModel.Event.CenterOnMyLocation)
            },
            modifier = Modifier.align(androidx.compose.ui.Alignment.BottomEnd).padding(16.dp)
        ) {
            Icon(
                imageVector = androidx.compose.material.icons.Icons.Default.MyLocation,
                contentDescription = "My location"
            )
        }
    }
}

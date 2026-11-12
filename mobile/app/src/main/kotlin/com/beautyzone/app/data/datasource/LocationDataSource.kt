package com.beautyzone.app.data.datasource

import android.app.Application
import android.os.Handler
import android.os.Looper
import com.beautyzone.app.domain.model.Coordinate
import com.beautyzone.app.domain.model.Resource
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.tasks.Tasks
import kotlinx.coroutines.callbackFlow
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import javax.inject.Inject

/**
 * Fused Location Provider wrapper. Exposes the last known location and a
 * cold flow of location updates (collected in the UI layer with
 * `repeatOnLifecycle`).
 */
class LocationDataSource @Inject constructor(
    application: Application,
    private val locationRequest: LocationRequest
) {

    private val client: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(application)

    suspend fun getLastLocation(): Resource<Coordinate> =
        try {
            val location = Tasks.await(client.lastLocation, 10, java.util.concurrent.TimeUnit.SECONDS)
            if (location != null) Resource.Success(Coordinate(location.latitude, location.longitude))
            else Resource.Error(IllegalStateException("Last location unavailable"))
        } catch (e: Exception) {
            Resource.Error(e)
        }

    /**
     * Emits the current location once (waiting for a fresh fix if needed),
     * then completes. Safe to collect from the UI layer.
     */
    fun getCurrentLocationFlow(): Flow<Resource<Coordinate>> = callbackFlow {
        var triedLast = false
        val callback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let {
                    trySend(Resource.Success(Coordinate(it.latitude, it.longitude)))
                }
            }
        }
        client.requestLocationUpdates(locationRequest, callback, Handler(Looper.getMainLooper()))
        // Fall back to last known location after a short timeout.
        CoroutineScope(Dispatchers.Main).launch {
            delay(5000)
            if (!triedLast) {
                triedLast = true
                try {
                    val last = Tasks.await(client.lastLocation, 5, java.util.concurrent.TimeUnit.SECONDS)
                    last?.let { trySend(Resource.Success(Coordinate(it.latitude, it.longitude))) }
                } catch (e: Exception) { /* last location simply unavailable */ }
            }
        }
        awaitClose {
            client.removeLocationUpdates(callback)
        }
    }
}

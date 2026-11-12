package com.beautyzone.app.util

import com.beautyzone.app.domain.model.Coordinate
import com.beautyzone.app.domain.model.Salon
import com.google.android.gms.maps.model.LatLng
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.toRadians

/**
 * Haversine distance (meters) between two coordinates — pure Kotlin, no
 * Android/SDK dependencies, so it belongs in util (usable by domain/data).
 */
fun haversineMeters(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
    val radius = 6_371_000.0
    val dLat = (lat2 - lat1).toRadians()
    val dLon = (lon2 - lon1).toRadians()
    val a = sin(dLat / 2) * sin(dLat / 2) +
        cos(lat1.toRadians()) * cos(lat2.toRadians()) * sin(dLon / 2) * sin(dLon / 2)
    return radius * (2 * atan2(sqrt(a), sqrt(1 - a)))
}

fun List<Salon>.sortedByDistance(userLat: Double, userLng: Double): List<Salon> =
    sortedBy { salon ->
        haversineMeters(userLat, userLng, salon.lat, salon.lng)
    }

fun Salon.toCoordinate(): Coordinate = Coordinate(lat, lng)

fun Coordinate.toLatLng(): LatLng = LatLng(latitude, longitude)

private fun sqrt(v: Double) = kotlin.math.sqrt(v)
private fun atan2(y: Double, x: Double) = kotlin.math.atan2(y, x)

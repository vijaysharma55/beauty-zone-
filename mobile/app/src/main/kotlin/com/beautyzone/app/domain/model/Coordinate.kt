package com.beautyzone.app.domain.model

data class Coordinate(val latitude: Double, val longitude: Double)

data class RouteResult(
    val polyline: List<Coordinate>,
    val distanceMeters: Long,
    val durationSeconds: Long
)

data class TimeSlot(
    val start: String, // HH:mm
    val end: String, // HH:mm
    val available: Boolean = true
)

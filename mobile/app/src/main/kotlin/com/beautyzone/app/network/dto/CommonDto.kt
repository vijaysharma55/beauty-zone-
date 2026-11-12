package com.beautyzone.app.network.dto

/**
 * Shared DTOs used across several endpoints.
 */
data class ErrorDto(val code: String?, val message: String?)
data class GeoPointDto(val lat: Double, val lng: Double)
data class PaginationDto(val limit: Int = 20, val offset: Int = 0)

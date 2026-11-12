package com.beautyzone.app.domain.model

/**
 * Generic result of a use case / repository call.
 *
 * Success   — data available
 * Loading   — in-flight (optional previous data for optimistic UI)
 * Error     — exception + optional stale data
 */
sealed interface Resource<out T> {
    data class Success<out T>(val data: T) : Resource<T>
    data class Loading<out T>(val data: T? = null) : Resource<T>
    data class Error<out T>(val exception: Throwable, val data: T? = null) : Resource<T>
}

package com.beautyzone.app.domain.model

data class OpeningHours(
    val weekday: Int, // 1 = Sunday … 7 = Saturday (Calendar convention)
    val openTime: String, // HH:mm
    val closeTime: String, // HH:mm
    val isClosed: Boolean = false
)

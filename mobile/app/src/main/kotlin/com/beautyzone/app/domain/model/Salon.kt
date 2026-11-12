package com.beautyzone.app.domain.model

/**
 * A salon / spa / studio listed on BeautyZone.
 */
data class Salon(
    val id: String,
    val name: String,
    val slug: String,
    val address: String,
    val city: String,
    val lat: Double,
    val lng: Double,
    val phone: String? = null,
    val rating: Float? = null,
    val imageUrl: String? = null,
    val coverImageUrl: String? = null,
    val description: String? = null,
    val services: List<Service> = emptyList(),
    val staff: List<StaffMember> = emptyList(),
    val openingHours: Map<String, String> = emptyMap(), // weekday -> "09:00-19:00"
    val isOpen: Boolean? = null,
    val distanceMeters: Double? = null // computed when a user location is known
)

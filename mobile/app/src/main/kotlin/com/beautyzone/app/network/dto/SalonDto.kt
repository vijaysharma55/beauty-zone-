package com.beautyzone.app.network.dto

data class SalonListDto(val salons: List<SalonDto>, val total: Int)

data class SalonDto(
    val id: String,
    val name: String,
    val slug: String,
    val address: String,
    val city: String,
    val lat: Double,
    val lng: Double,
    val phone: String?,
    val rating: Double?,
    val imageUrl: String?,
    val coverImageUrl: String?,
    val description: String?,
    val services: List<ServiceDto> = emptyList(),
    val staff: List<StaffDto> = emptyList(),
    val openingHours: Map<String, String> = emptyMap(),
    val isOpen: Boolean? = null,
    val createdAt: String? = null
)

data class ServiceDto(
    val id: String,
    val salonId: String,
    val name: String,
    val price: Int, // in minor currency units (paise)
    val currency: String = "INR",
    val durationMin: Int,
    val description: String? = null,
    val category: String? = null
)

data class StaffDto(
    val id: String,
    val salonId: String,
    val name: String,
    val specialty: String? = null,
    val available: Boolean = true,
    val acceptsBookings: Boolean = true,
    val photoUrl: String? = null
)

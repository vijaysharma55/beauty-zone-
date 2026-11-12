package com.beautyzone.app.domain.model

data class StaffMember(
    val id: String,
    val salonId: String,
    val name: String,
    val specialty: String? = null,
    val available: Boolean = true,
    val acceptsBookings: Boolean = true,
    val photoUrl: String? = null
)

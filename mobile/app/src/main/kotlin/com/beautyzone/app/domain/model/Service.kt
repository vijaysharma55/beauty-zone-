package com.beautyzone.app.domain.model

data class Service(
    val id: String,
    val salonId: String,
    val name: String,
    val price: Int, // minor currency units (paise)
    val currency: String = "INR",
    val durationMin: Int,
    val description: String? = null,
    val category: String? = null
)

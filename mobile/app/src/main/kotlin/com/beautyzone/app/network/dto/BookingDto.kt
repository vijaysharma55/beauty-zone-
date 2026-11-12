package com.beautyzone.app.network.dto

data class BookingDto(
    val id: String,
    val customerId: String,
    val salonId: String,
    val salonName: String?,
    val serviceId: String,
    val serviceName: String?,
    val staffId: String?,
    val staffName: String?,
    val startAt: String, // ISO-8601
    val endAt: String, // ISO-8601
    val status: String,
    val advanceAmount: Int,
    val currency: String = "INR",
    val paymentStatus: String? = null,
    val createdAt: String? = null
)

data class CreateBookingRequest(
    val salonId: String,
    val serviceId: String,
    val staffId: String?,
    val startAt: String, // ISO-8601
    val endAt: String, // ISO-8601
    val notes: String? = null
)

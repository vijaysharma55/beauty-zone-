package com.beautyzone.app.domain.model

enum class BookingStatus {
    REQUESTED, PENDING_PAYMENT, CONFIRMED, COMPLETED, CANCELLED, DECLINED
}

data class Booking(
    val id: String,
    val customerId: String,
    val salonId: String,
    val salonName: String,
    val serviceId: String,
    val serviceName: String,
    val staffId: String? = null,
    val staffName: String? = null,
    val startAt: Long, // epoch millis
    val endAt: Long, // epoch millis
    val status: BookingStatus = BookingStatus.REQUESTED,
    val advanceAmount: Int = 0, // minor currency units
    val currency: String = "INR",
    val paymentStatus: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)

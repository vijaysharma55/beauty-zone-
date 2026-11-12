package com.beautyzone.app.network.mapper

import com.beautyzone.app.domain.model.Booking
import com.beautyzone.app.domain.model.BookingStatus
import com.beautyzone.app.domain.model.Salon
import com.beautyzone.app.domain.model.Service
import com.beautyzone.app.domain.model.StaffMember
import com.beautyzone.app.network.dto.BookingDto
import com.beautyzone.app.network.dto.CreateBookingRequest
import com.beautyzone.app.network.dto.SalonDto
import com.beautyzone.app.network.dto.ServiceDto
import com.beautyzone.app.network.dto.StaffDto
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Maps network/Firestore DTOs to pure domain models. Keeps Android and SDK
 * types out of the domain layer.
 */
object DomainMapper {

    private val isoFormat: ThreadLocal<SimpleDateFormat> = ThreadLocal.withInitial {
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
    }

    fun SalonDto.toDomain(): Salon =
        Salon(
            id = id,
            name = name,
            slug = slug,
            address = address,
            city = city,
            lat = lat,
            lng = lng,
            phone = phone,
            rating = rating?.toFloat(),
            imageUrl = imageUrl,
            services = services.map { it.toDomain(id) },
            staff = staff.map { it.toDomain(id) },
            openingHours = openingHours
        )

    private fun ServiceDto.toDomain(salonId: String): Service =
        Service(
            id = id,
            salonId = salonId,
            name = name,
            price = price,
            currency = currency,
            durationMin = durationMin
        )

    private fun StaffDto.toDomain(salonId: String): StaffMember =
        StaffMember(
            id = id,
            salonId = salonId,
            name = name,
            specialty = specialty,
            available = available && acceptsBookings,
            photoUrl = photoUrl
        )

    fun BookingDto.toDomain(): Booking =
        Booking(
            id = id,
            customerId = customerId,
            salonId = salonId,
            salonName = salonName ?: "",
            serviceId = serviceId,
            serviceName = serviceName ?: "",
            staffId = staffId,
            staffName = staffName,
            startAt = parseInstant(startAt),
            endAt = parseInstant(endAt),
            status = BookingStatus.valueOf(status.uppercase()),
            advanceAmount = advanceAmount,
            currency = currency,
            createdAt = createdAt?.let { parseInstant(it) } ?: System.currentTimeMillis()
        )

    fun CreateBookingRequest.toDto(): CreateBookingRequest = this

    private fun parseInstant(iso: String): Long =
        isoFormat.value.parse(iso)?.time ?: System.currentTimeMillis()

    fun Date.toIsoString(): String = isoFormat.value.format(this)
}

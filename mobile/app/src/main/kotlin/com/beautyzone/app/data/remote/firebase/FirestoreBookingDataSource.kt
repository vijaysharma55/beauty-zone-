package com.beautyzone.app.data.remote.firebase

import com.beautyzone.app.domain.model.Booking
import com.beautyzone.app.domain.model.BookingStatus
import com.google.android.gms.tasks.Tasks
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import javax.inject.Inject

/**
 * Firestore-backed bookings. Collection: `bookings`, one document per booking,
 * sub-collection `bookings/{id}/history` for status transitions (audit trail).
 */
class FirestoreBookingDataSource @Inject constructor(
    private val firestore: FirebaseFirestore,
    private val auth: FirebaseAuth
) {

    private val bookingCollection = firestore.collection("bookings")

    private val customerId: String
        get() = auth.currentUser?.uid
            ?: throw IllegalStateException("No signed-in customer")

    suspend fun createBooking(
        salonId: String,
        serviceId: String,
        staffId: String?,
        startAt: Long,
        endAt: Long,
        notes: String?
    ): Booking {
        val ref = bookingCollection.document()
        val now = System.currentTimeMillis()
        val booking = Booking(
            id = ref.id,
            customerId = customerId,
            salonId = salonId,
            salonName = "", // filled by the UI from the salon detail screen
            serviceId = serviceId,
            serviceName = "", // filled by the UI
            staffId = staffId,
            startAt = startAt,
            endAt = endAt,
            status = BookingStatus.REQUESTED,
            createdAt = now
        )
        Tasks.await(
            ref.set(mapOf(
                "id" to booking.id,
                "customerId" to booking.customerId,
                "salonId" to booking.salonId,
                "salonName" to booking.salonName,
                "serviceId" to booking.serviceId,
                "serviceName" to booking.serviceName,
                "staffId" to booking.staffId,
                "startAt" to booking.startAt,
                "endAt" to booking.endAt,
                "status" to booking.status.name,
                "advanceAmount" to booking.advanceAmount,
                "currency" to booking.currency,
                "paymentStatus" to "pending",
                "notes" to notes,
                "createdAt" to now,
                "updatedAt" to FieldValue.serverTimestamp()
            )),
            10,
            java.util.concurrent.TimeUnit.SECONDS
        )
        return booking
    }

    suspend fun getMyBookings(): List<Booking> {
        val snap = Tasks.await(
            bookingCollection
                .whereEqualTo("customerId", customerId)
                .orderBy("startAt", Query.Direction.DESCENDING)
                .get(),
            10,
            java.util.concurrent.TimeUnit.SECONDS
        )
        return snap.documents.mapNotNull { it.toBooking() }
    }

    suspend fun cancelBooking(bookingId: String) {
        Tasks.await(
            bookingCollection.document(bookingId).update(
                "status" to BookingStatus.CANCELLED.name,
                "updatedAt" to FieldValue.serverTimestamp()
            ),
            10,
            java.util.concurrent.TimeUnit.SECONDS
        )
        Tasks.await(
            bookingCollection.document(bookingId).collection("history").document().set(mapOf(
                "status" to BookingStatus.CANCELLED.name,
                "at" to FieldValue.serverTimestamp()
            )),
            10,
            java.util.concurrent.TimeUnit.SECONDS
        )
    }

    fun watchMyBookings(): Flow<List<Booking>> = callbackFlow {
        val listener = bookingCollection
            .whereEqualTo("customerId", customerId)
            .orderBy("startAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, e ->
                if (e != null) {
                    close(e)
                    return@addSnapshotListener
                }
                val bookings = snapshot?.documents?.mapNotNull { it.toBooking() } ?: emptyList()
                trySend(bookings)
            }
        awaitClose { listener.remove() }
    }
}

private fun com.google.firebase.firestore.QueryDocumentSnapshot.toBooking(): Booking? {
    val id = id
    val customerId = getString("customerId") ?: return null
    val salonId = getString("salonId") ?: return null
    val salonName = getString("salonName") ?: ""
    val serviceId = getString("serviceId") ?: return null
    val serviceName = getString("serviceName") ?: ""
    val staffId = getString("staffId")
    val staffName = getString("staffName")
    val startAt = getLong("startAt") ?: return null
    val endAt = getLong("endAt") ?: return null
    val status = BookingStatus.valueOf(getString("status") ?: "REQUESTED")
    val advanceAmount = getLong("advanceAmount")?.toInt() ?: 0
    val currency = getString("currency") ?: "INR"
    val paymentStatus = getString("paymentStatus")
    val createdAt = getLong("createdAt") ?: System.currentTimeMillis()

    return Booking(
        id = id, customerId = customerId, salonId = salonId, salonName = salonName,
        serviceId = serviceId, serviceName = serviceName, staffId = staffId,
        staffName = staffName, startAt = startAt, endAt = endAt, status = status,
        advanceAmount = advanceAmount, currency = currency, paymentStatus = paymentStatus,
        createdAt = createdAt
    )
}

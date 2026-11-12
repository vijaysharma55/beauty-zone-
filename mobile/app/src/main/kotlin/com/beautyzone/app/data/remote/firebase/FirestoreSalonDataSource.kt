package com.beautyzone.app.data.remote.firebase

import com.beautyzone.app.domain.model.Salon
import com.beautyzone.app.domain.model.Service
import com.beautyzone.app.domain.model.StaffMember
import com.google.android.gms.tasks.Tasks
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import javax.inject.Inject

/**
 * Firestore-backed salon catalogue. Collection: `salons`.
 *
 * Notes for production scale: Firestore has no native geo queries, so
 * geo-filtering here is client-side after fetching a bounded candidate set.
 * For a large catalogue, add a geohash field to each salon document and
 * query by geohash prefix, or mirror the catalogue into Algolia/Elasticsearch
 * and keep this repository as the offline cache.
 */
class FirestoreSalonDataSource @Inject constructor(
    private val firestore: FirebaseFirestore
) {

    private val salonCollection = firestore.collection("salons")

    suspend fun searchSalons(query: String?, limit: Int): List<Salon> {
        val firestoreQuery: Query = salonCollection.let { ref ->
            query.takeIf { it.isNotBlank() }?.let { q ->
                ref.whereEqualTo("city", q) // simple textual filter; extend with category/tags
            } ?: ref
        }.limit(limit)

        val snap = Tasks.await(firestoreQuery.get(), 10, java.util.concurrent.TimeUnit.SECONDS)
        return snap.documents.mapNotNull { it.toSalon() }
    }

    suspend fun getSalon(salonId: String): Salon? =
        Tasks.await(
            salonCollection.document(salonId).get(),
            10,
            java.util.concurrent.TimeUnit.SECONDS
        ).toSalon()

    suspend fun getServices(salonId: String): List<Service> =
        Tasks.await(
            salonCollection.document(salonId).collection("services").get(),
            10,
            java.util.concurrent.TimeUnit.SECONDS
        ).documents.mapNotNull { it.toService(salonId) }

    suspend fun getStaff(salonId: String): List<StaffMember> =
        Tasks.await(
            salonCollection.document(salonId).collection("staff").get(),
            10,
            java.util.concurrent.TimeUnit.SECONDS
        ).documents.mapNotNull { it.toStaff(salonId) }

    fun watchSalons(): Flow<List<SalonFirestoreDto>> = callbackFlow {
        val listener = salonCollection.addSnapshotListener { snapshot, e ->
            if (e != null) {
                close(e)
                return@addSnapshotListener
            }
            val dtos = snapshot?.documents?.mapNotNull {
                it.toObject(SalonFirestoreDto::class.java)?.copy(id = it.id)
            } ?: emptyList()
            trySend(dtos)
        }
        awaitClose { listener.remove() }
    }

    suspend fun upsert(salon: com.beautyzone.app.domain.model.Salon) {
        Tasks.await(
            salonCollection.document(salon.id).set(mapOf(
                "id" to salon.id,
                "name" to salon.name,
                "slug" to salon.slug,
                "address" to salon.address,
                "city" to salon.city,
                "lat" to salon.lat,
                "lng" to salon.lng,
                "phone" to salon.phone,
                "rating" to salon.rating?.toDouble(),
                "imageUrl" to salon.imageUrl,
                "coverImageUrl" to salon.coverImageUrl,
                "description" to salon.description,
                "openingHours" to salon.openingHours,
                "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
            )),
            10,
            java.util.concurrent.TimeUnit.SECONDS
        )
    }
}

// ---------------------------------------------------------------------------
// Firestore DTOs (keep SDK types out of the domain layer)
// ---------------------------------------------------------------------------

data class SalonFirestoreDto(
    val id: String,
    val name: String,
    val slug: String,
    val address: String,
    val city: String,
    val lat: Double,
    val lng: Double,
    val phone: String? = null,
    val rating: Double? = null,
    val imageUrl: String? = null,
    val coverImageUrl: String? = null,
    val description: String? = null,
    val openingHours: Map<String, Any> = emptyMap()
)

data class ServiceFirestoreDto(
    val id: String,
    val name: String,
    val price: Int,
    val currency: String = "INR",
    val durationMin: Int,
    val description: String? = null,
    val category: String? = null
)

data class StaffFirestoreDto(
    val id: String,
    val name: String,
    val specialty: String? = null,
    val available: Boolean = true,
    val acceptsBookings: Boolean = true,
    val photoUrl: String? = null
)

// ---------------------------------------------------------------------------
// Mappers (Firestore document → domain model)
// ---------------------------------------------------------------------------

private fun com.google.firebase.firestore.QueryDocumentSnapshot.toSalon(): Salon? {
    val dto = toObject(SalonFirestoreDto::class.java) ?: return null
    return Salon(
        id = dto.id,
        name = dto.name,
        slug = dto.slug,
        address = dto.address,
        city = dto.city,
        lat = dto.lat,
        lng = dto.lng,
        phone = dto.phone,
        rating = dto.rating?.toFloat(),
        imageUrl = dto.imageUrl,
        coverImageUrl = dto.coverImageUrl,
        description = dto.description,
        openingHours = dto.openingHours.entries.associate { it.key to it.value.toString() }
    )
}

private fun com.google.firebase.firestore.QueryDocumentSnapshot.toSalonDto(): SalonFirestoreDto? =
    toObject(SalonFirestoreDto::class.java)?.let { it.copy(id = id) }

private fun com.google.firebase.firestore.QueryDocumentSnapshot.toService(salonId: String): Service? {
    val dto = toObject(ServiceFirestoreDto::class.java) ?: return null
    return Service(
        id = dto.id,
        salonId = salonId,
        name = dto.name,
        price = dto.price,
        currency = dto.currency,
        durationMin = dto.durationMin,
        description = dto.description,
        category = dto.category
    )
}

private fun com.google.firebase.firestore.QueryDocumentSnapshot.toStaff(salonId: String): StaffMember? {
    val dto = toObject(StaffFirestoreDto::class.java) ?: return null
    return StaffMember(
        id = dto.id,
        salonId = salonId,
        name = dto.name,
        specialty = dto.specialty,
        available = dto.available,
        acceptsBookings = dto.acceptsBookings,
        photoUrl = dto.photoUrl
    )
}

fun SalonFirestoreDto.toDomain(): Salon =
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
        coverImageUrl = coverImageUrl,
        description = description,
        openingHours = openingHours.entries.associate { it.key to it.value.toString() }
    )

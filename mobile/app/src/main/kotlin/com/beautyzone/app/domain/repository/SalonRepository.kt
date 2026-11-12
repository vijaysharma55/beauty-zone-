package com.beautyzone.app.domain.repository

import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.model.Salon
import com.beautyzone.app.domain.model.Service
import com.beautyzone.app.domain.model.StaffMember
import kotlinx.coroutines.flow.Flow

interface SalonRepository {

    /**
     * Search / discover salons. Optional geo filtering when the user's
     * location is known (results are distance-ranked client-side; see note in
     * the Firestore implementation about geo-hashing for production scale).
     */
    suspend fun searchSalons(
        lat: Double?,
        lng: Double?,
        query: String?,
        limit: Int = 20
    ): Resource<List<Salon>>

    suspend fun getSalonDetail(salonId: String): Resource<Salon>

    suspend fun getSalonServices(salonId: String): Resource<List<Service>>

    suspend fun getSalonStaff(salonId: String): Resource<List<StaffMember>>

    /**
     * Realtime salon list (Firestore snapshot listener exposed as Flow).
     */
    fun watchSalons(): Flow<Resource<List<Salon>>>
}

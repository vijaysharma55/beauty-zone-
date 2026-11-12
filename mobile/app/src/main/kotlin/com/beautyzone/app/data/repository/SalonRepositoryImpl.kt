package com.beautyzone.app.data.repository

import com.beautyzone.app.data.local.datastore.AppDataStore
import com.beautyzone.app.data.remote.firebase.FirestoreSalonDataSource
import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.domain.model.Salon
import com.beautyzone.app.domain.model.Service
import com.beautyzone.app.domain.model.StaffMember
import com.beautyzone.app.domain.repository.SalonRepository
import com.beautyzone.app.util.Extensions.sortedByDistance
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import android.content.Context
import javax.inject.Inject

class SalonRepositoryImpl @Inject constructor(
    private val firestoreSalonDataSource: FirestoreSalonDataSource,
    private val appDataStore: AppDataStore,
    @ApplicationContext private val context: Context
) : SalonRepository {

    override suspend fun searchSalons(
        lat: Double?,
        lng: Double?,
        query: String?,
        limit: Int
    ): Resource<List<Salon>> {
        return try {
            val salons = firestoreSalonDataSource.searchSalons(query, limit)
            val ranked = if (lat != null && lng != null) {
                salons.sortedByDistance(lat, lng)
            } else salons
            Resource.Success(ranked)
        } catch (e: Exception) {
            Resource.Error(e)
        }
    }

    override suspend fun getSalonDetail(salonId: String): Resource<Salon> =
        try {
            val salon = firestoreSalonDataSource.getSalon(salonId)
                ?: throw IllegalStateException("Salon not found")
            Resource.Success(salon)
        } catch (e: Exception) {
            Resource.Error(e)
        }

    override suspend fun getSalonServices(salonId: String): Resource<List<Service>> =
        try {
            Resource.Success(firestoreSalonDataSource.getServices(salonId))
        } catch (e: Exception) {
            Resource.Error(e)
        }

    override suspend fun getSalonStaff(salonId: String): Resource<List<StaffMember>> =
        try {
            Resource.Success(firestoreSalonDataSource.getStaff(salonId))
        } catch (e: Exception) {
            Resource.Error(e)
        }

    override fun watchSalons(): Flow<Resource<List<Salon>>> = flow {
        emit(Resource.Loading)
        try {
            firestoreSalonDataSource.watchSalons().collect { salonDtos ->
                val salons = salonDtos.map { it.toDomain() }
                emit(Resource.Success(salons))
            }
        } catch (e: Exception) {
            emit(Resource.Error(e))
        }
    }
}

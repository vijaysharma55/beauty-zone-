package com.beautyzone.app.background.workers

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.AssistedInject
import androidx.work.Assisted
import androidx.work.CoroutineWorker
import androidx.work.Result
import androidx.work.WorkerParameters
import com.beautyzone.app.data.remote.firebase.FirestoreSalonDataSource
import com.beautyzone.app.data.remote.retrofit.BeautyZoneRetrofitDataSource
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers

/**
 * Periodic worker that mirrors the public salon catalogue from the backend
 * into Firestore so the app can show salons even briefly offline.
 * Requires a network connection.
 */
@HiltWorker
class SalonSyncWorker @AssistedInject constructor(
    @Assisted private val context: Context,
    @Assisted private val params: WorkerParameters,
    private val beautyZoneApi: BeautyZoneRetrofitDataSource,
    private val salonDataSource: FirestoreSalonDataSource
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return withContext(Dispatchers.IO) {
            try {
                val response = beautyZoneApi.listSalons(limit = 100)
                if (response.isSuccessful) {
                    response.body()?.salons?.forEach { dto ->
                        salonDataSource.upsert(dto.toDomain())
                    }
                    Result.success()
                } else {
                    Result.failure()
                }
            } catch (e: Exception) {
                Result.failure()
            }
        }
    }
}

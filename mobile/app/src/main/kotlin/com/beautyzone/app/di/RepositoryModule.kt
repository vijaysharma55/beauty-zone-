package com.beautyzone.app.di

import com.beautyzone.app.data.repository.AuthRepositoryImpl
import com.beautyzone.app.data.repository.BookingRepositoryImpl
import com.beautyzone.app.data.repository.MapRepositoryImpl
import com.beautyzone.app.data.repository.NotificationRepositoryImpl
import com.beautyzone.app.data.repository.ProfileRepositoryImpl
import com.beautyzone.app.data.repository.SalonRepositoryImpl
import com.beautyzone.app.domain.repository.AuthRepository
import com.beautyzone.app.domain.repository.BookingRepository
import com.beautyzone.app.domain.repository.MapRepository
import com.beautyzone.app.domain.repository.NotificationRepository
import com.beautyzone.app.domain.repository.ProfileRepository
import com.beautyzone.app.domain.repository.SalonRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

/**
 * Binds each domain repository interface to its data-layer implementation.
 * Hilt does not do this automatically, so the bindings are explicit here.
 */
@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    abstract fun bindAuthRepository(impl: AuthRepositoryImpl): AuthRepository

    @Binds
    abstract fun bindSalonRepository(impl: SalonRepositoryImpl): SalonRepository

    @Binds
    abstract fun bindBookingRepository(impl: BookingRepositoryImpl): BookingRepository

    @Binds
    abstract fun bindProfileRepository(impl: ProfileRepositoryImpl): ProfileRepository

    @Binds
    abstract fun bindMapRepository(impl: MapRepositoryImpl): MapRepository

    @Binds
    abstract fun bindNotificationRepository(impl: NotificationRepositoryImpl): NotificationRepository
}

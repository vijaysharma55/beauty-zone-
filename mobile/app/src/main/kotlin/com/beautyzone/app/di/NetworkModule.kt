package com.beautyzone.app.di

import android.content.Context
import androidx.annotation.VisibleForTesting
import com.beautyzone.app.network.BeautyZoneApi
import com.beautyzone.app.network.directions.DirectionsApi
import com.google.android.gms.tasks.Tasks
import com.google.firebase.auth.FirebaseAuth
import com.squareup.okhttp3.Interceptor
import com.squareup.okhttp3.OkHttpClient
import com.squareup.okhttp3.logging.HttpLoggingInterceptor
import com.squareup.retrofit2.Retrofit
import com.squareup.retrofit2.converter.gson.GsonConverterFactory
import com.squareup.retrofit2.converter.scalars.ScalarsConverterFactory
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import java.util.concurrent.TimeUnit
import javax.inject.Named
import javax.inject.Singleton

/**
 * Network layer: OkHttp client (auth + connectivity interceptors, debug logging)
 * and two Retrofit instances:
 *   * "BeautyZoneApi" — our own backend (salon catalog, booking intake, directions proxy).
 *   * "DirectionsApi"  — Google Directions API via the backend proxy (the key never
 *                        reaches the client; the backend signs the request server-side).
 *
 * BuildConfig values (API_BASE_URL, GOOGLE_MAPS_API_KEY) are injected at build
 * time from `local.properties` / CI secrets — never hard-coded.
 */
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideOkHttpClient(
        @ApplicationContext context: Context,
        authInterceptor: AuthInterceptor,
        connectivityInterceptor: ConnectivityInterceptor
    ): OkHttpClient =
        OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .addInterceptor(connectivityInterceptor)
            .addInterceptor(authInterceptor)
            .apply {
                if (BuildConfig.DEBUG) {
                    addInterceptor(HttpLoggingInterceptor().setLevel(HttpLoggingInterceptor.Level.BODY))
                }
            }
            .build()

    @Provides
    @Singleton
    @Named("BeautyZoneApi")
    fun provideBeautyZoneRetrofit(
        @Named("BeautyZoneBaseUrl") baseUrl: String,
        client: OkHttpClient
    ): Retrofit =
        Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(ScalarsConverterFactory.create())
            .addConverterFactory(GsonConverterFactory.create())
            .build()

    @Provides
    @Singleton
    @Named("BeautyZoneApi")
    fun provideBeautyZoneApi(retrofit: Retrofit): BeautyZoneApi = retrofit.create(BeautyZoneApi::class.java)

    @Provides
    @Singleton
    @Named("DirectionsApi")
    fun provideDirectionsRetrofit(
        @Named("BeautyZoneBaseUrl") baseUrl: String,
        client: OkHttpClient
    ): Retrofit =
        Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(ScalarsConverterFactory.create()) // raw String responses
            .addConverterFactory(GsonConverterFactory.create())
            .build()

    @Provides
    @Singleton
    @Named("DirectionsApi")
    fun provideDirectionsApi(retrofit: Retrofit): DirectionsApi = retrofit.create(DirectionsApi::class.java)

    @Provides
    @Singleton
    @Named("BeautyZoneBaseUrl")
    fun provideBaseUrl(): String = BuildConfig.API_BASE_URL
}

/**
 * Attaches the current Firebase ID token to requests that hit our own backend,
 * so the backend can verify the caller without the client ever handling a
 * secret. The token read is best-effort (cached ID token); a blocking await
 * with a short timeout runs on the OkHttp dispatcher, not the UI thread.
 */
class AuthInterceptor @Inject constructor(private val auth: FirebaseAuth) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): com.squareup.okhttp3.Response {
        val user = auth.currentUser
        val token = if (user != null) Tasks.await(user.getIdToken(false), 5, TimeUnit.SECONDS) else null
        val request = chain.request().newBuilder().apply {
            token?.let { addHeader("Authorization", "Bearer $it") }
        }.build()
        return chain.proceed(request)
    }
}

/**
 * Fails fast with a clear error when there is no network, instead of letting
 * opaque socket exceptions propagate to the UI.
 */
class ConnectivityInterceptor @Inject constructor(private val context: Context) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): com.squareup.okhttp3.Response {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as android.net.ConnectivityManager
        val activeNetwork = connectivityManager.activeNetwork ?: throw NoConnectivityException()
        val capabilities = connectivityManager.getNetworkCapabilities(activeNetwork) ?: throw NoConnectivityException()
        if (!capabilities.hasTransport(android.net.NetworkCapabilities.TRANSPORT_WIFI)
            && !capabilities.hasTransport(android.net.NetworkCapabilities.TRANSPORT_CELLULAR)
            && !capabilities.hasTransport(android.net.NetworkCapabilities.TRANSPORT_ETHERNET)
        ) {
            throw NoConnectivityException()
        }
        return chain.proceed(chain.request())
    }
}

class NoConnectivityException : Exception("No internet connection")

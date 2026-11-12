package com.beautyzone.app.util

import com.beautyzone.app.domain.model.Salon
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Pure-Kotlin unit tests — no Android SDK required, runnable on any JVM.
 */
class ExtensionsTest {

    @Test
    fun haversine_jaipurToDelhiIsApproximately235km() {
        // Jaipur (26.9124, 75.7873) to Delhi (28.6139, 77.2090)
        val meters = haversineMeters(26.9124, 75.7873, 28.6139, 77.2090)
        assertTrue("expected ~235 km, got $meters m", meters in 200_000..300_000)
    }

    @Test
    fun haversine_samePointIsZero() {
        assertEquals(0.0, haversineMeters(26.9124, 75.7873, 26.9124, 75.7873), 1e-6)
    }

    @Test
    fun sortedByDistance_ordersByProximity() {
        val salons = listOf(
            Salon("s3", "Far", "far", "x", "city", 26.9124, 76.7873),
            Salon("s1", "Near", "near", "x", "city", 26.9124, 75.7873),
            Salon("s2", "Mid", "mid", "x", "city", 27.0, 75.9)
        )
        val sorted = salons.sortedByDistance(26.9124, 75.7873)
        assertEquals(listOf("s1", "s2", "s3"), sorted.map { it.id })
    }
}

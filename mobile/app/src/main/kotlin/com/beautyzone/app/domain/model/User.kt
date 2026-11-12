package com.beautyzone.app.domain.model

/**
 * Authenticated app user (customer). Pure domain model — no SDK types.
 */
data class User(
    val id: String,
    val phone: String,
    val name: String? = null,
    val email: String? = null,
    val photoUrl: String? = null,
    val fcmToken: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val notificationsEnabled: Boolean = true
)

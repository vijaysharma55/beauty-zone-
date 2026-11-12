package com.beautyzone.app.background.workers

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.AssistedInject
import androidx.work.Assisted
import androidx.work.CoroutineWorker
import androidx.work.Result
import androidx.work.WorkerParameters
import com.beautyzone.app.background.BookingReminderNotifier
import com.beautyzone.app.domain.repository.BookingRepository
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers

/**
 * One-time reminder worker, scheduled shortly before a confirmed appointment.
 * Enqueued via {@link com.beautyzone.app.background.WorkEnqueuer} with a unique
 * work name per booking so reminders are never duplicated.
 */
@HiltWorker
class BookingReminderWorker @AssistedInject constructor(
    @Assisted private val context: Context,
    @Assisted private val params: WorkerParameters,
    private val bookingRepository: BookingRepository,
    private val notifier: BookingReminderNotifier
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val bookingId = inputData.getString("bookingId") ?: return Result.failure()
        return withContext(Dispatchers.IO) {
            val result = bookingRepository.getMyBookings()
            val booking = (result as? com.beautyzone.app.domain.model.Resource.Success<*>)
                ?.data as? List<*>
                ?.firstOrNull { (it as? com.beautyzone.app.domain.model.Booking)?.id == bookingId }
                as? com.beautyzone.app.domain.model.Booking

            if (booking == null || booking.status != com.beautyzone.app.domain.model.BookingStatus.CONFIRMED) {
                Result.success() // nothing to remind about
            } else {
                notifier.sendReminder(booking)
                Result.success()
            }
        }
    }
}

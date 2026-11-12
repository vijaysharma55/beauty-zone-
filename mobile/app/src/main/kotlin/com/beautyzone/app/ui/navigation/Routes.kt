package com.beautyzone.app.ui.navigation

object Routes {
    const val Splash = "splash"
    const val PhoneLogin = "phone_login"
    const val Otp = "otp"
    const val Main = "main" // bottom-nav root
    const val Home = "home"
    const val Map = "map/{?selectedSalonId}"
    const val Bookings = "bookings"
    const val Profile = "profile"
    const val SalonDetail = "salon_detail/{salonId}"
    const val Booking = "booking/{salonId}"
    const val BookingConfirmation = "booking_confirmation/{bookingId}"
    const val DocumentUpload = "document_upload"
}

object NavArgs {
    const val SalonId = "salonId"
    const val BookingId = "bookingId"
    const val SelectedSalonId = "selectedSalonId"
}

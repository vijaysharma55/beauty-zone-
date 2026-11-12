package com.beautyzone.app.ui.navigation

import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.navigation.NavHost
import androidx.compose.navigation.composable
import androidx.compose.navigation.navArgument
import androidx.compose.navigation.rememberNavController
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.collectAsStateWithLifecycle
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import com.beautyzone.app.domain.model.Resource
import com.beautyzone.app.ui.components.AppScaffold
import com.beautyzone.app.ui.components.ErrorScreen
import com.beautyzone.app.ui.components.LoadingScreen
import com.beautyzone.app.ui.screens.booking.BookingConfirmationScreen
import com.beautyzone.app.ui.screens.booking.BookingScreen
import com.beautyzone.app.ui.screens.auth.OtpScreen
import com.beautyzone.app.ui.screens.auth.PhoneLoginScreen
import com.beautyzone.app.ui.screens.auth.AuthViewModel
import com.beautyzone.app.ui.screens.document.DocumentUploadScreen
import com.beautyzone.app.ui.screens.home.HomeScreen
import com.beautyzone.app.ui.screens.map.MapScreen
import com.beautyzone.app.ui.screens.profile.ProfileScreen
import com.beautyzone.app.ui.screens.salon.SalonDetailScreen
import com.beautyzone.app.ui.screens.splash.SplashScreen

/**
 * Single navigation graph for the whole app.
 *
 * Auth gate: while there is no signed-in user the user lands on the phone
 * login / OTP flow; afterwards the main bottom-nav tabs are shown. Deep links
 * (booking reminders, email links) enter at Main and are routed to the
 * matching destination by the ViewModel.
 */
@Composable
fun NavGraph() {
    val navController = rememberNavController()
    val authViewModel: AuthViewModel = hiltViewModel()
    val uiState by authViewModel.uiState.collectAsStateWithLifecycle()

    val isAuthenticated by derivedStateOf {
        when (val state = uiState) {
            is Resource.Success -> state.data != null
            is Resource.Loading -> false
            is Resource.Error -> false
        }
    }

    Surface(modifier = Modifier.fillMaxSize()) {
        NavHost(
            navController = navController,
            startDestination = if (isAuthenticated) Routes.Main else Routes.Splash,
        ) {
            // --- Auth flow ---
            composable(Routes.Splash) {
                SplashScreen(
                    onAuthenticated = { /* handled by state */ },
                    onNotAuthenticated = { /* handled by state */ }
                )
                // Splash auto-routes via LaunchedEffect below
            }
            composable(Routes.PhoneLogin) {
                PhoneLoginScreen(
                    onOtpSent = { verificationId ->
                        navController.navigate(Routes.Otp) {
                            popUpTo(Routes.PhoneLogin) { inclusive = true }
                        }
                    }
                )
            }
            composable(Routes.Otp) {
                OtpScreen(
                    onVerified = {
                        navController.navigate(Routes.Main) {
                            popUpTo(Routes.Splash) { inclusive = true }
                        }
                    }
                )
            }

            // --- Main app (bottom nav) ---
            composable(Routes.Main) {
                MainScreen(
                    selectedRoute = currentRoute(navController),
                    onTabSelected = { route ->
                        navController.navigate(route) {
                            popUpTo(Routes.Main) { inclusive = true }
                        }
                    }
                )
            }
            composable(Routes.Home) { HomeScreen() }
            composable(Routes.Map) { backStackEntry ->
                MapScreen(
                    selectedSalonId = backStackEntry.arguments?.getString(NavArgs.SelectedSalonId)
                )
            }
            composable(Routes.Bookings) { /* bookings tab content inside MainScreen */ }
            composable(Routes.Profile) { ProfileScreen() }

            // --- Detail / booking flow ---
            composable(Routes.SalonDetail) { backStackEntry ->
                val salonId = backStackEntry.arguments?.getString(NavArgs.SalonId) ?: ""
                SalonDetailScreen(salonId = salonId)
            }
            composable(Routes.Booking) { backStackEntry ->
                val salonId = backStackEntry.arguments?.getString(NavArgs.SalonId) ?: ""
                BookingScreen(salonId = salonId)
            }
            composable(Routes.BookingConfirmation) { backStackEntry ->
                val bookingId = backStackEntry.arguments?.getString(NavArgs.BookingId) ?: ""
                BookingConfirmationScreen(bookingId = bookingId)
            }
            composable(Routes.DocumentUpload) {
                DocumentUploadScreen()
            }
        }

        // Auto-route out of splash once auth state resolves.
        androidx.compose.runtime.LaunchedEffect(uiState) {
            when (val state = uiState) {
                is Resource.Loading -> Unit
                is Resource.Success -> if (state.data != null) {
                    navController.navigate(Routes.Main) {
                        popUpTo(Routes.Splash) { inclusive = true }
                    }
                } else {
                    navController.navigate(Routes.PhoneLogin) {
                        popUpTo(Routes.Splash) { inclusive = true }
                    }
                }
                is Resource.Error -> navController.navigate(Routes.PhoneLogin) {
                    popUpTo(Routes.Splash) { inclusive = true }
                }
            }
        }
    }
}

private fun currentRoute(navController: androidx.compose.navigation.NavHostController): String =
    navController.currentBackStackEntryAsState().value.route

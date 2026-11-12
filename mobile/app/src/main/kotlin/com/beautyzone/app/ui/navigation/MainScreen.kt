package com.beautyzone.app.ui.navigation

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.beautyzone.app.ui.components.BottomNavBar
import com.beautyzone.app.ui.screens.bookings.BookingsScreen
import com.beautyzone.app.ui.screens.home.HomeScreen
import com.beautyzone.app.ui.screens.map.MapScreen
import com.beautyzone.app.ui.screens.profile.ProfileScreen

/**
 * Tab host: bottom navigation + the four tab contents. Tab selection swaps the
 * inner destination without leaving the `Routes.Main` stack entry.
 */
@Composable
fun MainScreen(
    selectedRoute: String,
    onTabSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedTab by remember { mutableStateOf(selectedRoute) }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        bottomBar = {
            BottomNavBar(
                selectedRoute = selectedTab,
                onTabSelected = { route ->
                    selectedTab = route
                    onTabSelected(route)
                }
            )
        },
        containerColor = androidx.compose.material3.MaterialTheme.colorScheme.background
    ) { padding ->
        when (selectedTab) {
            Routes.Home -> HomeScreen(modifier = Modifier.padding(padding))
            Routes.Map -> MapScreen(modifier = Modifier.padding(padding))
            Routes.Bookings -> BookingsScreen(modifier = Modifier.padding(padding))
            Routes.Profile -> ProfileScreen(modifier = Modifier.padding(padding))
            else -> HomeScreen(modifier = Modifier.padding(padding))
        }
    }
}

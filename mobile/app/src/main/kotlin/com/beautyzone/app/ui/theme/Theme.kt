package com.beautyzone.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.platform.LocalContext
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import android.app.Activity
import androidx.compose.ui.graphics.Color

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BeautyZoneTheme(
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && isSystemInDarkTheme() -> dynamicDarkColorScheme()
        dynamicColor -> dynamicLightColorScheme()
        else -> LightColorScheme
    }
    val darkColorScheme = when {
        dynamicColor && isSystemInDarkTheme() -> dynamicDarkColorScheme()
        dynamicColor -> dynamicLightColorScheme()
        else -> DarkColorScheme
    }
    val isDark = colorScheme.isDark

    MaterialTheme(
        colorScheme = if (isDark) darkColorScheme else colorScheme,
        typography = BeautyZoneTypography,
        content = content
    )

    // Status / navigation bar colors so the app looks edge-to-edge.
    SideEffect {
        val activity = LocalContext.current as Activity
        val window = activity.window
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.isAppearanceLightStatusBars = !isDark
        controller.isAppearanceLightNavigationBars = !isDark
    }
}

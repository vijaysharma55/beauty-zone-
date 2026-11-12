package com.beautyzone.app.ui.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.graphics.toweek

private val BrandPrimary = Color(0xFF7B522D)
private val BrandPrimaryContainer = Color(0xFFFFDDBE)
private val BrandSecondary = Color(0xFF8A6D45)
private val BrandTertiary = Color(0xFFB7794F)

private val DarkPrimary = Color(0xFFFF9F75)
private val DarkPrimaryContainer = Color(0xFF4A2E1D)
private val DarkSecondary = Color(0xFFC48F5D)
private val DarkTertiary = Color(0xFFE1A36E)

/** Light color scheme seeded with the BeautyZone brand. */
val LightColorScheme = ColorScheme(
    primary = BrandPrimary,
    onPrimary = Color.White,
    primaryContainer = BrandPrimaryContainer,
    onPrimaryContainer = Color(0xFF4A2E1D),
    secondary = BrandSecondary,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFEFE3D8),
    onSecondaryContainer = Color(0xFF211E1B),
    tertiary = BrandTertiary,
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFEFDCCB),
    onTertiaryContainer = Color(0xFF211E1B),
    error = Color(0xFFB3261E),
    errorContainer = Color(0xFFF9DEDC),
    onError = Color.White,
    onErrorContainer = Color(0xFFB3261E),
    background = Color(0xFFFDFAF4),
    onBackground = Color(0xFF211E1B),
    surface = Color(0xFFFDFAF4),
    onSurface = Color(0xFF211E1B),
    surfaceVariant = Color(0xFFEFE3D8),
    onSurfaceVariant = Color(0xFF53493E),
    outline = Color(0xFF8A7365),
    outlineVariant = Color(0xFFD9CBBF),
    inverseSurface = Color(0xFF211E1B),
    inverseOnSurface = Color(0xFFFDFAF4),
    inversePrimary = DarkPrimary,
    surfaceDim = Color(0xFFD6C8B8),
    surfaceBright = Color(0xFFFDFAF4),
    surfaceContainerLowest = Color.White,
    surfaceContainerLow = Color(0xFFF7EEDE),
    surfaceContainer = Color(0xFFEFE3D8),
    surfaceContainerHigh = Color(0xFFE7D7C6),
    surfaceContainerHighest = Color(0xFFD9CBBF)
)

/** Dark color scheme. */
val DarkColorScheme = ColorScheme(
    primary = DarkPrimary,
    onPrimary = Color(0xFF3A1E10),
    primaryContainer = DarkPrimaryContainer,
    onPrimaryContainer = Color(0xFFFFDDBE),
    secondary = DarkSecondary,
    onSecondary = Color(0xFF392E20),
    secondaryContainer = Color(0xFF4E4032),
    onSecondaryContainer = Color(0xFFEFE3D8),
    tertiary = DarkTertiary,
    onTertiary = Color(0xFF3B2616),
    tertiaryContainer = Color(0xFF634B37),
    onTertiaryContainer = Color(0xFFEFDCCB),
    error = Color(0xFFFF8A72),
    errorContainer = Color(0xFF6B211A),
    onError = Color(0xFF3A0D08),
    onErrorContainer = Color(0xFFFFD9D6),
    background = Color(0xFF1C1917),
    onBackground = Color(0xFFFFF9F1),
    surface = Color(0xFF1C1917),
    onSurface = Color(0xFFFFF9F1),
    surfaceVariant = Color(0xFF332B24),
    onSurfaceVariant = Color(0xFFCBB4A4),
    outline = Color(0xFF53493E),
    outlineVariant = Color(0xFF332B24),
    inverseSurface = Color(0xFFFFF9F1),
    inverseOnSurface = Color(0xFF1C1917),
    inversePrimary = BrandPrimary,
    surfaceDim = Color(0xFF1C1917),
    surfaceBright = Color(0xFF332B24),
    surfaceContainerLowest = Color(0xFF141210),
    surfaceContainerLow = Color(0xFF24211F),
    surfaceContainer = Color(0xFF2B2825),
    surfaceContainerHigh = Color(0xFF373430),
    surfaceContainerHighest = Color(0xFF3F3C38)
)

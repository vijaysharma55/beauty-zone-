package com.beautyzone.app.ui.navigation

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.materialSymbols
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.beautyzone.app.ui.screens.home.HomeViewModel

@Composable
fun BottomNavBar(
    selectedRoute: String,
    onTabSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth().height(56.dp),
        color = MaterialTheme.colorScheme.surfaceContainer
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            val tabs = listOf(
                TabItem(Routes.Home, "Home", materialSymbols.filled.Home),
                TabItem(Routes.Map, "Map", materialSymbols.filled.Map),
                TabItem(Routes.Bookings, "Bookings", materialSymbols.filled.EventNote),
                TabItem(Routes.Profile, "Profile", materialSymbols.filled.Person)
            )
            tabs.forEach { tab ->
                val selected = selectedRoute == tab.route
                IconButton(
                    onClick = { onTabSelected(tab.route) },
                    enabled = !selected
                ) {
                    Icon(
                        imageVector = tab.icon,
                        contentDescription = tab.label,
                        tint = if (selected) MaterialTheme.colorScheme.primary else LocalContentColor.current.copy(alpha = 0.6f)
                    )
                    Text(
                        text = tab.label,
                        fontSize = 10.sp,
                        fontWeight = androidx.compose.ui.text.font.FontWeight.if (selected) 600 else 400,
                        color = if (selected) MaterialTheme.colorScheme.primary else LocalContentColor.current.copy(alpha = 0.6f)
                    )
                }
            }
        }
    }
}

private data class TabItem(
    val route: String,
    val label: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector
)

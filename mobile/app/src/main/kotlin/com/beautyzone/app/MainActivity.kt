package com.beautyzone.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import dagger.hilt.android.AndroidEntryPoint
import com.beautyzone.app.ui.theme.BeautyZoneTheme
import com.beautyzone.app.ui.navigation.NavGraph

/**
 * Single Activity hosting the entire Navigation Compose graph.
 * @AndroidEntryPoint enables Hilt viewModel injection in all destinations.
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            BeautyZoneTheme {
                NavGraph()
            }
        }
    }
}

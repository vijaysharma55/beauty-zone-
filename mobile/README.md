# BeautyZone Mobile — Native Android Customer App

Native Android companion for the BeautyZone salon platform: salon discovery,
Google Maps integration with directions, appointment booking, Firebase phone OTP
auth, push notifications (FCM), document uploads to Firebase Storage, and offline
preferences via DataStore.

## Tech stack

- Kotlin, Jetpack Compose, Material 3
- MVVM + clean layers: UI / ViewModel / Domain / Repository / Data / Network / Background Services
- Kotlin Coroutines & Flow
- Navigation Compose
- Hilt (dependency injection)
- Retrofit + OkHttp (REST integration with the BeautyZone backend)
- Firebase Authentication (phone OTP), Cloud Firestore, Firebase Storage, FCM
- Google Maps SDK for Android + Maps Compose, Google Directions API (via backend proxy)
- Fused Location Provider, WorkManager, DataStore (Preferences)

## Layer structure

```
app/src/main/kotlin/com/beautyzone/app/
├── di/                 # Hilt modules (App, Network, Firebase, ViewModels)
├── network/            # Retrofit services, DTOs, mappers
├── domain/             # Pure Kotlin models, repository interfaces, use cases
├── data/               # Repository impls, Firebase/Retrofit data sources,
│   │                   # DataStore, FusedLocation data source
├── background/         # WorkManager workers (booking reminders, sync)
├── main/               # Hilt Application class
└── ui/                 # Compose UI: theme, navigation, screens, components
```

## Secrets — never in source code

1. Copy `mobile/local.properties.example` → `mobile/local.properties` and fill in
   `GOOGLE_MAPS_API_KEY` and `BEAUTYZONE_API_BASE_URL`. `local.properties` is
   gitignored.
2. Place your Firebase config at `mobile/app/google-services.json` (from the
   Firebase console). It is gitignored and must never be committed.
3. In CI, inject secrets as environment variables / repository secrets and write
   them into `local.properties` and `google-services.json` at build time.

Never embed API keys, Firebase credentials, or signing keys in Kotlin/XML files.

## Build

This module was scaffolded in an environment without the Android SDK/Gradle, so
it has not been compiled here. Open `mobile/` in Android Studio (Hedgehog or
newer), sync Gradle, and run:

```bash
cd mobile
./gradlew assembleDebug      # debug APK
./gradlew assembleRelease    # release APK (needs signing config)
./gradlew lintDebug          # lint + static checks
```

Minimum SDK: 24, Target SDK: 35, Compile SDK: 35.

## CI

See `mobile/.github/workflows/android-ci.yml` for the Gradle-based CI workflow.
Secrets (`GOOGLE_MAPS_API_KEY`, `BEAUTYZONE_API_BASE_URL`, Firebase service
account contents) must be configured as GitHub repository secrets.

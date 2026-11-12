# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.kts.

# For more details, see
#   https://developer.android.com/studio/build/shrink-code.html

# Keep Hilt-generated code.
-keep class com.beautyzone.app.di.Hilt_* { *; }
-keep class * extends dagger.internal.*

# Keep Firebase classes used reflectively.
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Keep model data classes and their constructors (used by Gson / Firestore).
-keep class com.beautyzone.app.domain.model.** { *; }
-keep class com.beautyzone.app.network.dto.** { *; }

# Retrofit / Gson
-keepattributes Signature, InnerClasses, EnclosingMethod
-keep class com.squareup.** { *; }
-keep interface com.squareup.** { *; }

# WorkManager
-keep class androidx.work.** { *; }

# Google Maps
-keep class com.google.android.gms.maps.** { *; }

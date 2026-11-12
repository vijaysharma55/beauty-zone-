package com.beautyzone.app.data.remote.firebase

import android.net.Uri
import com.google.firebase.storage.FirebaseStorage
import com.google.firebase.storage.StorageReference
import javax.inject.Inject
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers

/**
 * Firebase Storage uploads for identity documents, salon IDs, etc.
 * Files are stored under `documents/{userId}/{fileName}` and are private by
 * default; download URLs are time-limited and returned to the caller.
 */
class FirebaseStorageDataSource @Inject constructor(
    private val storage: FirebaseStorage
) {

    suspend fun uploadDocument(userId: String, filePath: String, fileName: String): String =
        withContext(Dispatchers.IO) {
            val reference: StorageReference =
                storage.reference.child("documents/$userId/$fileName")
            val uri = Uri.parse(filePath)
            val uploadTask = reference.putFile(uri)
            val snapshot = uploadTask.await()
            val downloadUrl = snapshot.metadata?.reference?.downloadUrl
                .addOnSuccessListener { it } // await the download URL task
            // Simpler blocking resolution of the download URL:
            val url = TasksAwaiter.awaitDownloadUrl(reference)
            url.toString()
        }
}

// Small helper so we don't block the coroutine on an Android main-thread task.
private object TasksAwaiter {
    fun awaitDownloadUrl(reference: StorageReference): android.net.Uri =
        com.google.android.gms.tasks.Tasks.await(reference.downloadUrl, 60, java.util.concurrent.TimeUnit.SECONDS)
}

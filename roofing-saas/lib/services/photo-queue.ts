/**
 * Photo Queue Service
 * Manages offline photo upload queue with automatic retry and sync
 */

import { db, QueuedPhoto } from '@/lib/db/offline-queue';
import { createClient } from '@/lib/supabase/client';

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000; // 1 second

/**
 * Add photo to offline queue
 */
export async function addPhotoToQueue(
  file: File,
  contactId: string,
  metadata: QueuedPhoto['metadata'],
  tenantId: string,
  projectId?: string
): Promise<string> {
  const localId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Store file data as Blob + metadata separately.
    // File objects don't reliably survive IndexedDB round-trips in Safari.
    await db.queuedPhotos.add({
      localId,
      fileData: new Blob([file], { type: file.type }),
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      contactId,
      projectId,
      metadata,
      status: 'pending',
      attempts: 0,
      createdAt: new Date().toISOString(),
      tenantId,
    });

    console.log(`✅ Photo ${localId} added to queue`);

    // Trigger background sync (non-blocking - photo is already safely queued)
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const syncTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Service worker ready timeout')), 3000)
      );

      Promise.race([navigator.serviceWorker.ready, syncTimeout])
        .then(registration => {
          if ('sync' in registration) {
            return (registration as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register('photo-sync');
          } else if (navigator.onLine) {
            return processPhotoQueue();
          }
        })
        .then(() => console.log('📡 Background sync registered'))
        .catch(error => {
          console.warn('Background sync not available, using fallback:', error);
          if (navigator.onLine) {
            processPhotoQueue().catch(console.error);
          }
        });
    } else if (typeof window !== 'undefined' && navigator.onLine) {
      // No service worker support - process immediately
      processPhotoQueue().catch(console.error);
    }

    return localId;
  } catch (error) {
    console.error('❌ Failed to add photo to queue:', error);
    throw error;
  }
}

/**
 * Process all pending photos in queue
 */
export async function processPhotoQueue(): Promise<void> {
  console.log('🔄 Processing photo queue...');

  try {
    const pendingPhotos = await db.queuedPhotos
      .where('status')
      .anyOf(['pending', 'failed'])
      .and(photo => photo.attempts < MAX_RETRY_ATTEMPTS)
      .toArray();

    if (pendingPhotos.length === 0) {
      console.log('✅ Queue is empty');
      return;
    }

    console.log(`📸 Processing ${pendingPhotos.length} photos`);

    const results = await Promise.allSettled(
      pendingPhotos.map(photo => uploadQueuedPhoto(photo))
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Upload complete: ${succeeded} succeeded, ${failed} failed`);
  } catch (error) {
    console.error('❌ Queue processing error:', error);
    throw error;
  }
}

/**
 * Upload a single queued photo
 */
async function uploadQueuedPhoto(photo: QueuedPhoto): Promise<void> {
  if (!photo.id) {
    throw new Error('Photo ID is required');
  }

  // Update status to syncing
  await db.queuedPhotos.update(photo.id, {
    status: 'syncing',
    lastAttempt: new Date().toISOString(),
  });

  try {
    const supabase = createClient();

    // Validate that stored data exists (old-format queue entries may lack fileData)
    if (!photo.fileData) {
      console.warn(`⚠️ Photo ${photo.localId} has no file data (old queue format). Removing from queue.`);
      await db.queuedPhotos.update(photo.id!, { status: 'failed', error: 'Missing file data — photo must be retaken' });
      return;
    }

    // Get current user for uploaded_by
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Reconstruct File from stored Blob + metadata
    const file = new File([photo.fileData], photo.fileName || `photo_${Date.now()}.jpg`, { type: photo.fileType || 'image/jpeg' });

    // Generate unique file name
    const timestamp = Date.now();
    const sanitizedName = photo.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${photo.tenantId}/${photo.contactId}/${timestamp}_${sanitizedName}`;

    console.log(`📤 Uploading ${storagePath}...`);

    // Upload to Supabase Storage (use property-photos bucket)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('property-photos')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL (use property-photos bucket)
    const { data: { publicUrl } } = supabase.storage
      .from('property-photos')
      .getPublicUrl(uploadData.path);

    // Parse damage/claim info from notes JSON
    let damageType: string | undefined;
    let severity: string | undefined;
    let photoOrder: number | undefined;
    let claimId: string | undefined;
    if (photo.metadata.notes) {
      try {
        const parsed = JSON.parse(photo.metadata.notes);
        damageType = parsed.damageType;
        severity = parsed.severity;
        photoOrder = parsed.photoOrder;
        claimId = parsed.claimId;
      } catch {
        // notes is plain text, not JSON
      }
    }

    // Build insert — only columns that exist in the photos table
    const insertData: Record<string, unknown> = {
      tenant_id: photo.tenantId,
      contact_id: photo.contactId || null,
      project_id: photo.projectId || null,
      file_url: publicUrl,
      file_path: uploadData.path,
      uploaded_by: user.id,
      metadata: {
        file_name: photo.fileName,
        file_size: photo.fileSize,
        file_type: photo.fileType,
        latitude: photo.metadata.latitude,
        longitude: photo.metadata.longitude,
        notes: photo.metadata.notes,
        captured_at: photo.metadata.capturedAt,
      },
    };

    // Only include optional columns if they have values
    if (damageType) insertData.damage_type = damageType;
    if (severity) insertData.severity = severity;
    if (photoOrder !== undefined) insertData.photo_order = photoOrder;
    if (claimId) insertData.claim_id = claimId;

    // Insert into photos table
    const { error: dbError } = await supabase
      .from('photos')
      .insert(insertData)
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    // Mark as completed
    await db.queuedPhotos.update(photo.id, {
      status: 'completed',
    });

    console.log(`✅ Photo ${photo.localId} uploaded successfully`);

    // Schedule cleanup after 24 hours
    setTimeout(() => {
      db.queuedPhotos.where('id').equals(photo.id!).delete();
    }, 24 * 60 * 60 * 1000);

  } catch (error) {
    const attempts = photo.attempts + 1;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error(`❌ Upload failed (attempt ${attempts}/${MAX_RETRY_ATTEMPTS}):`, errorMessage);

    // Update with error status
    await db.queuedPhotos.update(photo.id, {
      status: attempts >= MAX_RETRY_ATTEMPTS ? 'failed' : 'pending',
      attempts,
      lastAttempt: new Date().toISOString(),
      error: errorMessage,
    });

    // Exponential backoff for retry
    if (attempts < MAX_RETRY_ATTEMPTS) {
      const delay = RETRY_DELAY_BASE * Math.pow(2, attempts - 1);
      console.log(`⏰ Retrying in ${delay}ms...`);
      setTimeout(() => processPhotoQueue(), delay);
    }

    throw error;
  }
}

/**
 * Retry failed photos
 */
export async function retryFailedPhotos(): Promise<void> {
  console.log('🔄 Retrying failed photos...');

  const failedPhotos = await db.queuedPhotos
    .where('status')
    .equals('failed')
    .toArray();

  if (failedPhotos.length === 0) {
    console.log('✅ No failed photos to retry');
    return;
  }

  // Reset attempts for retry
  await Promise.all(
    failedPhotos.map(photo =>
      photo.id ? db.queuedPhotos.update(photo.id, {
        status: 'pending',
        attempts: 0,
        error: undefined,
      }) : Promise.resolve()
    )
  );

  // Process queue
  await processPhotoQueue();
}

/**
 * Delete a photo from queue
 */
export async function deleteQueuedPhoto(localId: string): Promise<void> {
  const deleted = await db.queuedPhotos
    .where('localId')
    .equals(localId)
    .delete();

  if (deleted === 0) {
    throw new Error(`Photo ${localId} not found in queue`);
  }

  console.log(`🗑️ Photo ${localId} deleted from queue`);
}

/**
 * Get all queued photos
 */
export async function getQueuedPhotos(): Promise<QueuedPhoto[]> {
  return await db.queuedPhotos
    .where('status')
    .notEqual('completed')
    .reverse()
    .sortBy('createdAt');
}

/**
 * Get queue status summary
 */
export async function getQueueStatus() {
  const photos = await db.queuedPhotos
    .where('status')
    .notEqual('completed')
    .toArray();

  return {
    total: photos.length,
    pending: photos.filter(p => p.status === 'pending').length,
    syncing: photos.filter(p => p.status === 'syncing').length,
    failed: photos.filter(p => p.status === 'failed').length,
  };
}

/**
 * Setup network listeners for auto-sync
 */
export function setupNetworkListeners(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    console.log('🌐 Network online - processing queue');
    processPhotoQueue().catch(console.error);
  });

  window.addEventListener('offline', () => {
    console.log('📴 Network offline - queue will sync when online');
  });

  // Process queue on initial load if online
  if (navigator.onLine) {
    processPhotoQueue().catch(console.error);
  }
}

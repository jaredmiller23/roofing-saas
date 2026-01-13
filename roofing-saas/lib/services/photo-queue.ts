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
    await db.queuedPhotos.add({
      localId,
      file,
      contactId,
      projectId,
      metadata,
      status: 'pending',
      attempts: 0,
      createdAt: new Date().toISOString(),
      tenantId,
    });

    console.log(`✅ Photo ${localId} added to queue`);

    // Trigger background sync if available
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          await (registration as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register('photo-sync');
          console.log('📡 Background sync registered');
        } else {
          // Fallback: process immediately if online
          if (navigator.onLine) {
            processPhotoQueue().catch(console.error);
          }
        }
      } catch (error) {
        console.warn('Background sync not available, using fallback:', error);
        if (navigator.onLine) {
          processPhotoQueue().catch(console.error);
        }
      }
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

    // Generate unique file name
    const timestamp = Date.now();
    const sanitizedName = photo.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${photo.tenantId}/${photo.contactId}/${timestamp}_${sanitizedName}`;

    console.log(`📤 Uploading ${fileName}...`);

    // Upload to Supabase Storage (use property-photos bucket)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('property-photos')
      .upload(fileName, photo.file, {
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

    // Insert into photos table
    const { error: dbError } = await supabase
      .from('photos')
      .insert({
        tenant_id: photo.tenantId,
        contact_id: photo.contactId,
        project_id: photo.projectId,
        file_url: publicUrl,
        file_path: uploadData.path,
        file_name: photo.file.name,
        file_size: photo.file.size,
        file_type: photo.file.type,
        latitude: photo.metadata.latitude,
        longitude: photo.metadata.longitude,
        notes: photo.metadata.notes,
        captured_at: photo.metadata.capturedAt,
      })
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

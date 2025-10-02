/**
 * Offline Queue Database
 * IndexedDB schema for offline-first photo uploads
 * Uses Dexie.js for type-safe IndexedDB access
 */

import Dexie, { Table } from 'dexie';

export interface QueuedPhoto {
  id?: number;
  localId: string;
  file: File;
  contactId: string;
  projectId?: string;
  metadata: {
    latitude?: number;
    longitude?: number;
    notes?: string;
    capturedAt: string;
  };
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  attempts: number;
  lastAttempt?: string;
  error?: string;
  createdAt: string;
  tenantId: string;
}

export class OfflineQueueDB extends Dexie {
  queuedPhotos!: Table<QueuedPhoto, number>;

  constructor() {
    super('RoofingSaaSOfflineQueue');

    this.version(1).stores({
      queuedPhotos: '++id, localId, status, contactId, tenantId, createdAt'
    });
  }
}

// Singleton instance
export const db = new OfflineQueueDB();

/**
 * Initialize database and handle version upgrades
 */
export async function initializeOfflineQueue(): Promise<void> {
  try {
    await db.open();
    console.log('✅ Offline queue database initialized');

    // Clean up old completed items (older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await db.queuedPhotos
      .where('status')
      .equals('completed')
      .and(photo => new Date(photo.createdAt) < sevenDaysAgo)
      .delete();

  } catch (error) {
    console.error('❌ Failed to initialize offline queue:', error);
    throw error;
  }
}

/**
 * Get database statistics
 */
export async function getQueueStats() {
  const [total, pending, syncing, failed, completed] = await Promise.all([
    db.queuedPhotos.count(),
    db.queuedPhotos.where('status').equals('pending').count(),
    db.queuedPhotos.where('status').equals('syncing').count(),
    db.queuedPhotos.where('status').equals('failed').count(),
    db.queuedPhotos.where('status').equals('completed').count(),
  ]);

  return {
    total,
    pending,
    syncing,
    failed,
    completed,
  };
}

/**
 * Clear all completed items from queue
 */
export async function clearCompletedItems(): Promise<number> {
  return await db.queuedPhotos
    .where('status')
    .equals('completed')
    .delete();
}

/**
 * Get storage quota information
 */
export async function getStorageQuota(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
}> {
  if (!navigator.storage || !navigator.storage.estimate) {
    return { usage: 0, quota: 0, percentage: 0 };
  }

  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage || 0;
  const quota = estimate.quota || 0;
  const percentage = quota > 0 ? (usage / quota) * 100 : 0;

  return {
    usage,
    quota,
    percentage,
  };
}

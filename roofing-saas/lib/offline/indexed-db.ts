/**
 * Enhanced IndexedDB wrapper for advanced offline capabilities
 * Extends existing functionality with conflict resolution and sync management
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { OfflineRecord, ConflictResolution, OfflineFormData, OfflinePhoto, OfflineProject, OfflineDocument } from './offline-types';

// Enhanced database schema
interface EnhancedOfflineDB extends DBSchema {
  [key: string]: unknown;
  offline_records: {
    key: string;
    value: OfflineRecord;
    indexes: { 'by-table': string; 'by-synced': boolean; 'by-timestamp': number };
  };
  conflicts: {
    key: string;
    value: ConflictResolution;
    indexes: { 'by-resolved': boolean };
  };
  cached_data: {
    key: string;
    value: {
      id: string;
      table: string;
      data: Record<string, unknown>;
      timestamp: number;
      expires_at?: number;
    };
    indexes: { 'by-table': string; 'by-timestamp': number; 'by-expires': number };
  };
  offline_forms: {
    key: string;
    value: OfflineFormData;
    indexes: { 'by-type': string; 'by-synced': boolean; 'by-timestamp': number };
  };
  offline_photos: {
    key: string;
    value: OfflinePhoto;
    indexes: { 'by-synced': boolean; 'by-timestamp': number };
  };
  offline_projects: {
    key: string;
    value: OfflineProject;
    indexes: { 'by-synced': boolean; 'by-timestamp': number };
  };
  offline_documents: {
    key: string;
    value: OfflineDocument;
    indexes: { 'by-synced': boolean; 'by-timestamp': number };
  };
  sync_metadata: {
    key: string;
    value: {
      id: string;
      last_sync: number;
      sync_version: number;
      table: string;
    };
    indexes: { 'by-table': string };
  };
}

const DB_NAME = 'roofing_advanced_offline';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<EnhancedOfflineDB> | null = null;

/**
 * Initialize enhanced offline database
 */
export async function initEnhancedDB(): Promise<IDBPDatabase<EnhancedOfflineDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<EnhancedOfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Offline records store
      if (!db.objectStoreNames.contains('offline_records')) {
        const store = db.createObjectStore('offline_records', { keyPath: 'id' });
        store.createIndex('by-table', 'table');
        store.createIndex('by-synced', 'synced');
        store.createIndex('by-timestamp', 'timestamp');
      }

      // Conflicts store
      if (!db.objectStoreNames.contains('conflicts')) {
        const store = db.createObjectStore('conflicts', { keyPath: 'id' });
        store.createIndex('by-resolved', 'resolved');
      }

      // Cached data store
      if (!db.objectStoreNames.contains('cached_data')) {
        const store = db.createObjectStore('cached_data', { keyPath: 'id' });
        store.createIndex('by-table', 'table');
        store.createIndex('by-timestamp', 'timestamp');
        store.createIndex('by-expires', 'expires_at');
      }

      // Offline forms store
      if (!db.objectStoreNames.contains('offline_forms')) {
        const store = db.createObjectStore('offline_forms', { keyPath: 'id' });
        store.createIndex('by-type', 'form_type');
        store.createIndex('by-synced', 'synced');
        store.createIndex('by-timestamp', 'timestamp');
      }

      // Offline photos store
      if (!db.objectStoreNames.contains('offline_photos')) {
        const store = db.createObjectStore('offline_photos', { keyPath: 'id' });
        store.createIndex('by-synced', 'synced');
        store.createIndex('by-timestamp', 'timestamp');
      }

      // Offline projects store
      if (!db.objectStoreNames.contains('offline_projects')) {
        const store = db.createObjectStore('offline_projects', { keyPath: 'id' });
        store.createIndex('by-synced', 'synced');
        store.createIndex('by-timestamp', 'timestamp');
      }

      // Offline documents store
      if (!db.objectStoreNames.contains('offline_documents')) {
        const store = db.createObjectStore('offline_documents', { keyPath: 'id' });
        store.createIndex('by-synced', 'synced');
        store.createIndex('by-timestamp', 'timestamp');
      }

      // Sync metadata store
      if (!db.objectStoreNames.contains('sync_metadata')) {
        const store = db.createObjectStore('sync_metadata', { keyPath: 'id' });
        store.createIndex('by-table', 'table');
      }
    },
  });

  return dbInstance;
}

/**
 * Get database instance
 */
export async function getEnhancedDB(): Promise<IDBPDatabase<EnhancedOfflineDB>> {
  if (!dbInstance) {
    return await initEnhancedDB();
  }
  return dbInstance;
}

// ==================== OFFLINE RECORDS ====================

export async function addOfflineRecord(record: Omit<OfflineRecord, 'id' | 'timestamp' | 'retry_count'>): Promise<string> {
  const db = await getEnhancedDB();
  const id = `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const fullRecord: OfflineRecord = {
    ...record,
    id,
    timestamp: Date.now(),
    retry_count: 0,
  };

  await db.put('offline_records', fullRecord);
  return id;
}

export async function getOfflineRecords(table?: string): Promise<OfflineRecord[]> {
  const db = await getEnhancedDB();
  
  if (table) {
    return await db.getAllFromIndex('offline_records', 'by-table', table);
  }
  
  return await db.getAll('offline_records');
}

export async function getUnsyncedRecords(): Promise<OfflineRecord[]> {
  const db = await getEnhancedDB();
  return await db.getAllFromIndex('offline_records', 'by-synced', false);
}

export async function markRecordSynced(id: string): Promise<void> {
  const db = await getEnhancedDB();
  const record = await db.get('offline_records', id);
  
  if (record) {
    await db.put('offline_records', { ...record, synced: true });
  }
}

export async function incrementRetryCount(id: string): Promise<void> {
  const db = await getEnhancedDB();
  const record = await db.get('offline_records', id);
  
  if (record) {
    await db.put('offline_records', { 
      ...record, 
      retry_count: record.retry_count + 1 
    });
  }
}

// ==================== CONFLICTS ====================

export async function addConflict(conflict: ConflictResolution): Promise<void> {
  const db = await getEnhancedDB();
  await db.put('conflicts', conflict);
}

export async function getUnresolvedConflicts(): Promise<ConflictResolution[]> {
  const db = await getEnhancedDB();
  return await db.getAllFromIndex('conflicts', 'by-resolved', false);
}

export async function resolveConflict(id: string, resolvedData: Record<string, unknown>): Promise<void> {
  const db = await getEnhancedDB();
  const conflict = await db.get('conflicts', id);
  
  if (conflict) {
    await db.put('conflicts', {
      ...conflict,
      resolved: true,
      resolved_data: resolvedData,
      resolved_at: Date.now(),
    });
  }
}

// ==================== CACHED DATA ====================

export async function cacheData(table: string, data: Record<string, unknown>[], maxAge: number = 5 * 60 * 1000): Promise<void> {
  const db = await getEnhancedDB();
  const timestamp = Date.now();
  const expiresAt = timestamp + maxAge;

  const tx = db.transaction('cached_data', 'readwrite');
  
  await Promise.all([
    ...data.map(item =>
      tx.store.put({
        id: `${table}_${item.id}`,
        table,
        data: item,
        timestamp,
        expires_at: expiresAt,
      })
    ),
    tx.done,
  ]);
}

export async function getCachedData(table: string): Promise<Record<string, unknown>[]> {
  const db = await getEnhancedDB();
  const now = Date.now();
  
  // Get all non-expired data for the table
  const cachedItems = await db.getAllFromIndex('cached_data', 'by-table', table);
  
  return cachedItems
    .filter(item => !item.expires_at || item.expires_at > now)
    .map(item => item.data);
}

export async function clearExpiredCache(): Promise<void> {
  const db = await getEnhancedDB();
  const now = Date.now();
  
  const expiredItems = await db.transaction('cached_data').store.index('by-expires').getAllKeys(IDBKeyRange.upperBound(now));
  
  const tx = db.transaction('cached_data', 'readwrite');
  await Promise.all([
    ...expiredItems.map(key => tx.store.delete(key)),
    tx.done,
  ]);
}

// ==================== OFFLINE FORMS ====================

export async function saveOfflineForm(form: OfflineFormData): Promise<void> {
  const db = await getEnhancedDB();
  await db.put('offline_forms', form);
}

export async function getOfflineForms(formType?: string): Promise<OfflineFormData[]> {
  const db = await getEnhancedDB();
  
  if (formType) {
    return await db.getAllFromIndex('offline_forms', 'by-type', formType);
  }
  
  return await db.getAll('offline_forms');
}

export async function getUnsyncedForms(): Promise<OfflineFormData[]> {
  const db = await getEnhancedDB();
  return await db.getAllFromIndex('offline_forms', 'by-synced', false);
}

// ==================== OFFLINE PHOTOS ====================

export async function saveOfflinePhoto(photo: OfflinePhoto): Promise<void> {
  const db = await getEnhancedDB();
  await db.put('offline_photos', photo);
}

export async function getUnsyncedPhotos(): Promise<OfflinePhoto[]> {
  const db = await getEnhancedDB();
  return await db.getAllFromIndex('offline_photos', 'by-synced', false);
}

// ==================== OFFLINE PROJECTS ====================

export async function saveOfflineProject(project: OfflineProject): Promise<void> {
  const db = await getEnhancedDB();
  await db.put('offline_projects', project);
}

export async function getOfflineProjects(): Promise<OfflineProject[]> {
  const db = await getEnhancedDB();
  return await db.getAll('offline_projects');
}

export async function getUnsyncedProjects(): Promise<OfflineProject[]> {
  const db = await getEnhancedDB();
  return await db.getAllFromIndex('offline_projects', 'by-synced', false);
}

// ==================== OFFLINE DOCUMENTS ====================

export async function saveOfflineDocument(document: OfflineDocument): Promise<void> {
  const db = await getEnhancedDB();
  await db.put('offline_documents', document);
}

export async function getUnsyncedDocuments(): Promise<OfflineDocument[]> {
  const db = await getEnhancedDB();
  return await db.getAllFromIndex('offline_documents', 'by-synced', false);
}

// ==================== SYNC METADATA ====================

export async function updateSyncMetadata(table: string, lastSync: number, syncVersion: number = 1): Promise<void> {
  const db = await getEnhancedDB();
  await db.put('sync_metadata', {
    id: `sync_${table}`,
    table,
    last_sync: lastSync,
    sync_version: syncVersion,
  });
}

export async function getSyncMetadata(table: string): Promise<{ last_sync: number; sync_version: number } | null> {
  const db = await getEnhancedDB();
  const metadata = await db.get('sync_metadata', `sync_${table}`);
  
  if (metadata) {
    return {
      last_sync: metadata.last_sync,
      sync_version: metadata.sync_version,
    };
  }
  
  return null;
}

// ==================== UTILITIES ====================

export async function clearAllOfflineData(): Promise<void> {
  const db = await getEnhancedDB();
  
  await Promise.all([
    db.clear('offline_records'),
    db.clear('conflicts'),
    db.clear('cached_data'),
    db.clear('offline_forms'),
    db.clear('offline_photos'),
    db.clear('offline_projects'),
    db.clear('offline_documents'),
    db.clear('sync_metadata'),
  ]);
}

export async function getStorageStats(): Promise<{
  total_records: number;
  unsynced_records: number;
  conflicts: number;
  cached_items: number;
  offline_forms: number;
}> {
  const db = await getEnhancedDB();
  
  const [
    totalRecords,
    unsyncedRecords,
    conflicts,
    cachedItems,
    offlineForms
  ] = await Promise.all([
    db.count('offline_records'),
    db.countFromIndex('offline_records', 'by-synced', false),
    db.countFromIndex('conflicts', 'by-resolved', false),
    db.count('cached_data'),
    db.count('offline_forms'),
  ]);
  
  return {
    total_records: totalRecords,
    unsynced_records: unsyncedRecords,
    conflicts,
    cached_items: cachedItems,
    offline_forms: offlineForms,
  };
}

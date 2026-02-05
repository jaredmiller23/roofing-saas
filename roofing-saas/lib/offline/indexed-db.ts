/**
 * Enhanced IndexedDB wrapper for advanced offline capabilities
 * Uses Dexie.js for type-safe IndexedDB access
 */

import Dexie, { type Table } from 'dexie'
import { OfflineRecord, ConflictResolution, OfflineFormData, OfflinePhoto, OfflineProject, OfflineDocument } from './offline-types'

interface CachedDataItem {
  id: string
  table: string
  data: Record<string, unknown>
  timestamp: number
  expires_at?: number
}

interface SyncMetadataItem {
  id: string
  last_sync: number
  sync_version: number
  table: string
}

export class EnhancedOfflineDB extends Dexie {
  offline_records!: Table<OfflineRecord, string>
  conflicts!: Table<ConflictResolution, string>
  cached_data!: Table<CachedDataItem, string>
  offline_forms!: Table<OfflineFormData, string>
  offline_photos!: Table<OfflinePhoto, string>
  offline_projects!: Table<OfflineProject, string>
  offline_documents!: Table<OfflineDocument, string>
  sync_metadata!: Table<SyncMetadataItem, string>

  constructor() {
    super('roofing_advanced_offline')

    // Version 1: Minimal schema (matches stores created by previous idb implementation)
    this.version(1).stores({
      offline_records: 'id',
      conflicts: 'id',
      cached_data: 'id',
      offline_forms: 'id',
      offline_photos: 'id',
      offline_projects: 'id',
      offline_documents: 'id',
      sync_metadata: 'id',
    })

    // Version 2: Full indexes for Dexie queries
    this.version(2).stores({
      offline_records: 'id, table, synced, timestamp',
      conflicts: 'id, resolved',
      cached_data: 'id, table, timestamp, expires_at',
      offline_forms: 'id, form_type, synced, timestamp',
      offline_photos: 'id, synced, timestamp',
      offline_projects: 'id, synced, timestamp',
      offline_documents: 'id, synced, timestamp',
      sync_metadata: 'id, table',
    })
  }
}

const db = new EnhancedOfflineDB()

/**
 * Initialize enhanced offline database
 */
export async function initEnhancedDB() {
  await db.open()
  return db
}

/**
 * Get database instance
 */
export async function getEnhancedDB() {
  return db
}

// ==================== OFFLINE RECORDS ====================

export async function addOfflineRecord(record: Omit<OfflineRecord, 'id' | 'timestamp' | 'retry_count'>): Promise<string> {
  const id = `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const fullRecord: OfflineRecord = {
    ...record,
    id,
    timestamp: Date.now(),
    retry_count: 0,
    synced: record.synced ?? false,
  }

  await db.offline_records.put(fullRecord)
  return id
}

export async function getOfflineRecords(table?: string): Promise<OfflineRecord[]> {
  if (table) {
    return await db.offline_records.where('table').equals(table).toArray()
  }
  return await db.offline_records.toArray()
}

export async function getUnsyncedRecords(): Promise<OfflineRecord[]> {
  return await db.offline_records.where('synced').equals(0).toArray()
}

export async function markRecordSynced(id: string): Promise<void> {
  const record = await db.offline_records.get(id)
  if (record) {
    await db.offline_records.put({ ...record, synced: true })
  }
}

export async function incrementRetryCount(id: string): Promise<void> {
  const record = await db.offline_records.get(id)
  if (record) {
    await db.offline_records.put({
      ...record,
      retry_count: record.retry_count + 1,
    })
  }
}

// ==================== CONFLICTS ====================

export async function addConflict(conflict: ConflictResolution): Promise<void> {
  await db.conflicts.put(conflict)
}

export async function getUnresolvedConflicts(): Promise<ConflictResolution[]> {
  return await db.conflicts.where('resolved').equals(0).toArray()
}

export async function resolveConflict(id: string, resolvedData: Record<string, unknown>): Promise<void> {
  const conflict = await db.conflicts.get(id)
  if (conflict) {
    await db.conflicts.put({
      ...conflict,
      resolved: true,
      resolved_data: resolvedData,
      resolved_at: Date.now(),
    })
  }
}

// ==================== CACHED DATA ====================

export async function cacheData(table: string, data: Record<string, unknown>[], maxAge: number = 5 * 60 * 1000): Promise<void> {
  const timestamp = Date.now()
  const expiresAt = timestamp + maxAge

  await db.cached_data.bulkPut(
    data.map(item => ({
      id: `${table}_${item.id}`,
      table,
      data: item,
      timestamp,
      expires_at: expiresAt,
    }))
  )
}

export async function getCachedData(table: string): Promise<Record<string, unknown>[]> {
  const now = Date.now()
  const cachedItems = await db.cached_data.where('table').equals(table).toArray()

  return cachedItems
    .filter(item => !item.expires_at || item.expires_at > now)
    .map(item => item.data)
}

export async function clearExpiredCache(): Promise<void> {
  const now = Date.now()
  await db.cached_data.where('expires_at').belowOrEqual(now).delete()
}

// ==================== OFFLINE FORMS ====================

export async function saveOfflineForm(form: OfflineFormData): Promise<void> {
  await db.offline_forms.put(form)
}

export async function getOfflineForms(formType?: string): Promise<OfflineFormData[]> {
  if (formType) {
    return await db.offline_forms.where('form_type').equals(formType).toArray()
  }
  return await db.offline_forms.toArray()
}

export async function getUnsyncedForms(): Promise<OfflineFormData[]> {
  return await db.offline_forms.where('synced').equals(0).toArray()
}

// ==================== OFFLINE PHOTOS ====================

export async function saveOfflinePhoto(photo: OfflinePhoto): Promise<void> {
  await db.offline_photos.put(photo)
}

export async function getUnsyncedPhotos(): Promise<OfflinePhoto[]> {
  return await db.offline_photos.where('synced').equals(0).toArray()
}

// ==================== OFFLINE PROJECTS ====================

export async function saveOfflineProject(project: OfflineProject): Promise<void> {
  await db.offline_projects.put(project)
}

export async function getOfflineProjects(): Promise<OfflineProject[]> {
  return await db.offline_projects.toArray()
}

export async function getUnsyncedProjects(): Promise<OfflineProject[]> {
  return await db.offline_projects.where('synced').equals(0).toArray()
}

// ==================== OFFLINE DOCUMENTS ====================

export async function saveOfflineDocument(document: OfflineDocument): Promise<void> {
  await db.offline_documents.put(document)
}

export async function getUnsyncedDocuments(): Promise<OfflineDocument[]> {
  return await db.offline_documents.where('synced').equals(0).toArray()
}

// ==================== SYNC METADATA ====================

export async function updateSyncMetadata(table: string, lastSync: number, syncVersion: number = 1): Promise<void> {
  await db.sync_metadata.put({
    id: `sync_${table}`,
    table,
    last_sync: lastSync,
    sync_version: syncVersion,
  })
}

export async function getSyncMetadata(table: string): Promise<{ last_sync: number; sync_version: number } | null> {
  const metadata = await db.sync_metadata.get(`sync_${table}`)

  if (metadata) {
    return {
      last_sync: metadata.last_sync,
      sync_version: metadata.sync_version,
    }
  }

  return null
}

// ==================== UTILITIES ====================

export async function clearAllOfflineData(): Promise<void> {
  await Promise.all([
    db.offline_records.clear(),
    db.conflicts.clear(),
    db.cached_data.clear(),
    db.offline_forms.clear(),
    db.offline_photos.clear(),
    db.offline_projects.clear(),
    db.offline_documents.clear(),
    db.sync_metadata.clear(),
  ])
}

export async function getStorageStats(): Promise<{
  total_records: number
  unsynced_records: number
  conflicts: number
  cached_items: number
  offline_forms: number
}> {
  const [
    totalRecords,
    unsyncedRecords,
    conflicts,
    cachedItems,
    offlineForms,
  ] = await Promise.all([
    db.offline_records.count(),
    db.offline_records.where('synced').equals(0).count(),
    db.conflicts.where('resolved').equals(0).count(),
    db.cached_data.count(),
    db.offline_forms.count(),
  ])

  return {
    total_records: totalRecords,
    unsynced_records: unsyncedRecords,
    conflicts,
    cached_items: cachedItems,
    offline_forms: offlineForms,
  }
}

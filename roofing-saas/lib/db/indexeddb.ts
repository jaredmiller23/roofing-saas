/**
 * IndexedDB wrapper for offline storage
 * Uses Dexie.js for type-safe Promise-based API
 */

import Dexie, { type Table } from 'dexie'

// Value types for each store

interface CachedContact {
  id: string
  tenant_id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  pipeline_stage?: string
  source?: string
  tags?: string[]
  notes?: string
  created_at: string
  updated_at: string
  cached_at: number
  synced: boolean
}

interface CachedProject {
  id: string
  tenant_id: string
  contact_id: string
  name: string
  description?: string
  status: string
  property_type?: string
  roof_type?: string
  square_footage?: number
  estimated_value?: number
  scheduled_date?: string
  created_at: string
  updated_at: string
  cached_at: number
  synced: boolean
}

export interface PendingUpload {
  id: string
  tenant_id: string
  contact_id?: string
  project_id?: string
  file: Blob
  file_name: string
  file_type: string
  metadata?: Record<string, unknown>
  created_at: number
  retry_count: number
  last_error?: string
}

export interface PendingAction {
  id: string
  tenant_id: string
  action_type: 'create' | 'update' | 'delete'
  entity_type: 'contact' | 'project' | 'activity'
  entity_id?: string
  data: Record<string, unknown>
  created_at: number
  retry_count: number
  last_error?: string
}

class RoofingSaaSDB extends Dexie {
  contacts!: Table<CachedContact, string>
  projects!: Table<CachedProject, string>
  pending_uploads!: Table<PendingUpload, string>
  pending_actions!: Table<PendingAction, string>

  constructor() {
    super('roofing-saas-db')

    // Version 1: Minimal schema (matches stores created by previous idb implementation)
    this.version(1).stores({
      contacts: 'id',
      projects: 'id',
      pending_uploads: 'id',
      pending_actions: 'id',
    })

    // Version 2: Full indexes for Dexie queries
    this.version(2).stores({
      contacts: 'id, tenant_id, updated_at',
      projects: 'id, tenant_id, contact_id, updated_at',
      pending_uploads: 'id, tenant_id, created_at',
      pending_actions: 'id, tenant_id, created_at, entity_type',
    })
  }
}

const db = new RoofingSaaSDB()

/**
 * Initialize the IndexedDB database
 */
export async function initDB() {
  await db.open()
  return db
}

/**
 * Get the database instance
 */
export async function getDB() {
  return db
}

// ==================== CONTACTS ====================

export async function cacheContact(contact: CachedContact) {
  await db.contacts.put({
    ...contact,
    cached_at: Date.now(),
    synced: true,
  })
}

export async function cacheContacts(contacts: CachedContact[]) {
  await db.contacts.bulkPut(
    contacts.map(contact => ({
      ...contact,
      cached_at: Date.now(),
      synced: true,
    }))
  )
}

export async function getCachedContact(id: string) {
  return await db.contacts.get(id)
}

export async function getCachedContacts(tenantId: string) {
  return await db.contacts.where('tenant_id').equals(tenantId).toArray()
}

export async function deleteCachedContact(id: string) {
  await db.contacts.delete(id)
}

// ==================== PROJECTS ====================

export async function cacheProject(project: CachedProject) {
  await db.projects.put({
    ...project,
    cached_at: Date.now(),
    synced: true,
  })
}

export async function cacheProjects(projects: CachedProject[]) {
  await db.projects.bulkPut(
    projects.map(project => ({
      ...project,
      cached_at: Date.now(),
      synced: true,
    }))
  )
}

export async function getCachedProject(id: string) {
  return await db.projects.get(id)
}

export async function getCachedProjects(tenantId: string) {
  return await db.projects.where('tenant_id').equals(tenantId).toArray()
}

export async function getCachedProjectsByContact(contactId: string) {
  return await db.projects.where('contact_id').equals(contactId).toArray()
}

export async function deleteCachedProject(id: string) {
  await db.projects.delete(id)
}

// ==================== PENDING UPLOADS ====================

export async function addPendingUpload(upload: Omit<PendingUpload, 'id' | 'created_at' | 'retry_count'>) {
  const id = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  await db.pending_uploads.add({
    ...upload,
    id,
    created_at: Date.now(),
    retry_count: 0,
  })

  return id
}

export async function getPendingUploads(tenantId: string) {
  return await db.pending_uploads.where('tenant_id').equals(tenantId).toArray()
}

export async function updatePendingUploadRetry(id: string, error?: string) {
  const upload = await db.pending_uploads.get(id)
  if (upload) {
    await db.pending_uploads.put({
      ...upload,
      retry_count: upload.retry_count + 1,
      last_error: error,
    })
  }
}

export async function deletePendingUpload(id: string) {
  await db.pending_uploads.delete(id)
}

// ==================== PENDING ACTIONS ====================

export async function addPendingAction(action: Omit<PendingAction, 'id' | 'created_at' | 'retry_count'>) {
  const id = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  await db.pending_actions.add({
    ...action,
    id,
    created_at: Date.now(),
    retry_count: 0,
  })

  return id
}

export async function getPendingActions(tenantId: string) {
  return await db.pending_actions.where('tenant_id').equals(tenantId).toArray()
}

export async function updatePendingActionRetry(id: string, error?: string) {
  const action = await db.pending_actions.get(id)
  if (action) {
    await db.pending_actions.put({
      ...action,
      retry_count: action.retry_count + 1,
      last_error: error,
    })
  }
}

export async function deletePendingAction(id: string) {
  await db.pending_actions.delete(id)
}

// ==================== SYNC UTILITIES ====================

/**
 * Clear all cached data (for logout or reset)
 */
export async function clearAllCache() {
  await Promise.all([
    db.contacts.clear(),
    db.projects.clear(),
  ])
}

/**
 * Get all pending items count
 */
export async function getPendingCount(tenantId: string): Promise<{ uploads: number; actions: number }> {
  const [uploads, actions] = await Promise.all([
    db.pending_uploads.where('tenant_id').equals(tenantId).count(),
    db.pending_actions.where('tenant_id').equals(tenantId).count(),
  ])

  return { uploads, actions }
}

/**
 * Check if cache is stale (older than maxAge in milliseconds)
 */
export function isCacheStale(cachedAt: number, maxAge: number = 5 * 60 * 1000): boolean {
  return Date.now() - cachedAt > maxAge
}

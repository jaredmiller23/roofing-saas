/**
 * IndexedDB wrapper for offline storage
 * Uses idb library for Promise-based API
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb'

// Database schema interface
interface RoofingSaaSDB extends DBSchema {
  contacts: {
    key: string // UUID
    value: {
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
      // Cache metadata
      cached_at: number
      synced: boolean
    }
    indexes: { 'by-tenant': string; 'by-updated': string }
  }
  projects: {
    key: string // UUID
    value: {
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
      // Cache metadata
      cached_at: number
      synced: boolean
    }
    indexes: { 'by-tenant': string; 'by-contact': string; 'by-updated': string }
  }
  pending_uploads: {
    key: string // Temporary ID
    value: {
      id: string
      tenant_id: string
      contact_id?: string
      project_id?: string
      file: Blob
      file_name: string
      file_type: string
      metadata?: Record<string, any>
      created_at: number
      retry_count: number
      last_error?: string
    }
    indexes: { 'by-tenant': string; 'by-created': number }
  }
  pending_actions: {
    key: string // Temporary ID
    value: {
      id: string
      tenant_id: string
      action_type: 'create' | 'update' | 'delete'
      entity_type: 'contact' | 'project' | 'activity'
      entity_id?: string // For updates/deletes
      data: Record<string, any>
      created_at: number
      retry_count: number
      last_error?: string
    }
    indexes: { 'by-tenant': string; 'by-created': number; 'by-entity': string }
  }
}

const DB_NAME = 'roofing-saas-db'
const DB_VERSION = 1

let dbInstance: IDBPDatabase<RoofingSaaSDB> | null = null

/**
 * Initialize and open the IndexedDB database
 */
export async function initDB(): Promise<IDBPDatabase<RoofingSaaSDB>> {
  if (dbInstance) {
    return dbInstance
  }

  dbInstance = await openDB<RoofingSaaSDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // Create contacts store
      if (!db.objectStoreNames.contains('contacts')) {
        const contactsStore = db.createObjectStore('contacts', { keyPath: 'id' })
        contactsStore.createIndex('by-tenant', 'tenant_id')
        contactsStore.createIndex('by-updated', 'updated_at')
      }

      // Create projects store
      if (!db.objectStoreNames.contains('projects')) {
        const projectsStore = db.createObjectStore('projects', { keyPath: 'id' })
        projectsStore.createIndex('by-tenant', 'tenant_id')
        projectsStore.createIndex('by-contact', 'contact_id')
        projectsStore.createIndex('by-updated', 'updated_at')
      }

      // Create pending_uploads store
      if (!db.objectStoreNames.contains('pending_uploads')) {
        const uploadsStore = db.createObjectStore('pending_uploads', { keyPath: 'id' })
        uploadsStore.createIndex('by-tenant', 'tenant_id')
        uploadsStore.createIndex('by-created', 'created_at')
      }

      // Create pending_actions store
      if (!db.objectStoreNames.contains('pending_actions')) {
        const actionsStore = db.createObjectStore('pending_actions', { keyPath: 'id' })
        actionsStore.createIndex('by-tenant', 'tenant_id')
        actionsStore.createIndex('by-created', 'created_at')
        actionsStore.createIndex('by-entity', 'entity_type')
      }
    },
  })

  return dbInstance
}

/**
 * Get the database instance (initialize if needed)
 */
export async function getDB(): Promise<IDBPDatabase<RoofingSaaSDB>> {
  if (!dbInstance) {
    return await initDB()
  }
  return dbInstance
}

// ==================== CONTACTS ====================

export async function cacheContact(contact: RoofingSaaSDB['contacts']['value']) {
  const db = await getDB()
  await db.put('contacts', {
    ...contact,
    cached_at: Date.now(),
    synced: true,
  })
}

export async function cacheContacts(contacts: RoofingSaaSDB['contacts']['value'][]) {
  const db = await getDB()
  const tx = db.transaction('contacts', 'readwrite')

  await Promise.all([
    ...contacts.map(contact =>
      tx.store.put({
        ...contact,
        cached_at: Date.now(),
        synced: true,
      })
    ),
    tx.done,
  ])
}

export async function getCachedContact(id: string) {
  const db = await getDB()
  return await db.get('contacts', id)
}

export async function getCachedContacts(tenantId: string) {
  const db = await getDB()
  return await db.getAllFromIndex('contacts', 'by-tenant', tenantId)
}

export async function deleteCachedContact(id: string) {
  const db = await getDB()
  await db.delete('contacts', id)
}

// ==================== PROJECTS ====================

export async function cacheProject(project: RoofingSaaSDB['projects']['value']) {
  const db = await getDB()
  await db.put('projects', {
    ...project,
    cached_at: Date.now(),
    synced: true,
  })
}

export async function cacheProjects(projects: RoofingSaaSDB['projects']['value'][]) {
  const db = await getDB()
  const tx = db.transaction('projects', 'readwrite')

  await Promise.all([
    ...projects.map(project =>
      tx.store.put({
        ...project,
        cached_at: Date.now(),
        synced: true,
      })
    ),
    tx.done,
  ])
}

export async function getCachedProject(id: string) {
  const db = await getDB()
  return await db.get('projects', id)
}

export async function getCachedProjects(tenantId: string) {
  const db = await getDB()
  return await db.getAllFromIndex('projects', 'by-tenant', tenantId)
}

export async function getCachedProjectsByContact(contactId: string) {
  const db = await getDB()
  return await db.getAllFromIndex('projects', 'by-contact', contactId)
}

export async function deleteCachedProject(id: string) {
  const db = await getDB()
  await db.delete('projects', id)
}

// ==================== PENDING UPLOADS ====================

export async function addPendingUpload(upload: Omit<RoofingSaaSDB['pending_uploads']['value'], 'id' | 'created_at' | 'retry_count'>) {
  const db = await getDB()
  const id = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  await db.add('pending_uploads', {
    ...upload,
    id,
    created_at: Date.now(),
    retry_count: 0,
  })

  return id
}

export async function getPendingUploads(tenantId: string) {
  const db = await getDB()
  return await db.getAllFromIndex('pending_uploads', 'by-tenant', tenantId)
}

export async function updatePendingUploadRetry(id: string, error?: string) {
  const db = await getDB()
  const upload = await db.get('pending_uploads', id)

  if (upload) {
    await db.put('pending_uploads', {
      ...upload,
      retry_count: upload.retry_count + 1,
      last_error: error,
    })
  }
}

export async function deletePendingUpload(id: string) {
  const db = await getDB()
  await db.delete('pending_uploads', id)
}

// ==================== PENDING ACTIONS ====================

export async function addPendingAction(action: Omit<RoofingSaaSDB['pending_actions']['value'], 'id' | 'created_at' | 'retry_count'>) {
  const db = await getDB()
  const id = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  await db.add('pending_actions', {
    ...action,
    id,
    created_at: Date.now(),
    retry_count: 0,
  })

  return id
}

export async function getPendingActions(tenantId: string) {
  const db = await getDB()
  return await db.getAllFromIndex('pending_actions', 'by-tenant', tenantId)
}

export async function updatePendingActionRetry(id: string, error?: string) {
  const db = await getDB()
  const action = await db.get('pending_actions', id)

  if (action) {
    await db.put('pending_actions', {
      ...action,
      retry_count: action.retry_count + 1,
      last_error: error,
    })
  }
}

export async function deletePendingAction(id: string) {
  const db = await getDB()
  await db.delete('pending_actions', id)
}

// ==================== SYNC UTILITIES ====================

/**
 * Clear all cached data (for logout or reset)
 */
export async function clearAllCache() {
  const db = await getDB()

  await Promise.all([
    db.clear('contacts'),
    db.clear('projects'),
  ])
}

/**
 * Get all pending items count
 */
export async function getPendingCount(tenantId: string): Promise<{ uploads: number; actions: number }> {
  const db = await getDB()

  const [uploads, actions] = await Promise.all([
    db.getAllFromIndex('pending_uploads', 'by-tenant', tenantId),
    db.getAllFromIndex('pending_actions', 'by-tenant', tenantId),
  ])

  return {
    uploads: uploads.length,
    actions: actions.length,
  }
}

/**
 * Check if cache is stale (older than maxAge in milliseconds)
 */
export function isCacheStale(cachedAt: number, maxAge: number = 5 * 60 * 1000): boolean {
  return Date.now() - cachedAt > maxAge
}

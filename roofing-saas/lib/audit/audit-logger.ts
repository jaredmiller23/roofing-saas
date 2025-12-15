import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  AuditEntry,
  CreateAuditEntryParams,
  AuditDiff,
  AuditError,
  AuditStorageError,
  DEFAULT_AUDIT_CONFIG,
  type AuditEntityType,
  type AuditActionType
} from './audit-types'

/**
 * Core audit logging functionality
 */
export class AuditLogger {
  private static instance: AuditLogger
  private queue: CreateAuditEntryParams[] = []
  private processing = false

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger()
    }
    return AuditLogger.instance
  }

  /**
   * Log an audit entry asynchronously
   * This is the main public interface for audit logging
   */
  async logEntry(params: CreateAuditEntryParams): Promise<void> {
    try {
      // Add to queue for batch processing
      this.queue.push(params)

      // Process queue if not already processing
      if (!this.processing) {
        setImmediate(() => this.processQueue())
      }

      logger.debug('Audit entry queued', {
        entity_type: params.entity_type,
        entity_id: params.entity_id,
        action_type: params.action_type
      })
    } catch (error) {
      logger.error('Failed to queue audit entry', { error, params })
      throw new AuditError('Failed to queue audit entry', error)
    }
  }

  /**
   * Log a CREATE action
   */
  async logCreate(
    user_id: string,
    user_name: string,
    user_email: string,
    tenant_id: string,
    entity_type: AuditEntityType,
    entity_id: string,
    after_values: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    return this.logEntry({
      user_id,
      user_name,
      user_email,
      tenant_id,
      action_type: 'create',
      entity_type,
      entity_id,
      before_values: null,
      after_values,
      metadata
    })
  }

  /**
   * Log an UPDATE action
   */
  async logUpdate(
    user_id: string,
    user_name: string,
    user_email: string,
    tenant_id: string,
    entity_type: AuditEntityType,
    entity_id: string,
    before_values: Record<string, any>,
    after_values: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    return this.logEntry({
      user_id,
      user_name,
      user_email,
      tenant_id,
      action_type: 'update',
      entity_type,
      entity_id,
      before_values,
      after_values,
      metadata
    })
  }

  /**
   * Log a DELETE action
   */
  async logDelete(
    user_id: string,
    user_name: string,
    user_email: string,
    tenant_id: string,
    entity_type: AuditEntityType,
    entity_id: string,
    before_values: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    return this.logEntry({
      user_id,
      user_name,
      user_email,
      tenant_id,
      action_type: 'delete',
      entity_type,
      entity_id,
      before_values,
      after_values: null,
      metadata
    })
  }

  /**
   * Process queued audit entries in batches
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    try {
      const batch = this.queue.splice(0, DEFAULT_AUDIT_CONFIG.batch_size)
      await this.persistBatch(batch)

      logger.debug('Audit batch processed', { count: batch.length })
    } catch (error) {
      logger.error('Failed to process audit batch', { error })
      // Re-queue failed items (with retry logic)
      // For now, we'll just log the error to avoid infinite loops
    } finally {
      this.processing = false

      // Process remaining items if any
      if (this.queue.length > 0) {
        setImmediate(() => this.processQueue())
      }
    }
  }

  /**
   * Persist a batch of audit entries to the database
   */
  private async persistBatch(entries: CreateAuditEntryParams[]): Promise<void> {
    const supabase = await createClient()

    const auditEntries = entries.map(entry => ({
      user_id: entry.user_id,
      user_name: entry.user_name,
      user_email: entry.user_email,
      tenant_id: entry.tenant_id,
      action_type: entry.action_type,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      before_values: entry.before_values,
      after_values: entry.after_values,
      ip_address: entry.ip_address,
      user_agent: entry.user_agent,
      metadata: entry.metadata,
      timestamp: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('audit_log')
      .insert(auditEntries)

    if (error) {
      throw new AuditStorageError(`Failed to persist audit entries: ${error.message}`)
    }
  }

  /**
   * Calculate diff between before and after values
   */
  static calculateDiff(
    before: Record<string, any> | null,
    after: Record<string, any> | null
  ): AuditDiff[] {
    const diff: AuditDiff[] = []

    if (!before && !after) {
      return diff
    }

    if (!before && after) {
      // Create operation
      Object.keys(after).forEach(key => {
        diff.push({
          field: key,
          old_value: null,
          new_value: after[key],
          type: 'added'
        })
      })
      return diff
    }

    if (before && !after) {
      // Delete operation
      Object.keys(before).forEach(key => {
        diff.push({
          field: key,
          old_value: before[key],
          new_value: null,
          type: 'removed'
        })
      })
      return diff
    }

    if (before && after) {
      // Update operation
      const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])

      allKeys.forEach(key => {
        const oldValue = before[key]
        const newValue = after[key]

        if (!(key in before)) {
          diff.push({
            field: key,
            old_value: null,
            new_value: newValue,
            type: 'added'
          })
        } else if (!(key in after)) {
          diff.push({
            field: key,
            old_value: oldValue,
            new_value: null,
            type: 'removed'
          })
        } else if (!this.isEqual(oldValue, newValue)) {
          diff.push({
            field: key,
            old_value: oldValue,
            new_value: newValue,
            type: 'changed'
          })
        }
      })
    }

    return diff
  }

  /**
   * Deep equality check for values
   */
  private static isEqual(a: any, b: any): boolean {
    if (a === b) return true
    if (a == null || b == null) return a === b
    if (typeof a !== typeof b) return false
    if (typeof a === 'object') {
      if (Array.isArray(a) !== Array.isArray(b)) return false
      if (Array.isArray(a)) {
        if (a.length !== b.length) return false
        return a.every((item, index) => this.isEqual(item, b[index]))
      }
      const keysA = Object.keys(a)
      const keysB = Object.keys(b)
      if (keysA.length !== keysB.length) return false
      return keysA.every(key => this.isEqual(a[key], b[key]))
    }
    return false
  }

  /**
   * Sanitize sensitive data before logging
   */
  static sanitizeValues(
    values: Record<string, any> | null,
    entity_type: AuditEntityType
  ): Record<string, any> | null {
    if (!values) return null

    const sensitiveFields = DEFAULT_AUDIT_CONFIG.sensitive_fields[entity_type] || []
    const sanitized = { ...values }

    sensitiveFields.forEach(field => {
      if (field in sanitized) {
        // Replace with masked value but keep type info
        const originalValue = sanitized[field]
        if (typeof originalValue === 'string') {
          sanitized[field] = '***MASKED***'
        } else if (typeof originalValue === 'number') {
          sanitized[field] = 0
        } else {
          sanitized[field] = '***MASKED***'
        }
      }
    })

    return sanitized
  }

  /**
   * Get user context from request headers
   */
  static extractRequestMetadata(request?: Request): {
    ip_address: string | null
    user_agent: string | null
  } {
    if (!request) {
      return { ip_address: null, user_agent: null }
    }

    const ip_address = request.headers.get('x-forwarded-for')
      || request.headers.get('x-real-ip')
      || null

    const user_agent = request.headers.get('user-agent') || null

    return { ip_address, user_agent }
  }
}

// Convenience functions for common audit operations
export const auditLogger = AuditLogger.getInstance()

/**
 * Log a contact operation
 */
export async function auditContact(
  action: AuditActionType,
  user_id: string,
  user_name: string,
  user_email: string,
  tenant_id: string,
  contact_id: string,
  before_values?: Record<string, any> | null,
  after_values?: Record<string, any> | null,
  metadata?: Record<string, any>
): Promise<void> {
  const sanitizedBefore = AuditLogger.sanitizeValues(before_values ?? null, 'contact')
  const sanitizedAfter = AuditLogger.sanitizeValues(after_values ?? null, 'contact')

  return auditLogger.logEntry({
    user_id,
    user_name,
    user_email,
    tenant_id,
    action_type: action,
    entity_type: 'contact',
    entity_id: contact_id,
    before_values: sanitizedBefore,
    after_values: sanitizedAfter,
    metadata
  })
}

/**
 * Log a project operation
 */
export async function auditProject(
  action: AuditActionType,
  user_id: string,
  user_name: string,
  user_email: string,
  tenant_id: string,
  project_id: string,
  before_values?: Record<string, any> | null,
  after_values?: Record<string, any> | null,
  metadata?: Record<string, any>
): Promise<void> {
  const sanitizedBefore = AuditLogger.sanitizeValues(before_values ?? null, 'project')
  const sanitizedAfter = AuditLogger.sanitizeValues(after_values ?? null, 'project')

  return auditLogger.logEntry({
    user_id,
    user_name,
    user_email,
    tenant_id,
    action_type: action,
    entity_type: 'project',
    entity_id: project_id,
    before_values: sanitizedBefore,
    after_values: sanitizedAfter,
    metadata
  })
}
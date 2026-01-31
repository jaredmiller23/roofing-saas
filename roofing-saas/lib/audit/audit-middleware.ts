import { NextRequest } from 'next/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { auditLogger, AuditLogger } from './audit-logger'
import { AuditEntityType, AuditActionType } from './audit-types'

/**
 * Middleware wrapper for API routes to add audit logging
 */
export interface AuditContext {
  user_id: string
  user_name: string
  user_email: string
  tenant_id: string
  ip_address: string | null
  user_agent: string | null
}

/**
 * Get audit context from current request
 */
export async function getAuditContext(request?: NextRequest): Promise<AuditContext | null> {
  try {
    const user = await getCurrentUser()
    if (!user) return null

    const tenant_id = await getUserTenantId(user.id)
    if (!tenant_id) return null

    const { ip_address, user_agent } = AuditLogger.extractRequestMetadata(request)

    return {
      user_id: user.id,
      user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
      user_email: user.email || 'unknown@example.com',
      tenant_id,
      ip_address,
      user_agent
    }
  } catch (error) {
    logger.error('Failed to get audit context', { error })
    return null
  }
}

/**
 * Wrapper for CREATE operations with audit logging
 */
export async function auditedCreate<T>(
  entity_type: AuditEntityType,
  createFn: () => Promise<T & { id: string }>,
  context: AuditContext,
  metadata?: Record<string, unknown>
): Promise<T & { id: string }> {
  const result = await createFn()

  // Log the creation asynchronously
  auditLogger.logCreate(
    context.user_id,
    context.user_name,
    context.user_email,
    context.tenant_id,
    entity_type,
    result.id,
    result as Record<string, unknown>,
    {
      ...metadata,
      ip_address: context.ip_address,
      user_agent: context.user_agent
    }
  ).catch(error => {
    logger.error('Audit logging failed for create operation', { error, entity_type, entity_id: result.id })
  })

  return result
}

/**
 * Wrapper for UPDATE operations with audit logging
 */
export async function auditedUpdate<T>(
  entity_type: AuditEntityType,
  entity_id: string,
  updateFn: (beforeValues: Record<string, unknown>) => Promise<T>,
  context: AuditContext,
  metadata?: Record<string, unknown>
): Promise<T> {
  // Get current state before update
  const beforeValues = await fetchEntityState(entity_type, entity_id, context.tenant_id)

  // Perform the update
  const result = await updateFn(beforeValues)

  // Get state after update
  const afterValues = await fetchEntityState(entity_type, entity_id, context.tenant_id)

  // Log the update asynchronously
  auditLogger.logUpdate(
    context.user_id,
    context.user_name,
    context.user_email,
    context.tenant_id,
    entity_type,
    entity_id,
    beforeValues,
    afterValues,
    {
      ...metadata,
      ip_address: context.ip_address,
      user_agent: context.user_agent
    }
  ).catch(error => {
    logger.error('Audit logging failed for update operation', { error, entity_type, entity_id })
  })

  return result
}

/**
 * Wrapper for DELETE operations with audit logging
 */
export async function auditedDelete<T>(
  entity_type: AuditEntityType,
  entity_id: string,
  deleteFn: (beforeValues: Record<string, unknown>) => Promise<T>,
  context: AuditContext,
  metadata?: Record<string, unknown>
): Promise<T> {
  // Get current state before deletion
  const beforeValues = await fetchEntityState(entity_type, entity_id, context.tenant_id)

  // Perform the deletion
  const result = await deleteFn(beforeValues)

  // Log the deletion asynchronously
  auditLogger.logDelete(
    context.user_id,
    context.user_name,
    context.user_email,
    context.tenant_id,
    entity_type,
    entity_id,
    beforeValues,
    {
      ...metadata,
      ip_address: context.ip_address,
      user_agent: context.user_agent
    }
  ).catch(error => {
    logger.error('Audit logging failed for delete operation', { error, entity_type, entity_id })
  })

  return result
}

/**
 * Fetch current state of an entity for audit purposes
 */
async function fetchEntityState(
  entity_type: AuditEntityType,
  entity_id: string,
  tenant_id: string
): Promise<Record<string, unknown>> {
  const supabase = await createClient()

  let table: string
  switch (entity_type) {
    case 'contact':
      table = 'contacts'
      break
    case 'project':
      table = 'projects'
      break
    case 'estimate':
      table = 'estimates'
      break
    case 'user':
      table = 'tenant_users'
      break
    case 'tenant':
      table = 'tenants'
      break
    case 'document':
      table = 'documents'
      break
    default:
      throw new Error(`Unsupported entity type for audit: ${entity_type}`)
  }

  const { data, error } = await (supabase
    .from(table as 'contacts')
    .select('*')
    .eq('id', entity_id)
    .eq('tenant_id', tenant_id)
    .single())

  if (error || !data) {
    // If entity doesn't exist, return empty object
    // This can happen for deletes where we check state after deletion
    return {}
  }

  return data
}

/**
 * Higher-order function to wrap API route handlers with audit logging
 */
export function withAuditLogging<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const startTime = Date.now()

    try {
      const result = await handler(request, ...args)
      const duration = Date.now() - startTime

      // Log API call for audit purposes
      const context = await getAuditContext(request)
      if (context) {
        const method = request.method
        const pathname = new URL(request.url).pathname

        logger.debug('API call audited', {
          method,
          pathname,
          user_id: context.user_id,
          tenant_id: context.tenant_id,
          duration,
          status: result.status
        })
      }

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('API call failed', { error, duration })
      throw error
    }
  }
}

/**
 * Utility to log manual audit entries from API routes
 */
export async function logAuditEntry(
  action_type: AuditActionType,
  entity_type: AuditEntityType,
  entity_id: string,
  context: AuditContext,
  before_values?: Record<string, unknown> | null,
  after_values?: Record<string, unknown> | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  return auditLogger.logEntry({
    user_id: context.user_id,
    user_name: context.user_name,
    user_email: context.user_email,
    tenant_id: context.tenant_id,
    action_type,
    entity_type,
    entity_id,
    before_values,
    after_values,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    metadata
  })
}

/**
 * Batch audit logging for bulk operations
 */
export async function logBulkAuditEntries(
  action_type: AuditActionType,
  entity_type: AuditEntityType,
  entries: Array<{
    entity_id: string
    before_values?: Record<string, unknown> | null
    after_values?: Record<string, unknown> | null
    metadata?: Record<string, unknown>
  }>,
  context: AuditContext
): Promise<void> {
  const promises = entries.map(entry =>
    auditLogger.logEntry({
      user_id: context.user_id,
      user_name: context.user_name,
      user_email: context.user_email,
      tenant_id: context.tenant_id,
      action_type,
      entity_type,
      entity_id: entry.entity_id,
      before_values: entry.before_values,
      after_values: entry.after_values,
      ip_address: context.ip_address,
      user_agent: context.user_agent,
      metadata: entry.metadata
    })
  )

  // Log all entries, but don't fail if some fail
  const results = await Promise.allSettled(promises)

  const failures = results.filter(result => result.status === 'rejected')
  if (failures.length > 0) {
    logger.error('Some bulk audit entries failed', {
      failed_count: failures.length,
      total_count: entries.length,
      entity_type,
      action_type
    })
  }
}
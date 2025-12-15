import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

interface GlobalSearchResult {
  id: string
  type: 'contact' | 'project' | 'estimate' | 'message'
  title: string
  subtitle?: string
  href?: string
}

/**
 * GET /api/search/global
 * Global search for command palette
 * Optimized for fast search across key entities
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()

    if (!query || query.length === 0) {
      return successResponse({ results: [] })
    }

    logger.apiRequest('GET', '/api/search/global', { tenantId, userId: user.id, query })

    const supabase = await createClient()
    const results: GlobalSearchResult[] = []

    // Use parallel queries for better performance
    const searchPromises = []

    // Search pattern for ILIKE queries
    const searchPattern = `%${query.toLowerCase()}%`

    // 1. Search Contacts (most common search)
    searchPromises.push(
      supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone, stage')
        .eq('tenant_id', tenantId)
        .eq('is_deleted', false)
        .or(
          `first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern}`
        )
        .limit(5)
        .then(({ data }) => {
          if (data) {
            data.forEach((contact) => {
              results.push({
                id: contact.id,
                type: 'contact',
                title: `${contact.first_name} ${contact.last_name}`,
                subtitle: contact.email || contact.phone || `Stage: ${contact.stage}`,
                href: `/contacts/${contact.id}`,
              })
            })
          }
        })
    )

    // 2. Search Projects
    searchPromises.push(
      supabase
        .from('projects')
        .select('id, name, project_number, status, estimated_value')
        .eq('tenant_id', tenantId)
        .eq('is_deleted', false)
        .or(
          `name.ilike.${searchPattern},project_number.ilike.${searchPattern},description.ilike.${searchPattern}`
        )
        .limit(5)
        .then(({ data }) => {
          if (data) {
            data.forEach((project) => {
              results.push({
                id: project.id,
                type: 'project',
                title: project.name,
                subtitle: project.project_number ? `#${project.project_number} • ${project.status}` : project.status,
                href: `/projects/${project.id}`,
              })
            })
          }
        })
    )

    // 3. Search Jobs as "estimates" (since this seems to be a roofing CRM)
    searchPromises.push(
      supabase
        .from('jobs')
        .select('id, job_number, job_type, status, scheduled_date')
        .eq('tenant_id', tenantId)
        .eq('is_deleted', false)
        .or(
          `job_number.ilike.${searchPattern},scope_of_work.ilike.${searchPattern}`
        )
        .limit(5)
        .then(({ data }) => {
          if (data) {
            data.forEach((job) => {
              results.push({
                id: job.id,
                type: 'estimate',
                title: `Job ${job.job_number}`,
                subtitle: job.job_type ? `${job.job_type} • ${job.status}` : job.status,
                href: `/jobs/${job.id}`,
              })
            })
          }
        })
    )

    // 4. Search Call Logs as "messages"
    searchPromises.push(
      supabase
        .from('call_logs')
        .select('id, direction, duration, notes, created_at, contact_id')
        .eq('tenant_id', tenantId)
        .or(
          `notes.ilike.${searchPattern}`
        )
        .limit(5)
        .then(({ data }) => {
          if (data) {
            data.forEach((log) => {
              const duration = log.duration ? `${Math.floor(log.duration / 60)}m ${log.duration % 60}s` : ''
              results.push({
                id: log.id,
                type: 'message',
                title: `${log.direction === 'inbound' ? 'Incoming' : 'Outgoing'} Call`,
                subtitle: duration ? `${duration} • ${new Date(log.created_at).toLocaleDateString()}` : new Date(log.created_at).toLocaleDateString(),
                href: `/call-logs/${log.id}`,
              })
            })
          }
        })
    )

    // Execute all searches in parallel
    await Promise.all(searchPromises)

    // Sort results by type priority for better UX
    const typePriority: Record<string, number> = {
      contact: 1,
      project: 2,
      estimate: 3,
      message: 4,
    }

    results.sort((a, b) => {
      const priorityDiff = typePriority[a.type] - typePriority[b.type]
      if (priorityDiff !== 0) return priorityDiff
      return a.title.localeCompare(b.title)
    })

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/search/global', 200, duration)

    return successResponse({
      results: results.slice(0, 20), // Limit for performance
      total: results.length,
      query,
      duration,
    })

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error in GET /api/search/global:', { error, duration })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
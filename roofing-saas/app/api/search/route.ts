import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

interface SearchResult {
  id: string
  type: 'contact' | 'project' | 'job' | 'territory' | 'file' | 'call_log'
  title: string
  subtitle?: string
  description?: string
  url: string
  score?: number
}

/**
 * GET /api/search
 * Global search across all entities
 */
export const GET = withAuth(async (request: NextRequest, { tenantId }) => {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length === 0) {
      return successResponse({ results: [] })
    }

    const supabase = await createClient()
    const results: SearchResult[] = []

    // Search query (case-insensitive pattern)
    const searchPattern = `%${query.toLowerCase()}%`

    // 1. Search Contacts
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, phone, stage')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .or(
        `first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern}`
      )
      .limit(10)

    if (contacts) {
      contacts.forEach((contact) => {
        results.push({
          id: contact.id,
          type: 'contact',
          title: `${contact.first_name} ${contact.last_name}`,
          subtitle: contact.email || contact.phone || '',
          description: `Stage: ${contact.stage}`,
          url: `/contacts/${contact.id}`,
        })
      })
    }

    // 2. Search Projects
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, project_number, status, estimated_value')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .or(
        `name.ilike.${searchPattern},project_number.ilike.${searchPattern},description.ilike.${searchPattern}`
      )
      .limit(10)

    if (projects) {
      projects.forEach((project) => {
        results.push({
          id: project.id,
          type: 'project',
          title: project.name,
          subtitle: project.project_number ? `#${project.project_number}` : '',
          description: `Status: ${project.status} | Value: $${(project.estimated_value || 0).toLocaleString()}`,
          url: `/projects/${project.id}`,
        })
      })
    }

    // 3. Search Jobs
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, job_number, job_type, status, scheduled_date')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .or(
        `job_number.ilike.${searchPattern},scope_of_work.ilike.${searchPattern}`
      )
      .limit(10)

    if (jobs) {
      jobs.forEach((job) => {
        results.push({
          id: job.id,
          type: 'job',
          title: `Job ${job.job_number}`,
          subtitle: job.job_type || '',
          description: `Status: ${job.status}${job.scheduled_date ? ` | ${new Date(job.scheduled_date).toLocaleDateString()}` : ''}`,
          url: `/jobs/${job.id}`,
        })
      })
    }

    // 4. Search Territories
    const { data: territories } = await supabase
      .from('territories')
      .select('id, name, description')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .or(
        `name.ilike.${searchPattern},description.ilike.${searchPattern}`
      )
      .limit(10)

    if (territories) {
      territories.forEach((territory) => {
        results.push({
          id: territory.id,
          type: 'territory',
          title: territory.name,
          subtitle: '',
          description: territory.description || '',
          url: `/territories/${territory.id}`,
        })
      })
    }

    // 5. Search Files/Documents
    const { data: files } = await supabase
      .from('documents')
      .select('id, name, type, entity_type, entity_id')
      .eq('tenant_id', tenantId)
      .ilike('name', searchPattern)
      .limit(10)

    if (files) {
      files.forEach((file) => {
        results.push({
          id: file.id,
          type: 'file',
          title: file.name,
          subtitle: file.type || '',
          description: `Attached to ${file.entity_type}: ${file.entity_id}`,
          url: `/files/${file.id}`,
        })
      })
    }

    // 6. Search Call Logs
    const { data: callLogs } = await supabase
      .from('call_logs')
      .select('id, direction, duration, notes, created_at')
      .eq('tenant_id', tenantId)
      .or(
        `notes.ilike.${searchPattern},from_number.ilike.${searchPattern},to_number.ilike.${searchPattern}`
      )
      .limit(10)

    if (callLogs) {
      callLogs.forEach((log) => {
        results.push({
          id: log.id,
          type: 'call_log',
          title: `${log.direction === 'inbound' ? 'Incoming' : 'Outgoing'} Call`,
          subtitle: `${Math.floor((log.duration || 0) / 60)}m ${(log.duration || 0) % 60}s`,
          description: new Date(log.created_at).toLocaleDateString(),
          url: `/call-logs/${log.id}`,
        })
      })
    }

    // Sort results by relevance (for now, just by type priority)
    const typePriority: Record<string, number> = {
      contact: 1,
      project: 2,
      job: 3,
      territory: 4,
      file: 5,
      call_log: 6,
    }

    results.sort((a, b) => {
      const priorityDiff = typePriority[a.type] - typePriority[b.type]
      if (priorityDiff !== 0) return priorityDiff
      return a.title.localeCompare(b.title)
    })

    return successResponse({
      results: results.slice(0, 50), // Limit total results
      total: results.length,
      query,
    })
  } catch (error) {
    logger.error('Error in GET /api/search:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

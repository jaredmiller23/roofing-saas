import type { Json } from '@/lib/types/database.types'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { getRequestContext } from '@/lib/auth/request-context'
import { createContactSchema, contactFiltersSchema } from '@/lib/validations/contact'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError,
  mapSupabaseError,
  mapZodError,
  ConflictError
} from '@/lib/api/errors'
import { paginatedResponse, createdResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import type { AutoCreateProjectSetting } from '@/lib/types/api'
import { awardPointsSafe, POINT_VALUES } from '@/lib/gamification/award-points'
import { triggerWorkflow } from '@/lib/automation/engine'
import { getAuditContext, auditedCreate } from '@/lib/audit/audit-middleware'

/**
 * GET /api/contacts
 * List contacts with filtering, search, and pagination
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Read auth context from middleware headers (avoids redundant JWT validation
    // and tenant_users query). Falls back to direct auth for programmatic access.
    const ctx = getRequestContext(request)
    let userId: string
    let tenantId: string

    if (ctx) {
      userId = ctx.userId
      tenantId = ctx.tenantId
    } else {
      const user = await getCurrentUser()
      if (!user) {
        throw AuthenticationError('User not authenticated')
      }
      userId = user.id
      const tid = await getUserTenantId(userId)
      if (!tid) {
        throw AuthorizationError('User is not associated with a tenant')
      }
      tenantId = tid
    }

    logger.apiRequest('GET', '/api/contacts', { tenantId, userId })

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const includeProjects = searchParams.get('include') === 'projects'
    const rawFilters = {
      search: searchParams.get('search') || undefined,
      type: searchParams.get('type') || undefined,
      stage: searchParams.get('stage') || undefined,
      assigned_to: searchParams.get('assigned_to') || undefined,
      priority: searchParams.get('priority') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sort_by: searchParams.get('sort_by') || 'created_at',
      sort_order: (searchParams.get('sort_order') || 'desc') as 'asc' | 'desc',
    }

    // Validate filters
    const validatedFilters = contactFiltersSchema.safeParse(rawFilters)
    if (!validatedFilters.success) {
      throw mapZodError(validatedFilters.error)
    }

    const filters = validatedFilters.data
    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    // Apply filters
    if (filters.type) {
      query = query.eq('type', filters.type)
    }
    if (filters.stage) {
      query = query.eq('stage', filters.stage)
    }
    if (filters.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to)
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority)
    }

    // Full-text search
    if (filters.search) {
      query = query.textSearch('search_vector', filters.search, {
        type: 'websearch',
        config: 'english',
      })
    }

    // Pagination
    const page = filters.page || 1
    const limit = filters.limit || 20
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query.range(from, to)

    // Sorting
    query = query.order(filters.sort_by || 'created_at', {
      ascending: filters.sort_order === 'asc',
    })

    const { data: contacts, error, count } = await query

    if (error) {
      throw mapSupabaseError(error)
    }

    // When include=projects, batch-fetch projects for all returned contacts
    // in a single query (eliminates N+1: 2 queries instead of 50+)
    let responseContacts: Record<string, unknown>[] = contacts || []
    if (includeProjects && contacts && contacts.length > 0) {
      const contactIds = contacts.map(c => c.id)
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, status, estimated_value, approved_value, final_value, contact_id')
        .in('contact_id', contactIds)
        .eq('is_deleted', false)

      if (projects) {
        const projectsByContact = new Map<string, typeof projects>()
        for (const project of projects) {
          if (!project.contact_id) continue
          const list = projectsByContact.get(project.contact_id) || []
          list.push(project)
          projectsByContact.set(project.contact_id, list)
        }
        responseContacts = contacts.map(contact => ({
          ...contact,
          projects: projectsByContact.get(contact.id) || [],
        }))
      }
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/contacts', 200, duration)

    return paginatedResponse(responseContacts, { page, limit, total: count || 0 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Contacts API error', { error, duration })
    return errorResponse(error as Error)
  }
}

/**
 * POST /api/contacts
 * Create a new contact
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Read auth context from middleware headers (avoids redundant JWT validation
    // and tenant_users query). Falls back to direct auth for programmatic access.
    const ctx = getRequestContext(request)
    let userId: string
    let tenantId: string

    if (ctx) {
      userId = ctx.userId
      tenantId = ctx.tenantId
    } else {
      const user = await getCurrentUser()
      if (!user) {
        throw AuthenticationError('User not authenticated')
      }
      userId = user.id
      const tid = await getUserTenantId(userId)
      if (!tid) {
        throw AuthorizationError('User is not associated with a tenant')
      }
      tenantId = tid
    }

    // Get audit context for logging
    const auditContext = await getAuditContext(request)
    if (!auditContext) {
      throw AuthenticationError('Failed to get audit context')
    }

    logger.apiRequest('POST', '/api/contacts', { tenantId, userId })

    const body = await request.json()

    // Validate input
    const validatedData = createContactSchema.safeParse(body)
    if (!validatedData.success) {
      throw mapZodError(validatedData.error)
    }

    const supabase = await createClient()

    // Create contact with audit logging
    const contact = await auditedCreate(
      'contact',
      async () => {
        const { custom_fields, tags, ...contactFields } = validatedData.data
        const { data, error } = await supabase
          .from('contacts')
          .insert({
            ...contactFields,
            custom_fields: custom_fields as Json ?? null,
            tags: tags ?? null,
            tenant_id: tenantId,
            created_by: userId,
          })
          .select()
          .single()

        if (error) {
          // Handle duplicate email
          if (error.code === '23505') {
            throw ConflictError('A contact with this email already exists', { email: validatedData.data.email })
          }
          throw mapSupabaseError(error)
        }

        return data
      },
      auditContext,
      {
        operation: 'contact_creation',
        source: 'api',
        contact_type: validatedData.data.type
      }
    )

    // Check if we need to auto-create a project or prompt for project creation
    // Applies to all contact categories - user can decline if not applicable
    let autoCreatedProject = null
    let promptForProject = false

    // Fetch tenant setting for auto-creating projects
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('auto_create_project_for_homeowners')
      .eq('id', tenantId)
      .single()

    if (tenantError) {
      logger.error('Failed to fetch tenant settings', { error: tenantError, tenantId })
    } else {
      const setting = (tenant?.auto_create_project_for_homeowners || 'prompt') as AutoCreateProjectSetting

      if (setting === 'always') {
        // Auto-create project without prompting
        try {
          const contactName = contact.company || `${contact.first_name} ${contact.last_name}`
          const { data: project, error: projectError } = await supabase
            .from('projects')
            .insert({
              name: `${contactName} - Roofing Project`,
              contact_id: contact.id,
              tenant_id: tenantId,
              created_by: userId,
              pipeline_stage: 'prospect',
              type: 'roofing',
              lead_source: contact.contact_category || 'contact',
              priority: 'normal',
            })
            .select()
            .single()

          if (projectError) {
            logger.error('Failed to auto-create project', { error: projectError, contactId: contact.id })
          } else {
            autoCreatedProject = project
            logger.info('Auto-created project for contact', {
              projectId: project.id,
              contactId: contact.id,
              contactCategory: contact.contact_category,
              tenantId
            })
          }
        } catch (error) {
          logger.error('Exception during auto-project creation', { error, contactId: contact.id })
        }
      } else if (setting === 'prompt') {
        // Set flag to prompt user on frontend
        promptForProject = true
      }
      // 'never' - do nothing
    }

    // Award points for creating a contact (non-blocking)
    awardPointsSafe(
      userId,
      POINT_VALUES.CONTACT_CREATED,
      'Created new contact',
      contact.id
    )

    // Trigger automation workflows for contact creation (non-blocking)
    triggerWorkflow(tenantId, 'contact_created', {
      contact_id: contact.id,
      contact: contact,
      user_id: userId,
    }).catch((error) => {
      logger.error('Failed to trigger contact_created workflows', { error, contactId: contact.id })
    })

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/contacts', 201, duration)
    logger.info('Contact created', { contactId: contact.id, tenantId })

    // Return response with project creation info
    const response: { contact: typeof contact; project?: typeof autoCreatedProject; prompt_for_project?: boolean } = { contact }
    if (autoCreatedProject) {
      response.project = autoCreatedProject
    }
    if (promptForProject) {
      response.prompt_for_project = true
    }

    return createdResponse(response)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Create contact error', { error, duration })
    return errorResponse(error as Error)
  }
}

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
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
import type { ContactListResponse } from '@/lib/types/api'
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
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    logger.apiRequest('GET', '/api/contacts', { tenantId, userId: user.id })

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
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

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/contacts', 200, duration)

    const response: ContactListResponse = {
      contacts: contacts || [],
      total: count || 0,
      page,
      limit,
      has_more: count ? from + limit < count : false,
    }

    return paginatedResponse(response, { page, limit, total: count || 0 })
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
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    // Get audit context for logging
    const auditContext = await getAuditContext(request)
    if (!auditContext) {
      throw AuthenticationError('Failed to get audit context')
    }

    logger.apiRequest('POST', '/api/contacts', { tenantId, userId: user.id })

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
        const { data, error } = await supabase
          .from('contacts')
          .insert({
            ...validatedData.data,
            tenant_id: tenantId,
            created_by: user.id,
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

    // Award points for creating a contact (non-blocking)
    awardPointsSafe(
      user.id,
      POINT_VALUES.CONTACT_CREATED,
      'Created new contact',
      contact.id
    )

    // Trigger automation workflows for contact creation (non-blocking)
    triggerWorkflow(tenantId, 'contact_created', {
      contact_id: contact.id,
      contact: contact,
      user_id: user.id,
    }).catch((error) => {
      logger.error('Failed to trigger contact_created workflows', { error, contactId: contact.id })
    })

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/contacts', 201, duration)
    logger.info('Contact created', { contactId: contact.id, tenantId })

    return createdResponse({ contact })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Create contact error', { error, duration })
    return errorResponse(error as Error)
  }
}

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { AuthenticationError, AuthorizationError, InternalError, ValidationError } from '@/lib/api/errors'
import { successResponse, errorResponse, createdResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { getAuditContext, auditedCreate } from '@/lib/audit/audit-middleware'
import { createProjectSchema } from '@/lib/validations/project'

/**
 * Projects API
 * GET /api/projects - List projects with filtering and search
 * POST /api/projects - Create new project
 */

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant')
    }

    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams

    // Parse query parameters with validation
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50'))) // Max 100 per page
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const pipeline = searchParams.get('pipeline') || ''
    const stage = searchParams.get('stage') || ''
    const assignedTo = searchParams.get('assigned_to') || ''

    // Start building query
    let query = supabase
      .from('projects')
      .select(`
        id,
        name,
        project_number,
        contact_id,
        status,
        type,
        estimated_value,
        approved_value,
        final_value,
        created_at,
        updated_at,
        created_by,
        description,
        custom_fields,
        pipeline_stage,
        stage_changed_at,
        lead_source,
        priority,
        lead_score,
        estimated_close_date,
        adjuster_contact_id,
        contact:contact_id (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        adjuster:adjuster_contact_id (
          id,
          first_name,
          last_name,
          company,
          phone,
          email
        )
      `, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (pipeline) {
      query = query.eq('custom_fields->>proline_pipeline', pipeline)
    }

    if (stage) {
      query = query.eq('custom_fields->>proline_stage', stage)
    }

    if (assignedTo) {
      query = query.eq('custom_fields->>assigned_to', assignedTo)
    }

    // Apply search (project name or project number)
    if (search) {
      // Escape SQL wildcards to prevent unexpected matches
      const escapedSearch = search.replace(/[%_\\]/g, '\\$&')
      query = query.or(`name.ilike.%${escapedSearch}%,project_number.ilike.%${escapedSearch}%`)
    }

    // Exclude OLD RECRUITING pipeline (HR data, not sales)
    // Note: .neq() excludes NULLs, so use .or() to preserve projects without pipeline set
    query = query.or('custom_fields->>proline_pipeline.is.null,custom_fields->>proline_pipeline.neq.OLD RECRUITING')

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    // Order by created_at desc
    query = query.order('created_at', { ascending: false })

    const { data: projects, error, count } = await query

    if (error) {
      logger.error('Projects fetch error', { error })
      throw InternalError('Failed to fetch projects')
    }

    // Transform projects to include pipeline/stage from custom_fields
    const transformedProjects = projects?.map(project => ({
      ...project,
      pipeline: project.custom_fields?.proline_pipeline || null,
      stage: project.custom_fields?.proline_stage || null,
      assigned_to_name: project.custom_fields?.assigned_to || null,
      tags: project.custom_fields?.tags || [],
      lead_source: project.custom_fields?.lead_source || null,
    })) || []

    return successResponse({
      projects: transformedProjects,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    logger.error('Error in GET /api/projects', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant')
    }

    // Get audit context for logging
    const auditContext = await getAuditContext(request)
    if (!auditContext) {
      throw AuthenticationError('Failed to get audit context')
    }

    const body = await request.json()

    // Validate input - prevents clients from setting server-controlled fields
    const validationResult = createProjectSchema.safeParse(body)
    if (!validationResult.success) {
      logger.warn('Project validation failed', { errors: validationResult.error.issues })
      throw ValidationError('Invalid project data', validationResult.error.issues)
    }
    const validatedData = validationResult.data

    // Create project with audit logging
    const project = await auditedCreate(
      'project',
      async () => {
        const supabase = await createClient()

        const { data, error } = await supabase
          .from('projects')
          .insert({
            ...validatedData,
            tenant_id: tenantId,
            created_by: user.id,
          })
          .select()
          .single()

        if (error) {
          logger.error('Project creation error', { error })
          throw InternalError('Failed to create project')
        }

        return data
      },
      auditContext,
      {
        operation: 'project_creation',
        source: 'api',
        project_type: validatedData.type,
        estimated_value: validatedData.estimated_value
      }
    )

    return createdResponse({ project })
  } catch (error) {
    logger.error('Error in POST /api/projects', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

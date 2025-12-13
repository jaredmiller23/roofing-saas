import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, ValidationError, NotFoundError, ConflictError, InternalError } from '@/lib/api/errors'
import { successResponse, createdResponse, errorResponse } from '@/lib/api/response'
import type {
  SavedFilter,
  GetSavedFiltersResponse,
  CreateSavedFilterRequest,
  CreateSavedFilterResponse,
} from '@/lib/filters/types'

/**
 * GET /api/filters/saved
 * Get all saved filters for an entity type
 *
 * Query params:
 * - entity_type: 'contacts' | 'projects' | 'pipeline' | 'activities'
 * - include_shared: boolean (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const searchParams = request.nextUrl.searchParams
    const entity_type = searchParams.get('entity_type')
    const include_shared = searchParams.get('include_shared') !== 'false'

    if (!entity_type) {
      throw ValidationError('entity_type query parameter required')
    }

    const supabase = await createClient()

    // Build query - get user's own filters + shared filters (RLS handles tenant isolation)
    const { data, error } = await supabase
      .from('saved_filters')
      .select('*')
      .eq('entity_type', entity_type)
      .order('is_default', { ascending: false }) // Default filters first
      .order('name', { ascending: true })

    if (error) {
      logger.error('Error fetching saved filters:', { error })
      throw InternalError('Failed to fetch saved filters')
    }

    // Filter based on include_shared param (RLS policy already filters by tenant + (created_by OR is_shared))
    let filters = (data || []) as SavedFilter[]
    if (!include_shared) {
      filters = filters.filter((f) => f.created_by === user.id)
    }

    const response: GetSavedFiltersResponse = {
      filters,
      total: filters.length,
    }

    return successResponse(response)
  } catch (error) {
    logger.error('Error in GET /api/filters/saved:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * POST /api/filters/saved
 * Create new saved filter
 *
 * Body: CreateSavedFilterRequest
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const supabase = await createClient()
    const body: CreateSavedFilterRequest = await request.json()

    // Validate required fields
    if (
      !body.entity_type ||
      !body.name ||
      !body.filter_criteria ||
      Object.keys(body.filter_criteria).length === 0
    ) {
      throw ValidationError('Missing required fields (entity_type, name, filter_criteria)')
    }

    // Get tenant_id
    const { data: tenant } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (!tenant) {
      throw NotFoundError('Tenant not found')
    }

    // If setting as default, unset other defaults for this entity type
    if (body.is_default) {
      await supabase
        .from('saved_filters')
        .update({ is_default: false })
        .eq('tenant_id', tenant.tenant_id)
        .eq('entity_type', body.entity_type)
        .eq('created_by', user.id)
    }

    // Insert saved filter
    const { data, error } = await supabase
      .from('saved_filters')
      .insert({
        tenant_id: tenant.tenant_id,
        entity_type: body.entity_type,
        name: body.name,
        description: body.description || null,
        filter_criteria: body.filter_criteria,
        is_shared: body.is_shared ?? false,
        is_default: body.is_default ?? false,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating saved filter:', { error })
      // Check for unique constraint violation
      if (error.code === '23505') {
        throw ConflictError('A filter with this name already exists')
      }
      throw InternalError('Failed to create saved filter')
    }

    const response: CreateSavedFilterResponse = {
      filter: data as SavedFilter,
    }

    return createdResponse(response)
  } catch (error) {
    logger.error('Error in POST /api/filters/saved:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

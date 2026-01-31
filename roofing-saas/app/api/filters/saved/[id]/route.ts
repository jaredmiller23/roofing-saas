import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, NotFoundError, ConflictError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import type {
  SavedFilter,
  UpdateSavedFilterRequest,
  UpdateSavedFilterResponse,
} from '@/lib/filters/types'

/**
 * PATCH /api/filters/saved/:id
 * Update saved filter (owner only)
 *
 * Body: UpdateSavedFilterRequest
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const { id } = await params
    const supabase = await createClient()
    const body: UpdateSavedFilterRequest = await request.json()

    // Get existing filter to check ownership
    const { data: existing } = await supabase
      .from('saved_filters')
      .select('created_by, entity_type, tenant_id, is_system')
      .eq('id', id)
      .single()

    if (!existing) {
      throw NotFoundError('Filter not found')
    }

    // Check ownership (RLS policy also enforces this)
    if (existing.created_by !== user.id) {
      throw AuthorizationError('You can only update your own filters')
    }

    // Prevent updating system filters
    if (existing.is_system) {
      throw AuthorizationError('Cannot update system filters')
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.filter_criteria !== undefined)
      updates.filter_criteria = body.filter_criteria
    if (body.is_shared !== undefined) updates.is_shared = body.is_shared

    // Handle is_default specially (unset other defaults)
    if (body.is_default !== undefined) {
      if (body.is_default) {
        // Unset other defaults for this entity type
        await supabase
          .from('saved_filters')
          .update({ is_default: false })
          .eq('tenant_id', existing.tenant_id)
          .eq('entity_type', existing.entity_type)
          .eq('created_by', user.id)
          .neq('id', id)
      }
      updates.is_default = body.is_default
    }

    if (Object.keys(updates).length === 0) {
      throw ValidationError('No fields to update')
    }

    const { data, error } = await supabase
      .from('saved_filters')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating saved filter:', { error })
      // Check for unique constraint violation
      if (error.code === '23505') {
        throw ConflictError('A filter with this name already exists')
      }
      throw InternalError('Failed to update saved filter')
    }

    const response: UpdateSavedFilterResponse = {
      filter: data as unknown as SavedFilter,
    }

    return successResponse(response)
  } catch (error) {
    logger.error('Error in PATCH /api/filters/saved/:id:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * DELETE /api/filters/saved/:id
 * Delete saved filter (owner only, except system filters)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const { id } = await params
    const supabase = await createClient()

    // Get existing filter to check ownership and system flag
    const { data: existing } = await supabase
      .from('saved_filters')
      .select('created_by, is_system')
      .eq('id', id)
      .single()

    if (!existing) {
      throw NotFoundError('Filter not found')
    }

    // Check ownership
    if (existing.created_by !== user.id) {
      throw AuthorizationError('You can only delete your own filters')
    }

    // Prevent deleting system filters
    if (existing.is_system) {
      throw AuthorizationError('Cannot delete system filters')
    }

    const { error } = await supabase.from('saved_filters').delete().eq('id', id)

    if (error) {
      logger.error('Error deleting saved filter:', { error })
      throw InternalError('Failed to delete saved filter')
    }

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Error in DELETE /api/filters/saved/:id:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

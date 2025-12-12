import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      return NextResponse.json({ error: 'Filter not found' }, { status: 404 })
    }

    // Check ownership (RLS policy also enforces this)
    if (existing.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only update your own filters' },
        { status: 403 }
      )
    }

    // Prevent updating system filters
    if (existing.is_system) {
      return NextResponse.json(
        { error: 'Cannot update system filters' },
        { status: 403 }
      )
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
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
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
        return NextResponse.json(
          { error: 'A filter with this name already exists' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to update saved filter' },
        { status: 500 }
      )
    }

    const response: UpdateSavedFilterResponse = {
      filter: data as SavedFilter,
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error in PATCH /api/filters/saved/:id:', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      return NextResponse.json({ error: 'Filter not found' }, { status: 404 })
    }

    // Check ownership
    if (existing.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only delete your own filters' },
        { status: 403 }
      )
    }

    // Prevent deleting system filters
    if (existing.is_system) {
      return NextResponse.json(
        { error: 'Cannot delete system filters' },
        { status: 403 }
      )
    }

    const { error } = await supabase.from('saved_filters').delete().eq('id', id)

    if (error) {
      logger.error('Error deleting saved filter:', { error })
      return NextResponse.json(
        { error: 'Failed to delete saved filter' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error in DELETE /api/filters/saved/:id:', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Single Warranty API
 * GET    /api/warranties/[id]   - Get a single warranty
 * PATCH  /api/warranties/[id]   - Update a warranty
 * DELETE /api/warranties/[id]   - Soft-delete a warranty
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import type { Warranty } from '@/lib/types/warranty'

export const GET = withAuthParams(async (
  _request: NextRequest,
  { tenantId },
  { params }
) => {
  try {
    const supabase = await createClient()
    const { id } = await params

    if (!id) {
      throw ValidationError('Warranty ID is required')
    }

    const { data, error } = await supabase
      .from('warranties' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (error || !data) {
      throw NotFoundError('Warranty')
    }

    const warranty = data as unknown as Warranty

    return successResponse({ warranty })
  } catch (error) {
    logger.error('Warranty GET error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

export const PATCH = withAuthParams(async (
  request: NextRequest,
  { tenantId },
  { params }
) => {
  try {
    const supabase = await createClient()
    const { id } = await params

    if (!id) {
      throw ValidationError('Warranty ID is required')
    }

    const body = await request.json()

    // Whitelist updatable fields to prevent mass assignment
    const allowedFields = [
      'warranty_type', 'provider', 'duration_years', 'start_date',
      'end_date', 'terms', 'document_url', 'status',
      'claim_date', 'claim_notes',
    ] as const
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      throw ValidationError('No valid fields to update')
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('warranties' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .select()
      .single()

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        throw NotFoundError('Warranty')
      }
      logger.error('Failed to update warranty', { error, tenantId, warrantyId: id })
      throw InternalError('Failed to update warranty')
    }

    const warranty = data as unknown as Warranty

    logger.info('Warranty updated', { warrantyId: id, tenantId })

    return successResponse({ warranty })
  } catch (error) {
    logger.error('Warranty PATCH error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

export const DELETE = withAuthParams(async (
  _request: NextRequest,
  { tenantId },
  { params }
) => {
  try {
    const supabase = await createClient()
    const { id } = await params

    if (!id) {
      throw ValidationError('Warranty ID is required')
    }

    const { error } = await supabase
      .from('warranties' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      logger.error('Failed to delete warranty', { error, tenantId, warrantyId: id })
      throw InternalError('Failed to delete warranty')
    }

    logger.info('Warranty soft-deleted', { warrantyId: id, tenantId })

    return successResponse(null)
  } catch (error) {
    logger.error('Warranty DELETE error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

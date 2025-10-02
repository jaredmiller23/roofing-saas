import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// GeoJSON validation schema
const geoJSONSchema = z.object({
  type: z.enum(['Polygon', 'MultiPolygon']),
  coordinates: z.array(z.any()),
})

const updateTerritorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  boundary_data: geoJSONSchema.optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
})

/**
 * GET /api/territories/[id]
 * Get a single territory by ID
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const user = await getCurrentUser()
    if (!user) {
      return errorResponse(new Error('User not authenticated'), 401)
    }

    // Get tenant ID
    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return errorResponse(new Error('No tenant found for user'), 403)
    }

    const { id } = await params
    const supabase = await createClient()
    const territoryId = id

    // Fetch territory
    const { data, error } = await supabase
      .from('territories')
      .select('*')
      .eq('id', territoryId)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (error || !data) {
      logger.error('Territory not found', { error, territoryId })
      return errorResponse(new Error('Territory not found'), 404)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', `/api/territories/${territoryId}`, 200, duration)

    return successResponse({
      territory: data,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Territory get error', { error, duration })
    return errorResponse(error as Error)
  }
}

/**
 * PATCH /api/territories/[id]
 * Update a territory
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const user = await getCurrentUser()
    if (!user) {
      return errorResponse(new Error('User not authenticated'), 401)
    }

    // Get tenant ID
    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return errorResponse(new Error('No tenant found for user'), 403)
    }

    const { id } = await params
    const territoryId = id

    // Parse and validate request body
    const body = await request.json()
    const validatedData = updateTerritorySchema.safeParse(body)

    if (!validatedData.success) {
      const errors = validatedData.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      throw new Error(errors)
    }

    const supabase = await createClient()

    // Verify territory exists and belongs to tenant
    const { data: existingTerritory, error: fetchError } = await supabase
      .from('territories')
      .select('*')
      .eq('id', territoryId)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (fetchError || !existingTerritory) {
      return errorResponse(new Error('Territory not found'), 404)
    }

    // If assigned_to is being updated, verify the user exists and belongs to the tenant
    if (validatedData.data.assigned_to !== undefined && validatedData.data.assigned_to !== null) {
      const { data: assignedUser, error: userError } = await supabase
        .from('tenant_users')
        .select('user_id')
        .eq('tenant_id', tenantId)
        .eq('user_id', validatedData.data.assigned_to)
        .single()

      if (userError || !assignedUser) {
        throw new Error('Assigned user not found or does not belong to tenant')
      }
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (validatedData.data.name !== undefined) {
      updateData.name = validatedData.data.name
    }
    if (validatedData.data.description !== undefined) {
      updateData.description = validatedData.data.description
    }
    if (validatedData.data.boundary_data !== undefined) {
      updateData.boundary_data = validatedData.data.boundary_data
    }
    if (validatedData.data.assigned_to !== undefined) {
      updateData.assigned_to = validatedData.data.assigned_to
    }

    // Update territory
    const { data, error } = await supabase
      .from('territories')
      .update(updateData)
      .eq('id', territoryId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      logger.error('Territory update error', { error })
      throw new Error(`Failed to update territory: ${error.message}`)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('PATCH', `/api/territories/${territoryId}`, 200, duration)

    return successResponse({
      message: 'Territory updated successfully',
      territory: data,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Territory update error', { error, duration })
    return errorResponse(error as Error)
  }
}

/**
 * DELETE /api/territories/[id]
 * Soft delete a territory
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const user = await getCurrentUser()
    if (!user) {
      return errorResponse(new Error('User not authenticated'), 401)
    }

    // Get tenant ID
    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return errorResponse(new Error('No tenant found for user'), 403)
    }

    const { id } = await params
    const supabase = await createClient()
    const territoryId = id

    // Verify territory exists and belongs to tenant
    const { data: existingTerritory, error: fetchError } = await supabase
      .from('territories')
      .select('*')
      .eq('id', territoryId)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (fetchError || !existingTerritory) {
      return errorResponse(new Error('Territory not found'), 404)
    }

    // Soft delete the territory
    const { error: deleteError } = await supabase
      .from('territories')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', territoryId)
      .eq('tenant_id', tenantId)

    if (deleteError) {
      logger.error('Territory delete error', { error: deleteError })
      throw new Error(`Failed to delete territory: ${deleteError.message}`)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('DELETE', `/api/territories/${territoryId}`, 200, duration)

    return successResponse({
      message: 'Territory deleted successfully',
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Territory delete error', { error, duration })
    return errorResponse(error as Error)
  }
}

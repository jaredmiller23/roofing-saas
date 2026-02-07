/**
 * Warranties API
 * GET  /api/warranties         - List warranties for tenant
 * POST /api/warranties         - Create a new warranty
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, createdResponse, errorResponse } from '@/lib/api/response'
import type { Warranty } from '@/lib/types/warranty'

const createWarrantySchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  warranty_type: z.enum(['manufacturer', 'workmanship', 'material', 'extended']),
  provider: z.string().optional().nullable(),
  duration_years: z.number().int().min(1, 'Duration must be at least 1 year'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  terms: z.string().optional().nullable(),
  document_url: z.string().url().optional().nullable(),
  status: z.enum(['active', 'expired', 'claimed', 'voided']).optional().default('active'),
})

export const GET = withAuth(async (request: NextRequest, { tenantId }) => {
  try {
    const supabase = await createClient()

    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('project_id')
    const status = searchParams.get('status')

     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from as any)('warranties')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .order('end_date', { ascending: true })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Failed to fetch warranties', { error, tenantId })
      throw InternalError('Failed to fetch warranties')
    }

    const warranties = (data ?? []) as unknown as Warranty[]

    return successResponse({ warranties })
  } catch (error) {
    logger.error('Warranties API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

export const POST = withAuth(async (request: NextRequest, { userId, tenantId }) => {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const parsed = createWarrantySchema.safeParse(body)

    if (!parsed.success) {
      throw ValidationError('Validation failed', parsed.error.issues)
    }

    const {
      project_id,
      warranty_type,
      provider,
      duration_years,
      start_date,
      end_date,
      terms,
      document_url,
      status,
    } = parsed.data

     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from as any)('warranties')
      .insert({
        tenant_id: tenantId,
        project_id,
        warranty_type,
        provider: provider ?? null,
        duration_years,
        start_date,
        end_date,
        terms: terms ?? null,
        document_url: document_url ?? null,
        status,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create warranty', { error, tenantId })
      throw InternalError('Failed to create warranty')
    }

    const warranty = data as unknown as Warranty

    logger.info('Warranty created', { warrantyId: warranty.id, projectId: project_id, tenantId })

    return createdResponse({ warranty })
  } catch (error) {
    logger.error('Warranties API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

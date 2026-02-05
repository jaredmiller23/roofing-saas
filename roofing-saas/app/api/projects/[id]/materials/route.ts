/**
 * Material Calculation API
 *
 * GET  /api/projects/[id]/materials - Calculate materials from project measurements
 * POST /api/projects/[id]/materials - Generate and save material order to quote
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuthParams, type AuthContext } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import {
  ValidationError,
  NotFoundError,
  InternalError,
} from '@/lib/api/errors'
import { successResponse, errorResponse, createdResponse } from '@/lib/api/response'
import {
  calculateMaterialsWithLineItems,
  validateMeasurements,
  DEFAULT_MATERIAL_CONFIG,
} from '@/lib/materials'
import type { RoofMeasurements, MaterialConfig } from '@/lib/materials'

export const dynamic = 'force-dynamic'

/**
 * GET /api/projects/[id]/materials
 *
 * Calculate materials from project measurements without saving.
 * Returns material list and suggested line items.
 *
 * Query params:
 * - source: 'contact' | 'project' | 'manual' (default: 'contact')
 *
 * If source is 'manual', expects measurements in query params:
 * - totalSquares, rakesEavesLF, valleysPenetrationsLF, hipsRidgesLF, ridgeLF
 */
export const GET = withAuthParams(
  async (
    request: NextRequest,
    { tenantId }: AuthContext,
    { params }
  ) => {
    try {
      const supabase = await createClient()
      const resolvedParams = await params
      const projectId = resolvedParams.id

      if (!projectId) {
        throw ValidationError('Project ID is required')
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(projectId)) {
        throw ValidationError('Invalid project ID format')
      }

      const searchParams = request.nextUrl.searchParams
      const source = searchParams.get('source') || 'contact'

      let measurements: RoofMeasurements

      if (source === 'manual') {
        // Parse measurements from query params
        measurements = {
          totalSquares: parseFloat(searchParams.get('totalSquares') || '0'),
          rakesEavesLF: parseFloat(searchParams.get('rakesEavesLF') || '0'),
          valleysPenetrationsLF: parseFloat(searchParams.get('valleysPenetrationsLF') || '0'),
          hipsRidgesLF: parseFloat(searchParams.get('hipsRidgesLF') || '0'),
          ridgeLF: parseFloat(searchParams.get('ridgeLF') || '0'),
        }

        // Optional fields
        const stepFlashingLF = searchParams.get('stepFlashingLF')
        if (stepFlashingLF) {
          measurements.stepFlashingLF = parseFloat(stepFlashingLF)
        }

        const smallPipeBoots = searchParams.get('smallPipeBoots')
        const largePipeBoots = searchParams.get('largePipeBoots')
        if (smallPipeBoots || largePipeBoots) {
          measurements.pipeBootCount = {
            small: parseInt(smallPipeBoots || '0', 10),
            large: parseInt(largePipeBoots || '0', 10),
          }
        }
      } else {
        // Fetch project
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('id, contact_id, materials_list')
          .eq('id', projectId)
          .eq('tenant_id', tenantId)
          .eq('is_deleted', false)
          .single()

        if (projectError || !project) {
          logger.error('Error fetching project', { error: projectError })
          throw NotFoundError('Project')
        }

        // Fetch contact if we need it
        let contactData: { square_footage: number | null; roof_type: string | null } | null = null
        if (source === 'contact' && project.contact_id) {
          const { data: contact } = await supabase
            .from('contacts')
            .select('square_footage, roof_type')
            .eq('id', project.contact_id)
            .single()
          contactData = contact
        }

        // Try to get measurements from different sources
        measurements = extractMeasurements(
          {
            materials_list: project.materials_list,
            contact: contactData,
          },
          source
        )
      }

      // Validate measurements
      try {
        validateMeasurements(measurements)
      } catch (validationError) {
        throw ValidationError(
          validationError instanceof Error
            ? validationError.message
            : 'Invalid measurements'
        )
      }

      // Calculate materials
      const result = calculateMaterialsWithLineItems(measurements)

      return successResponse({
        ...result,
        source,
        projectId,
      })
    } catch (error) {
      logger.error('Error in GET /api/projects/:id/materials', { error })
      return errorResponse(error instanceof Error ? error : InternalError())
    }
  }
)

/**
 * POST /api/projects/[id]/materials
 *
 * Calculate materials and save to project's materials_list.
 * Optionally creates quote line items.
 *
 * Request body:
 * {
 *   measurements: RoofMeasurements,
 *   config?: Partial<MaterialConfig>,
 *   createQuoteItems?: boolean,
 *   quoteOptionId?: string
 * }
 */
export const POST = withAuthParams(
  async (
    request: NextRequest,
    { tenantId }: AuthContext,
    { params }
  ) => {
    try {
      const supabase = await createClient()
      const resolvedParams = await params
      const projectId = resolvedParams.id

      if (!projectId) {
        throw ValidationError('Project ID is required')
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(projectId)) {
        throw ValidationError('Invalid project ID format')
      }

      const body = await request.json()
      const {
        measurements,
        config,
        createQuoteItems = false,
        quoteOptionId,
      } = body as {
        measurements: RoofMeasurements
        config?: Partial<MaterialConfig>
        createQuoteItems?: boolean
        quoteOptionId?: string
      }

      if (!measurements) {
        throw ValidationError('Measurements are required')
      }

      // Validate measurements
      try {
        validateMeasurements(measurements)
      } catch (validationError) {
        throw ValidationError(
          validationError instanceof Error
            ? validationError.message
            : 'Invalid measurements'
        )
      }

      // Verify project exists and belongs to tenant
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, materials_list')
        .eq('id', projectId)
        .eq('tenant_id', tenantId)
        .eq('is_deleted', false)
        .single()

      if (projectError || !project) {
        logger.error('Error fetching project', { error: projectError })
        throw NotFoundError('Project')
      }

      // Calculate materials with custom config if provided
      const mergedConfig: MaterialConfig = {
        ...DEFAULT_MATERIAL_CONFIG,
        ...config,
      }

      const result = calculateMaterialsWithLineItems(measurements, mergedConfig)

      // Save materials_list to project
      // MaterialList is JSON-serializable but TypeScript needs explicit casting
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          materials_list: JSON.parse(JSON.stringify(result.materials)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId)
        .eq('tenant_id', tenantId)

      if (updateError) {
        logger.error('Error saving materials to project', { error: updateError })
        throw InternalError('Failed to save materials')
      }

      // Optionally create quote line items
      let createdLineItems = null
      if (createQuoteItems && quoteOptionId) {
        // Verify quote option exists
        const { data: quoteOption, error: quoteError } = await supabase
          .from('quote_options')
          .select('id')
          .eq('id', quoteOptionId)
          .eq('tenant_id', tenantId)
          .single()

        if (quoteError || !quoteOption) {
          logger.warn('Quote option not found, skipping line item creation', {
            quoteOptionId,
          })
        } else {
          // Get max sort_order for existing items
          const { data: existingItems } = await supabase
            .from('quote_line_items')
            .select('sort_order')
            .eq('quote_option_id', quoteOptionId)
            .order('sort_order', { ascending: false })
            .limit(1)

          const startSortOrder = (existingItems?.[0]?.sort_order ?? -1) + 1

          // Insert line items
          const lineItemsToInsert = result.lineItems.map((item, index) => ({
            quote_option_id: quoteOptionId,
            tenant_id: tenantId,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            total_price: item.total_price,
            category: item.category,
            sort_order: startSortOrder + index,
          }))

          const { data: insertedItems, error: insertError } = await supabase
            .from('quote_line_items')
            .insert(lineItemsToInsert)
            .select()

          if (insertError) {
            logger.error('Error creating quote line items', { error: insertError })
            // Don't fail the whole request, just log the error
          } else {
            createdLineItems = insertedItems
          }
        }
      }

      return createdResponse({
        ...result,
        projectId,
        saved: true,
        quoteLineItems: createdLineItems,
      })
    } catch (error) {
      logger.error('Error in POST /api/projects/:id/materials', { error })
      return errorResponse(error instanceof Error ? error : InternalError())
    }
  }
)

/**
 * Extract measurements from project data
 */
function extractMeasurements(
  project: {
    materials_list: unknown
    contact?: { square_footage: number | null; roof_type: string | null } | null
  },
  source: string
): RoofMeasurements {
  // If we have saved materials_list with measurements, use those
  if (
    project.materials_list &&
    typeof project.materials_list === 'object' &&
    'summary' in (project.materials_list as Record<string, unknown>)
  ) {
    const savedMaterials = project.materials_list as {
      summary: { totalSquares: number }
    }
    // Return a minimal measurement set from saved data
    // This is a fallback - ideally measurements should be passed explicitly
    return {
      totalSquares: savedMaterials.summary.totalSquares,
      rakesEavesLF: 0,
      valleysPenetrationsLF: 0,
      hipsRidgesLF: 0,
      ridgeLF: 0,
    }
  }

  // Try to estimate from contact's square_footage
  const contact = project.contact as { square_footage: number | null } | null
  if (source === 'contact' && contact?.square_footage) {
    // Convert building square footage to roof squares
    // This is a rough estimate - roof area varies based on pitch, overhangs, etc.
    // Using 1.2x multiplier as a conservative estimate for typical pitched roofs
    const estimatedRoofSqft = contact.square_footage * 1.2
    const totalSquares = estimatedRoofSqft / 100

    // Estimate perimeter based on rough building dimensions
    // Assuming roughly square footprint for simplicity
    const estimatedSide = Math.sqrt(contact.square_footage)
    const estimatedPerimeter = estimatedSide * 4
    const rakesEavesLF = estimatedPerimeter * 1.1 // Slight increase for overhangs

    return {
      totalSquares,
      rakesEavesLF,
      valleysPenetrationsLF: totalSquares * 2, // Rough estimate: 2 LF per square
      hipsRidgesLF: estimatedSide * 1.5, // Estimate based on building dimension
      ridgeLF: estimatedSide, // Main ridge roughly equals one side
    }
  }

  // No measurements available
  throw ValidationError(
    'No measurements available. Please provide measurements manually or ensure the contact has square_footage data.'
  )
}

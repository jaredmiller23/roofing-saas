/**
 * THE PACKET - Claims Documentation Package API
 *
 * POST /api/projects/[id]/claims/packet - Generate a new packet
 * GET /api/projects/[id]/claims/packet - Get latest packet for project
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { errorResponse } from '@/lib/api/response'
import { generatePacket } from '@/lib/packet'
import type { PacketGenerationInput } from '@/lib/packet/types'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * POST - Generate a new claims packet
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const { id: projectId } = await params
    const supabase = await createClient()

    // Verify project exists and user has access
    // Only select columns that actually exist on the projects table
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, tenant_id, contact_id, custom_fields')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      logger.error('Project lookup failed for packet generation:', { projectId, error: projectError })
      throw NotFoundError('Project')
    }

    // Fetch contact separately to avoid PostgREST FK ambiguity
    // (projects has two FKs to contacts: contact_id and adjuster_contact_id)
    let contactCarrier: string | undefined
    let contactAddress: { city?: string; state?: string } = {}
    if (project.contact_id) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('insurance_carrier, address_city, address_state')
        .eq('id', project.contact_id)
        .single()

      if (contact) {
        contactCarrier = contact.insurance_carrier
        contactAddress = {
          city: contact.address_city || undefined,
          state: contact.address_state || undefined,
        }
      }
    }

    // Parse request body for options
    let options: Partial<PacketGenerationInput> = {}
    try {
      const body = await request.json()
      options = body || {}
    } catch {
      // No body provided, use defaults
    }

    // Read roof_manufacturer from custom_fields if available
    const customFields = (project.custom_fields || {}) as Record<string, unknown>
    const projectRoofManufacturer = customFields.roof_manufacturer as string | undefined

    // Build input from project data and request options
    const input: PacketGenerationInput = {
      project_id: projectId,
      include_weather: options.include_weather ?? true,
      include_codes: options.include_codes ?? true,
      include_manufacturer_specs: options.include_manufacturer_specs ?? true,
      include_policy_provisions: options.include_policy_provisions ?? true,
      carrier: options.carrier || contactCarrier,
      roof_manufacturer: options.roof_manufacturer || projectRoofManufacturer,
      jurisdiction: options.jurisdiction || {
        state: contactAddress.state || 'TN',
        county: undefined,
        city: contactAddress.city,
      },
    }

    // Generate the packet
    const result = await generatePacket(input)

    if (!result.success || !result.packet) {
      throw InternalError(result.error || 'Failed to generate packet')
    }

    logger.info('Claims packet generated', {
      projectId,
      packetId: result.packet.id,
      codesCount: result.packet.applicable_codes.length,
      specsCount: result.packet.manufacturer_specs.length,
      provisionsCount: result.packet.policy_provisions.length,
      recommendedAction: result.packet.summary.recommended_action,
    })

    return NextResponse.json({
      success: true,
      packet: result.packet,
    })
  } catch (error) {
    logger.error('Error generating claims packet:', { error })
    return errorResponse(error instanceof Error ? error : InternalError('Failed to generate packet'))
  }
}

/**
 * GET - Retrieve the latest packet for a project
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const { id: projectId } = await params
    const supabase = await createClient()

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      throw NotFoundError('Project')
    }

    // Get latest packet for this project
    const { data: packet, error: packetError } = await supabase
      .from('packets')
      .select('*')
      .eq('project_id', projectId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (packetError) {
      logger.error('Error fetching packet:', { error: packetError })
      throw InternalError('Failed to fetch packet')
    }

    if (!packet) {
      return NextResponse.json({
        success: true,
        packet: null,
        message: 'No packet has been generated for this project yet',
      })
    }

    return NextResponse.json({
      success: true,
      packet: packet.packet_data,
      generated_at: packet.generated_at,
      status: packet.status,
      pdf_url: packet.pdf_url,
    })
  } catch (error) {
    logger.error('Error fetching claims packet:', { error })
    return errorResponse(error instanceof Error ? error : InternalError('Failed to fetch packet'))
  }
}

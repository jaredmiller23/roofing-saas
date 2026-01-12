/**
 * Claims Sync Service
 *
 * Handles synchronization between Roofing SaaS projects and Claims Agent module.
 * Provides data transformation and API communication.
 */

import { type SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import type {
  ProjectToClaimSync,
  ClaimSyncResponse,
  ClaimExportPackage,
} from './types'
import {
  type StormEventData,
  generateCausationNarrative,
  calculateEvidenceScore,
} from '@/lib/weather/causation-generator'

// Claims Agent API configuration
// In production, this would be an environment variable
const CLAIMS_AGENT_API_URL = process.env.CLAIMS_AGENT_API_URL || ''
const CLAIMS_AGENT_API_KEY = process.env.CLAIMS_AGENT_API_KEY || ''

/**
 * Gather project data for syncing to Claims Agent
 */
export async function gatherProjectSyncData(
  supabase: SupabaseClient,
  projectId: string
): Promise<ProjectToClaimSync | null> {
  // Fetch project with contact
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select(`
      id,
      contact_id,
      storm_event_id,
      name,
      description,
      estimated_value,
      start_date,
      contacts:contact_id (
        id,
        first_name,
        last_name,
        email,
        phone,
        address,
        city,
        state,
        zip,
        custom_fields
      )
    `)
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    logger.error('Failed to fetch project for sync', { projectId, error: projectError })
    return null
  }

  const contact = Array.isArray(project.contacts)
    ? project.contacts[0]
    : project.contacts

  if (!contact) {
    logger.error('Project has no associated contact', { projectId })
    return null
  }

  // Extract insurance info from contact custom_fields if available
  const customFields = (contact.custom_fields || {}) as Record<string, unknown>
  const insuranceCarrier = customFields.insurance_carrier as string | undefined
  const policyNumber = customFields.policy_number as string | undefined

  return {
    project_id: project.id,
    contact_id: project.contact_id,
    storm_event_id: project.storm_event_id || undefined,

    // Property address from contact
    property_address: contact.address || '',
    property_city: contact.city || '',
    property_state: contact.state || 'TN',
    property_zip: contact.zip || '',

    // Financial from project
    estimated_value: project.estimated_value || undefined,
    date_of_loss: project.start_date || undefined,

    // Contact info
    contact_first_name: contact.first_name,
    contact_last_name: contact.last_name,
    contact_email: contact.email || undefined,
    contact_phone: contact.phone || undefined,

    // Insurance info
    insurance_carrier: insuranceCarrier,
    policy_number: policyNumber,
  }
}

/**
 * Sync project to Claims Agent (create or update claim)
 *
 * Note: This is a placeholder for when Claims Agent API is available.
 * For now, it just updates the project's claim_id field if provided.
 */
export async function syncProjectToClaims(
  supabase: SupabaseClient,
  projectId: string
): Promise<ClaimSyncResponse> {
  try {
    // Gather sync data
    const syncData = await gatherProjectSyncData(supabase, projectId)

    if (!syncData) {
      return {
        success: false,
        error: 'Failed to gather project data for sync',
      }
    }

    // If Claims Agent API is configured, send the data
    if (CLAIMS_AGENT_API_URL && CLAIMS_AGENT_API_KEY) {
      const response = await fetch(`${CLAIMS_AGENT_API_URL}/api/claims/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CLAIMS_AGENT_API_KEY}`,
        },
        body: JSON.stringify(syncData),
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('Claims Agent sync failed', { status: response.status, error: errorText })
        return {
          success: false,
          error: `Claims Agent sync failed: ${response.status}`,
        }
      }

      const result = await response.json()

      // Update project with claim_id if returned
      if (result.claim_id) {
        await supabase
          .from('projects')
          .update({ claim_id: result.claim_id })
          .eq('id', projectId)
      }

      return {
        success: true,
        claim_id: result.claim_id,
        claim_number: result.claim_number,
        status: result.status,
      }
    }

    // If Claims Agent API is not configured, return success with note
    logger.info('Claims Agent API not configured, skipping sync', { projectId })
    return {
      success: true,
      error: 'Claims Agent API not configured - data prepared but not sent',
    }
  } catch (error) {
    logger.error('Error syncing project to claims', { projectId, error })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Update project based on claim webhook event
 */
export async function handleClaimWebhook(
  supabase: SupabaseClient,
  claimId: string,
  event: string,
  data: Record<string, unknown>
): Promise<boolean> {
  try {
    // Find project by claim_id
    const { data: project, error: findError } = await supabase
      .from('projects')
      .select('id, pipeline_stage, status')
      .eq('claim_id', claimId)
      .single()

    if (findError || !project) {
      logger.warn('No project found for claim webhook', { claimId })
      return false
    }

    // Handle different event types
    switch (event) {
      case 'status_changed':
        // Map claim status to project updates
        const newStatus = data.new_status as string
        if (newStatus === 'approved') {
          await supabase
            .from('projects')
            .update({
              approved_value: data.amount as number | undefined,
              notes: `Claim approved on ${new Date().toISOString().split('T')[0]}`,
            })
            .eq('id', project.id)
        } else if (newStatus === 'paid') {
          await supabase
            .from('projects')
            .update({
              final_value: data.amount as number | undefined,
            })
            .eq('id', project.id)
        }
        break

      case 'amount_updated':
        // Update financial values based on claim amount changes
        await supabase
          .from('projects')
          .update({
            approved_value: data.amount as number,
          })
          .eq('id', project.id)
        break

      case 'inspection_scheduled':
        // Could create an activity/task for the inspection
        logger.info('Claim inspection scheduled', {
          projectId: project.id,
          date: data.inspection_date,
        })
        break

      default:
        logger.info('Unhandled claim webhook event', { event, claimId })
    }

    return true
  } catch (error) {
    logger.error('Error handling claim webhook', { claimId, event, error })
    return false
  }
}

/**
 * Generate export package for a project
 *
 * Gathers all relevant data for a claim package export.
 */
export async function generateClaimExportPackage(
  supabase: SupabaseClient,
  projectId: string
): Promise<ClaimExportPackage | null> {
  try {
    // Fetch project with all related data
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        estimated_value,
        pipeline_stage,
        storm_event_id,
        start_date,
        created_at,
        contacts:contact_id (
          id,
          first_name,
          last_name,
          email,
          phone,
          address_street,
          address_city,
          address_state,
          address_zip,
          latitude,
          longitude,
          custom_fields
        )
      `)
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      logger.error('Failed to fetch project for export', { projectId, error: projectError })
      return null
    }

    const contact = Array.isArray(project.contacts)
      ? project.contacts[0]
      : project.contacts

    if (!contact) {
      logger.error('Project has no associated contact for export', { projectId })
      return null
    }

    // Fetch photos
    const { data: photos } = await supabase
      .from('photos')
      .select('id, storage_path, caption, damage_type, severity, created_at')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    // Fetch documents
    const { data: documents } = await supabase
      .from('documents')
      .select('id, name, type, storage_path, created_at')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    // Fetch storm causation - either from linked event or by searching nearby events
    let stormCausation = undefined
    const dateOfLoss = project.start_date
    const contactLat = contact.latitude
    const contactLng = contact.longitude

    if (project.storm_event_id) {
      // If explicitly linked to a storm event, fetch it and generate causation
      const { data: stormEvent } = await supabase
        .from('storm_events')
        .select('*')
        .eq('id', project.storm_event_id)
        .single()

      if (stormEvent) {
        const eventData: StormEventData = {
          id: stormEvent.id,
          event_date: stormEvent.event_date,
          event_type: stormEvent.event_type,
          magnitude: stormEvent.magnitude,
          state: stormEvent.state,
          county: stormEvent.county,
          city: stormEvent.city,
          latitude: stormEvent.latitude,
          longitude: stormEvent.longitude,
          path_length: stormEvent.path_length,
          path_width: stormEvent.path_width,
          property_damage: stormEvent.property_damage,
          event_narrative: stormEvent.event_narrative,
          distance_miles: contactLat && contactLng && stormEvent.latitude && stormEvent.longitude
            ? haversineDistance(contactLat, contactLng, stormEvent.latitude, stormEvent.longitude)
            : undefined,
        }

        const narrative = generateCausationNarrative([eventData], {
          city: contact.address_city || undefined,
          state: contact.address_state || undefined,
        })
        const score = calculateEvidenceScore([eventData])

        stormCausation = {
          events: [{
            event_date: eventData.event_date,
            event_type: eventData.event_type,
            magnitude: eventData.magnitude ?? undefined,
            distance_miles: eventData.distance_miles,
          }],
          causation_narrative: narrative,
          evidence_score: score,
        }
      }
    } else if (dateOfLoss && contactLat && contactLng) {
      // No linked storm event, but we have date and location - search for nearby events
      logger.info('Searching for storm events near property', {
        projectId,
        dateOfLoss,
        lat: contactLat,
        lng: contactLng,
      })

      // Calculate date range (7 days before to 1 day after the date of loss)
      const startDate = new Date(dateOfLoss)
      startDate.setDate(startDate.getDate() - 7)
      const endDate = new Date(dateOfLoss)
      endDate.setDate(endDate.getDate() + 1)

      // Query storm events in the date range (state-level filter, then distance filter in app)
      const { data: nearbyEvents, error: eventsError } = await supabase
        .from('storm_events')
        .select('*')
        .gte('event_date', startDate.toISOString().split('T')[0])
        .lte('event_date', endDate.toISOString().split('T')[0])
        .eq('state', contact.address_state || 'TN')
        .order('event_date', { ascending: false })
        .limit(20)

      if (eventsError) {
        logger.warn('Failed to query storm events for causation', { error: eventsError })
      } else if (nearbyEvents && nearbyEvents.length > 0) {
        // Calculate distances and filter to within 25 miles
        const radiusMiles = 25
        const eventsWithDistance: StormEventData[] = nearbyEvents
          .map(event => ({
            id: event.id,
            event_date: event.event_date,
            event_type: event.event_type,
            magnitude: event.magnitude,
            state: event.state,
            county: event.county,
            city: event.city,
            latitude: event.latitude,
            longitude: event.longitude,
            path_length: event.path_length,
            path_width: event.path_width,
            property_damage: event.property_damage,
            event_narrative: event.event_narrative,
            distance_miles: event.latitude && event.longitude
              ? haversineDistance(contactLat, contactLng, event.latitude, event.longitude)
              : undefined,
          }))
          .filter(e => e.distance_miles === undefined || e.distance_miles <= radiusMiles)
          .sort((a, b) => (a.distance_miles ?? 999) - (b.distance_miles ?? 999))

        if (eventsWithDistance.length > 0) {
          const narrative = generateCausationNarrative(eventsWithDistance, {
            city: contact.address_city || undefined,
            state: contact.address_state || undefined,
          })
          const score = calculateEvidenceScore(eventsWithDistance)

          stormCausation = {
            events: eventsWithDistance.map(e => ({
              event_date: e.event_date,
              event_type: e.event_type,
              magnitude: e.magnitude ?? undefined,
              distance_miles: e.distance_miles,
            })),
            causation_narrative: narrative,
            evidence_score: score,
          }

          logger.info('Found storm events for causation', {
            projectId,
            eventCount: eventsWithDistance.length,
            evidenceScore: score,
          })
        }
      }
    }

    // Get storage URLs for photos
    const photosWithUrls = await Promise.all(
      (photos || []).map(async photo => {
        const { data: urlData } = await supabase.storage
          .from('photos')
          .createSignedUrl(photo.storage_path, 3600) // 1 hour expiry

        return {
          id: photo.id,
          url: urlData?.signedUrl || '',
          caption: photo.caption || undefined,
          damage_type: photo.damage_type || undefined,
          severity: photo.severity || undefined,
          taken_at: photo.created_at,
        }
      })
    )

    // Get storage URLs for documents
    const documentsWithUrls = await Promise.all(
      (documents || []).map(async doc => {
        const { data: urlData } = await supabase.storage
          .from('documents')
          .createSignedUrl(doc.storage_path, 3600)

        return {
          id: doc.id,
          name: doc.name,
          type: doc.type,
          url: urlData?.signedUrl || '',
          created_at: doc.created_at,
        }
      })
    )

    const customFields = (contact.custom_fields || {}) as Record<string, unknown>

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description || undefined,
        estimated_value: project.estimated_value || undefined,
        pipeline_stage: project.pipeline_stage,
        created_at: project.created_at,
      },
      contact: {
        id: contact.id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email || undefined,
        phone: contact.phone || undefined,
        address: contact.address_street || undefined,
        city: contact.address_city || undefined,
        state: contact.address_state || undefined,
        zip: contact.address_zip || undefined,
        insurance_carrier: customFields.insurance_carrier as string | undefined,
        policy_number: customFields.policy_number as string | undefined,
      },
      storm_causation: stormCausation,
      photos: photosWithUrls,
      documents: documentsWithUrls,
      exported_at: new Date().toISOString(),
    }
  } catch (error) {
    logger.error('Error generating claim export package', { projectId, error })
    return null
  }
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in miles
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959 // Earth's radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

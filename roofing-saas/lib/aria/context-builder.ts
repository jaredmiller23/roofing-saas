/**
 * ARIA Context Builder
 * Enriches AI context with relevant data from CRM, QuickBooks, etc.
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { ARIAContext } from './types'

/**
 * Build enriched ARIA context from base context
 */
export async function buildARIAContext(
  baseContext: Partial<ARIAContext>
): Promise<ARIAContext> {
  if (!baseContext.tenantId || !baseContext.userId) {
    throw new Error('tenantId and userId are required')
  }

  const supabase = baseContext.supabase || (await createClient())

  const context: ARIAContext = {
    tenantId: baseContext.tenantId,
    userId: baseContext.userId,
    supabase,
    channel: baseContext.channel || 'chat',
    page: baseContext.page,
    entityType: baseContext.entityType,
    entityId: baseContext.entityId,
    sessionId: baseContext.sessionId,
    callSid: baseContext.callSid,
  }

  // Enrich with entity data if available
  if (context.entityType && context.entityId) {
    await enrichEntityData(context)
  }

  // Try to enrich with caller ID if inbound call
  if (context.channel === 'voice_inbound' && context.callSid) {
    await enrichFromCallerId(context)
  }

  return context
}

/**
 * Enrich context with entity data (contact or project)
 */
async function enrichEntityData(context: ARIAContext): Promise<void> {
  try {
    if (context.entityType === 'contact' && context.entityId) {
      const { data: contact } = await context.supabase
        .from('contacts')
        .select(
          'id, first_name, last_name, phone, mobile_phone, email, address_street, address_city, address_state, address_zip, stage, dnc_status'
        )
        .eq('id', context.entityId)
        .eq('tenant_id', context.tenantId)
        .single()

      if (contact) {
        context.contact = {
          id: contact.id,
          first_name: contact.first_name,
          last_name: contact.last_name,
          phone: contact.phone || contact.mobile_phone,
          email: contact.email,
          address_street: contact.address_street,
          address_city: contact.address_city,
          address_state: contact.address_state,
          address_zip: contact.address_zip,
          stage: contact.stage,
          dnc_status: contact.dnc_status,
        }

        // Also fetch their projects
        const { data: projects } = await context.supabase
          .from('projects')
          .select('id, name, status, pipeline_stage, estimated_value, insurance_carrier')
          .eq('contact_id', context.entityId)
          .eq('tenant_id', context.tenantId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(1)

        if (projects && projects.length > 0) {
          context.project = projects[0]
        }
      }
    } else if (context.entityType === 'project' && context.entityId) {
      const { data: project } = await context.supabase
        .from('projects')
        .select(
          '*, contacts(id, first_name, last_name, phone, mobile_phone, email, address_street, address_city, address_state, address_zip, stage, dnc_status)'
        )
        .eq('id', context.entityId)
        .eq('tenant_id', context.tenantId)
        .single()

      if (project) {
        context.project = {
          id: project.id,
          name: project.name,
          status: project.status,
          pipeline_stage: project.pipeline_stage,
          estimated_value: project.estimated_value,
          insurance_carrier: project.insurance_carrier,
        }

        // Extract contact from relationship
        const contact = project.contacts as {
          id: string
          first_name: string
          last_name: string
          phone?: string
          mobile_phone?: string
          email?: string
          address_street?: string
          address_city?: string
          address_state?: string
          address_zip?: string
          stage?: string
          dnc_status?: string
        } | null

        if (contact) {
          context.contact = {
            id: contact.id,
            first_name: contact.first_name,
            last_name: contact.last_name,
            phone: contact.phone || contact.mobile_phone,
            email: contact.email,
            address_street: contact.address_street,
            address_city: contact.address_city,
            address_state: contact.address_state,
            address_zip: contact.address_zip,
            stage: contact.stage,
            dnc_status: contact.dnc_status,
          }
        }
      }
    }
  } catch (error) {
    logger.error('Error enriching entity data:', { error, context })
  }
}

/**
 * Enrich context from caller ID (for inbound calls)
 */
async function enrichFromCallerId(context: ARIAContext): Promise<void> {
  // This will be called when we have phone number from Twilio webhook
  // For now, we can try to find contact by session metadata
  if (context.sessionId) {
    try {
      const { data: session } = await context.supabase
        .from('voice_sessions')
        .select('contact_id, context')
        .eq('session_id', context.sessionId)
        .single()

      if (session?.contact_id) {
        context.entityType = 'contact'
        context.entityId = session.contact_id
        await enrichEntityData(context)
      }
    } catch (error) {
      logger.debug('No session found for caller ID enrichment')
    }
  }
}

/**
 * Try to find contact by phone number
 */
export async function findContactByPhone(
  phone: string,
  context: Pick<ARIAContext, 'tenantId' | 'supabase'>
): Promise<ARIAContext['contact'] | null> {
  // Normalize phone number (remove non-digits)
  const normalizedPhone = phone.replace(/\D/g, '')
  const phoneVariants = [
    normalizedPhone,
    `+1${normalizedPhone}`,
    normalizedPhone.slice(-10), // Last 10 digits
  ]

  try {
    const { data: contacts } = await context.supabase
      .from('contacts')
      .select(
        'id, first_name, last_name, phone, mobile_phone, email, address_street, address_city, address_state, address_zip, stage, dnc_status'
      )
      .eq('tenant_id', context.tenantId)
      .or(
        phoneVariants
          .flatMap((p) => [`phone.ilike.%${p}%`, `mobile_phone.ilike.%${p}%`])
          .join(',')
      )
      .limit(1)

    if (contacts && contacts.length > 0) {
      const contact = contacts[0]
      return {
        id: contact.id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        phone: contact.phone || contact.mobile_phone,
        email: contact.email,
        address_street: contact.address_street,
        address_city: contact.address_city,
        address_state: contact.address_state,
        address_zip: contact.address_zip,
        stage: contact.stage,
        dnc_status: contact.dnc_status,
      }
    }
  } catch (error) {
    logger.error('Error finding contact by phone:', { error, phone })
  }

  return null
}

/**
 * Get context summary for system prompt
 */
export function getContextSummary(context: ARIAContext): string {
  const parts: string[] = []

  if (context.contact) {
    parts.push(
      `Current contact: ${context.contact.first_name} ${context.contact.last_name}` +
        (context.contact.phone ? ` (${context.contact.phone})` : '') +
        (context.contact.stage ? ` - Stage: ${context.contact.stage}` : '')
    )
  }

  if (context.project) {
    parts.push(
      `Current project: ${context.project.name}` +
        (context.project.pipeline_stage ? ` - ${context.project.pipeline_stage}` : '') +
        (context.project.estimated_value
          ? ` - $${context.project.estimated_value.toLocaleString()}`
          : '')
    )
  }

  if (context.page) {
    parts.push(`User is on page: ${context.page}`)
  }

  if (context.channel === 'voice_inbound') {
    parts.push('This is an inbound phone call.')
  } else if (context.channel === 'voice_outbound') {
    parts.push('This is an outbound phone call.')
  }

  return parts.join('\n')
}

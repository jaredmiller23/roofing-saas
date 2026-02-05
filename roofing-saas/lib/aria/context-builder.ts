/**
 * ARIA Context Builder
 * Enriches AI context with relevant data from CRM, QuickBooks, etc.
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { ARIAContext, ARIAActivity, ARIATask, ARIAMessage, SupportedLanguage, ARIACapturedError } from './types'
import { locales } from '@/lib/i18n/config'

// ARIA 2.0: Extended context input with error awareness
interface BuildContextInput extends Partial<ARIAContext> {
  recentErrors?: ARIACapturedError[]
}

/**
 * Build enriched ARIA context from base context
 * ARIA 2.0: Now accepts recentErrors for self-awareness
 */
export async function buildARIAContext(
  baseContext: BuildContextInput
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
    language: baseContext.language,
    page: baseContext.page,
    entityType: baseContext.entityType,
    entityId: baseContext.entityId,
    sessionId: baseContext.sessionId,
    callSid: baseContext.callSid,
    // ARIA 2.0: Error awareness
    recentErrors: baseContext.recentErrors,
  }

  // Enrich with entity data if available
  if (context.entityType && context.entityId) {
    await enrichEntityData(context)
  }

  // Try to enrich with caller ID if inbound call
  if (context.channel === 'voice_inbound' && context.callSid) {
    await enrichFromCallerId(context)
  }

  // Girl Friday Enrichment (Phase 1 - Omniscience)
  // ARIA should know the recent history automatically
  await enrichGirlFridayContext(context)

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
          'id, first_name, last_name, phone, mobile_phone, email, address_street, address_city, address_state, address_zip, stage, dnc_status, preferred_language'
        )
        .eq('id', context.entityId)
        .eq('tenant_id', context.tenantId)
        .eq('is_deleted', false)
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
          preferred_language: contact.preferred_language,
        }

        // Set context language from contact preference if not already set
        if (!context.language && contact.preferred_language && locales.includes(contact.preferred_language as SupportedLanguage)) {
          context.language = contact.preferred_language as SupportedLanguage
        }

        // Also fetch their projects
        const { data: projects } = await context.supabase
          .from('projects')
          .select('id, name, pipeline_stage, estimated_value, insurance_approved')
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
          '*, contacts:contact_id(id, first_name, last_name, phone, mobile_phone, email, address_street, address_city, address_state, address_zip, stage, dnc_status, preferred_language)'
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
          preferred_language?: string
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
            preferred_language: contact.preferred_language,
          }

          // Set context language from contact preference if not already set
          if (!context.language && contact.preferred_language && locales.includes(contact.preferred_language as SupportedLanguage)) {
            context.language = contact.preferred_language as SupportedLanguage
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
    } catch (_error) {
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
        'id, first_name, last_name, phone, mobile_phone, email, address_street, address_city, address_state, address_zip, stage, dnc_status, preferred_language'
      )
      .eq('tenant_id', context.tenantId)
      .eq('is_deleted', false)
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
        preferred_language: contact.preferred_language,
      }
    }
  } catch (error) {
    logger.error('Error finding contact by phone:', { error, phone })
  }

  return null
}

// =============================================================================
// Girl Friday Context Enrichment (Phase 1 - Omniscience)
// =============================================================================

/**
 * Enrich context with Girl Friday data: activities, tasks, message thread
 * This gives ARIA automatic knowledge of the customer situation
 */
async function enrichGirlFridayContext(context: ARIAContext): Promise<void> {
  // Only enrich if we have a contact or project
  if (!context.contact && !context.project) {
    return
  }

  try {
    // Fetch recent activities (last 5)
    const contactId = context.contact?.id
    const projectId = context.project?.id

    if (contactId || projectId) {
      context.recentActivities = await getRecentActivities(context, {
        contactId,
        projectId,
        limit: 5,
      })
    }

    // Fetch upcoming tasks and callbacks
    if (contactId) {
      context.upcomingTasks = await getUpcomingTasks(context, contactId)
    }

    // Fetch message thread for SMS channel
    if (context.channel === 'sms' && context.contact?.phone) {
      context.messageThread = await getRecentMessages(context, context.contact.phone)
    }
  } catch (error) {
    // Don't fail context building on enrichment errors
    logger.error('Error enriching Girl Friday context:', { error })
  }
}

/**
 * Get recent activities for a contact or project
 */
async function getRecentActivities(
  context: ARIAContext,
  options: { contactId?: string; projectId?: string; limit?: number }
): Promise<ARIAActivity[]> {
  const { contactId, projectId, limit = 5 } = options

  let query = context.supabase
    .from('activities')
    .select('id, type, subject, content, direction, created_at')
    .eq('tenant_id', context.tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (contactId) {
    query = query.eq('contact_id', contactId)
  } else if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Error fetching recent activities:', { error })
    return []
  }

  return (data || []).map((activity) => ({
    id: activity.id,
    type: activity.type || 'other',
    subject: activity.subject,
    content: activity.content,
    direction: activity.direction,
    created_at: activity.created_at,
  }))
}

/**
 * Get upcoming tasks and callbacks for a contact
 */
async function getUpcomingTasks(
  context: ARIAContext,
  contactId: string
): Promise<ARIATask[]> {
  // Fetch from tasks table
  const { data: tasks, error: tasksError } = await context.supabase
    .from('tasks')
    .select('id, title, description, due_date, priority, status')
    .eq('tenant_id', context.tenantId)
    .eq('contact_id', contactId)
    .eq('status', 'pending')
    .order('due_date', { ascending: true })
    .limit(5)

  if (tasksError) {
    logger.error('Error fetching tasks:', { error: tasksError })
  }

  // Fetch from callback_requests table
  const { data: callbacks, error: callbacksError } = await context.supabase
    .from('callback_requests')
    .select('id, reason, scheduled_time, status')
    .eq('tenant_id', context.tenantId)
    .eq('contact_id', contactId)
    .in('status', ['pending', 'scheduled'])
    .order('scheduled_time', { ascending: true })
    .limit(3)

  if (callbacksError) {
    logger.error('Error fetching callbacks:', { error: callbacksError })
  }

  const result: ARIATask[] = []

  // Add tasks
  if (tasks) {
    for (const task of tasks) {
      result.push({
        id: task.id,
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        priority: task.priority,
        type: 'task',
        status: task.status,
      })
    }
  }

  // Add callbacks as tasks
  if (callbacks) {
    for (const callback of callbacks) {
      result.push({
        id: callback.id,
        title: `Callback: ${callback.reason || 'No reason specified'}`,
        due_date: callback.scheduled_time,
        type: 'callback',
        status: callback.status === 'scheduled' ? 'pending' : callback.status,
      })
    }
  }

  // Sort by due date
  result.sort((a, b) => {
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })

  return result.slice(0, 5)
}

/**
 * Get recent SMS messages for conversation threading
 */
async function getRecentMessages(
  context: ARIAContext,
  phone: string
): Promise<ARIAMessage[]> {
  // Normalize phone for matching
  const normalizedPhone = phone.replace(/\D/g, '')
  const phoneVariants = [
    normalizedPhone,
    `+1${normalizedPhone}`,
    normalizedPhone.slice(-10),
  ]

  // Fetch SMS activities from activities table (type = 'sms')
  const { data: smsActivities } = await context.supabase
    .from('activities')
    .select('id, direction, content, created_at, to_address, from_address')
    .eq('tenant_id', context.tenantId)
    .eq('type', 'sms')
    .or(
      phoneVariants.map((p) => `to_address.ilike.%${p}%`).join(',') +
        ',' +
        phoneVariants.map((p) => `from_address.ilike.%${p}%`).join(',')
    )
    .order('created_at', { ascending: false })
    .limit(5)

  return (smsActivities || []).map((a) => ({
    id: a.id,
    direction: a.direction || 'outbound',
    body: a.content || '',
    sent_at: a.created_at,
    status: 'delivered',
  }))
}

/**
 * Get context summary for system prompt
 * This is what ARIA "knows" automatically about the current situation
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

  // Girl Friday: Recent Activities (Omniscience)
  if (context.recentActivities && context.recentActivities.length > 0) {
    parts.push('\nRecent activity history:')
    for (const activity of context.recentActivities) {
      const timeAgo = formatTimeAgo(activity.created_at)
      const direction = activity.direction ? ` (${activity.direction})` : ''
      const summary = activity.subject || activity.content?.slice(0, 50) || 'No details'
      parts.push(`- ${timeAgo}: ${activity.type}${direction} - ${summary}`)
    }
  }

  // Girl Friday: Upcoming Tasks (Awareness)
  if (context.upcomingTasks && context.upcomingTasks.length > 0) {
    parts.push('\nUpcoming tasks/callbacks:')
    for (const task of context.upcomingTasks) {
      const dueInfo = task.due_date ? ` (due: ${formatDueDate(task.due_date)})` : ''
      const priority = task.priority ? ` [${task.priority}]` : ''
      parts.push(`- ${task.type === 'callback' ? '📞' : '✓'} ${task.title}${dueInfo}${priority}`)
    }
  }

  // Girl Friday: Message Thread (Conversation Context)
  if (context.messageThread && context.messageThread.length > 0) {
    parts.push('\nRecent messages in this conversation:')
    // Show oldest first for reading order
    const orderedMessages = [...context.messageThread].reverse()
    for (const msg of orderedMessages) {
      const who = msg.direction === 'inbound' ? 'Customer' : 'Us'
      const preview = msg.body.length > 60 ? msg.body.slice(0, 60) + '...' : msg.body
      parts.push(`- ${who}: "${preview}"`)
    }
  }

  if (context.page) {
    parts.push(`\nUser is on page: ${context.page}`)
  }

  if (context.channel === 'voice_inbound') {
    parts.push('This is an inbound phone call.')
  } else if (context.channel === 'voice_outbound') {
    parts.push('This is an outbound phone call.')
  } else if (context.channel === 'sms') {
    parts.push('This is an SMS conversation.')
  }

  // ARIA 2.0: Error Awareness
  // Show recent errors so ARIA knows what went wrong
  if (context.recentErrors && context.recentErrors.length > 0) {
    parts.push('\n⚠️ RECENT ERRORS ENCOUNTERED BY USER:')
    parts.push('The user recently hit these errors in the app. You can help diagnose what went wrong.')
    for (const error of context.recentErrors.slice(0, 5)) {
      const timeAgo = formatTimeAgo(error.timestamp)
      parts.push(`\n- ${timeAgo} on ${error.page}:`)
      parts.push(`  ${error.method} ${error.url} → ${error.statusCode}`)
      parts.push(`  Error: [${error.code}] ${error.message}`)
    }
    parts.push('\nIf the user asks about an error or something not working, reference this context.')
  }

  return parts.join('\n')
}

/**
 * Format a timestamp as relative time (e.g., "2 hours ago", "yesterday")
 */
function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

/**
 * Format a due date for display
 */
function formatDueDate(dueDate: string): string {
  const date = new Date(dueDate)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays < 0) return `overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''}`
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'tomorrow'
  if (diffDays < 7) return `in ${diffDays} days`
  return date.toLocaleDateString()
}

/**
 * ARIA Function Registry
 * Central catalog of all functions ARIA can execute
 */

import type { VoiceFunction } from '@/lib/voice/providers/types'
import type {
  ARIAFunction,
  ARIAFunctionCategory,
  ARIAFunctionRegistry,
} from './types'
import { sendEmail } from '@/lib/resend/email'
import { notifyTeamMember } from './notify'
import { logger } from '@/lib/logger'

/**
 * ARIA Function Registry Implementation
 */
class FunctionRegistry implements ARIAFunctionRegistry {
  functions: Map<string, ARIAFunction> = new Map()

  register(fn: ARIAFunction): void {
    this.functions.set(fn.name, fn)
  }

  get(name: string): ARIAFunction | undefined {
    return this.functions.get(name)
  }

  getByCategory(category: ARIAFunctionCategory): ARIAFunction[] {
    return Array.from(this.functions.values()).filter(
      (fn) => fn.category === category
    )
  }

  getVoiceFunctions(): VoiceFunction[] {
    return Array.from(this.functions.values()).map((fn) => fn.voiceDefinition)
  }

  getEnabledFunctions(integrations: string[]): ARIAFunction[] {
    return Array.from(this.functions.values()).filter((fn) => {
      // Check if required integrations are available
      if (fn.requiredIntegrations && fn.requiredIntegrations.length > 0) {
        return fn.requiredIntegrations.every((req) => integrations.includes(req))
      }
      return fn.enabledByDefault !== false
    })
  }

  /**
   * Get functions filtered by risk level
   */
  getFunctionsByRisk(maxRisk: 'low' | 'medium' | 'high'): ARIAFunction[] {
    const riskLevels = { low: 1, medium: 2, high: 3 }
    const maxLevel = riskLevels[maxRisk]

    return Array.from(this.functions.values()).filter(
      (fn) => riskLevels[fn.riskLevel] <= maxLevel
    )
  }

  /**
   * Get OpenAI Chat Completion tool format
   */
  getChatCompletionTools() {
    return Array.from(this.functions.values()).map((fn) => ({
      type: 'function' as const,
      function: {
        name: fn.voiceDefinition.name,
        description: fn.voiceDefinition.description,
        parameters: fn.voiceDefinition.parameters,
      },
    }))
  }
}

// Singleton instance
export const ariaFunctionRegistry = new FunctionRegistry()

// =============================================================================
// CRM Functions (from existing AI messages route)
// =============================================================================

ariaFunctionRegistry.register({
  name: 'search_contacts',
  category: 'crm',
  description: 'Search for contacts in the CRM by name, phone, email, or address',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'search_contacts',
    description: 'Search for contacts in the CRM by name, phone, email, or address',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query (name, phone, email, or address)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 10)',
        },
      },
      required: ['query'],
    },
  },
  execute: async (args, context) => {
    const { query, limit = 10 } = args as { query: string; limit?: number }

    const { data, error } = await context.supabase
      .from('contacts')
      .select(
        'id, first_name, last_name, email, phone, mobile_phone, address_street, address_city, address_state, address_zip, source, stage'
      )
      .eq('tenant_id', context.tenantId)
      .eq('is_deleted', false)
      .or(
        `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,mobile_phone.ilike.%${query}%,address_street.ilike.%${query}%,address_city.ilike.%${query}%`
      )
      .limit(limit)

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      data: data || [],
      message: data?.length
        ? `Found ${data.length} contact(s)`
        : 'No contacts found',
    }
  },
})

ariaFunctionRegistry.register({
  name: 'get_contact_details',
  category: 'crm',
  description: 'Get detailed information about a specific contact by ID or name',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_contact_details',
    description: 'Get detailed information about a specific contact by ID or name',
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'UUID of the contact',
        },
        name: {
          type: 'string',
          description: 'Name to search for if contact_id not provided',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { contact_id, name } = args as { contact_id?: string; name?: string }

    let query = context.supabase
      .from('contacts')
      .select('*, projects(*)')
      .eq('tenant_id', context.tenantId)
      .eq('is_deleted', false)

    if (contact_id) {
      query = query.eq('id', contact_id)
    } else if (name) {
      query = query.or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`)
    } else {
      return { success: false, error: 'Provide contact_id or name' }
    }

    const { data, error } = await query.single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  },
})

ariaFunctionRegistry.register({
  name: 'create_contact',
  category: 'crm',
  description: 'Create a new contact in the CRM',
  riskLevel: 'medium',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'create_contact',
    description: 'Create a new contact in the CRM',
    parameters: {
      type: 'object',
      properties: {
        first_name: { type: 'string', description: 'First name of the contact' },
        last_name: { type: 'string', description: 'Last name of the contact' },
        email: { type: 'string', description: 'Email address' },
        phone: { type: 'string', description: 'Phone number' },
        mobile_phone: { type: 'string', description: 'Mobile phone number' },
        address_street: { type: 'string', description: 'Street address' },
        address_city: { type: 'string', description: 'City' },
        address_state: { type: 'string', description: 'State' },
        address_zip: { type: 'string', description: 'ZIP code' },
        source: { type: 'string', description: 'Lead source (e.g., phone_call, referral)' },
      },
      required: ['first_name', 'last_name'],
    },
  },
  execute: async (args, context) => {
    const { data, error } = await context.supabase
      .from('contacts')
      .insert({
        tenant_id: context.tenantId,
        created_by: context.userId,
        ...args,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      data,
      message: `Created contact: ${args.first_name} ${args.last_name}`,
    }
  },
})

// =============================================================================
// Contact Management Functions (Girl Friday Phase 1 - Omnicompetence)
// =============================================================================

ariaFunctionRegistry.register({
  name: 'update_contact',
  category: 'crm',
  description: 'Update an existing contact\'s information',
  riskLevel: 'medium',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'update_contact',
    description: 'Update an existing contact\'s information. Can update name, phone, email, address, or other fields.',
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'UUID of the contact to update (required)',
        },
        first_name: { type: 'string', description: 'New first name' },
        last_name: { type: 'string', description: 'New last name' },
        email: { type: 'string', description: 'New email address' },
        phone: { type: 'string', description: 'New phone number' },
        mobile_phone: { type: 'string', description: 'New mobile phone number' },
        address_street: { type: 'string', description: 'New street address' },
        address_city: { type: 'string', description: 'New city' },
        address_state: { type: 'string', description: 'New state' },
        address_zip: { type: 'string', description: 'New ZIP code' },
        source: { type: 'string', description: 'Update lead source' },
        stage: { type: 'string', description: 'Update pipeline stage' },
      },
      required: ['contact_id'],
    },
  },
  execute: async (args, context) => {
    const { contact_id, ...updates } = args as {
      contact_id: string
      first_name?: string
      last_name?: string
      email?: string
      phone?: string
      mobile_phone?: string
      address_street?: string
      address_city?: string
      address_state?: string
      address_zip?: string
      source?: string
      stage?: string
    }

    // Filter out undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    )

    if (Object.keys(cleanUpdates).length === 0) {
      return { success: false, error: 'No fields to update provided' }
    }

    // Verify contact exists and belongs to tenant
    const { data: existingContact, error: findError } = await context.supabase
      .from('contacts')
      .select('id, first_name, last_name')
      .eq('id', contact_id)
      .eq('tenant_id', context.tenantId)
      .eq('is_deleted', false)
      .single()

    if (findError || !existingContact) {
      return { success: false, error: 'Contact not found' }
    }

    // Update the contact
    const { data, error } = await context.supabase
      .from('contacts')
      .update({
        ...cleanUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contact_id)
      .eq('tenant_id', context.tenantId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Log the update as an activity
    await context.supabase.from('activities').insert({
      tenant_id: context.tenantId,
      contact_id: contact_id,
      type: 'note',
      subject: 'Contact Updated',
      content: `Contact information updated by ARIA. Fields changed: ${Object.keys(cleanUpdates).join(', ')}`,
      created_by: context.userId,
      metadata: { updated_fields: Object.keys(cleanUpdates), via: 'aria' },
    })

    return {
      success: true,
      data,
      message: `Updated contact: ${data.first_name} ${data.last_name}`,
    }
  },
})

ariaFunctionRegistry.register({
  name: 'delete_contact',
  category: 'crm',
  description: 'Soft delete a contact (can be recovered later)',
  riskLevel: 'medium',
  requiresConfirmation: true,
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'delete_contact',
    description: 'Soft delete a contact. The contact can be recovered later if needed. Use this to remove duplicates or contacts that should no longer be in the system.',
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'UUID of the contact to delete (required)',
        },
        reason: {
          type: 'string',
          description: 'Reason for deleting the contact (e.g., "duplicate", "requested removal", "wrong number")',
        },
      },
      required: ['contact_id'],
    },
  },
  execute: async (args, context) => {
    const { contact_id, reason = 'No reason provided' } = args as {
      contact_id: string
      reason?: string
    }

    // Verify contact exists and belongs to tenant
    const { data: existingContact, error: findError } = await context.supabase
      .from('contacts')
      .select('id, first_name, last_name, email, phone')
      .eq('id', contact_id)
      .eq('tenant_id', context.tenantId)
      .eq('is_deleted', false)
      .single()

    if (findError || !existingContact) {
      return { success: false, error: 'Contact not found' }
    }

    // Soft delete the contact
    const { error } = await context.supabase
      .from('contacts')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contact_id)
      .eq('tenant_id', context.tenantId)

    if (error) {
      return { success: false, error: error.message }
    }

    // Log the deletion as an activity
    await context.supabase.from('activities').insert({
      tenant_id: context.tenantId,
      contact_id: contact_id,
      type: 'note',
      subject: 'Contact Deleted',
      content: `Contact soft-deleted by ARIA. Reason: ${reason}`,
      created_by: context.userId,
      metadata: {
        deleted_contact: {
          name: `${existingContact.first_name} ${existingContact.last_name}`,
          email: existingContact.email,
          phone: existingContact.phone,
        },
        reason,
        via: 'aria',
      },
    })

    return {
      success: true,
      message: `Deleted contact: ${existingContact.first_name} ${existingContact.last_name}. Reason: ${reason}`,
    }
  },
})

ariaFunctionRegistry.register({
  name: 'create_project',
  category: 'crm',
  description: 'Create a new project/job for a contact. Projects appear on the pipeline board.',
  riskLevel: 'medium',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'create_project',
    description: 'Create a new project/job for a contact. Projects appear on the pipeline board. Every project must be linked to a contact.',
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'UUID of the contact to create the project for (required). Use search_contacts first if you need to find the contact.',
        },
        name: {
          type: 'string',
          description: 'Project name (e.g., "Smith - Roof Replacement")',
        },
        pipeline_stage: {
          type: 'string',
          enum: ['prospect', 'qualified', 'quote_sent', 'negotiation', 'won', 'lost'],
          description: 'Initial pipeline stage (default: prospect)',
        },
        type: {
          type: 'string',
          enum: ['roofing', 'siding', 'gutters', 'windows', 'other'],
          description: 'Type of project (default: roofing)',
        },
        priority: {
          type: 'string',
          enum: ['low', 'normal', 'high', 'urgent'],
          description: 'Project priority (default: normal)',
        },
        estimated_value: {
          type: 'number',
          description: 'Estimated project value in dollars',
        },
        lead_source: {
          type: 'string',
          description: 'How did this lead come in? (e.g., referral, door_knock, phone_call, website)',
        },
        description: {
          type: 'string',
          description: 'Notes or description for the project',
        },
      },
      required: ['contact_id'],
    },
  },
  execute: async (args, context) => {
    const {
      contact_id,
      name,
      pipeline_stage = 'prospect',
      type = 'roofing',
      priority = 'normal',
      estimated_value,
      lead_source = 'aria',
      description,
    } = args as {
      contact_id: string
      name?: string
      pipeline_stage?: string
      type?: string
      priority?: string
      estimated_value?: number
      lead_source?: string
      description?: string
    }

    // Use contact from context if not provided
    const finalContactId = contact_id || context.contact?.id

    if (!finalContactId) {
      return {
        success: false,
        error: 'A contact_id is required to create a project. Use search_contacts first to find the contact.',
      }
    }

    // Fetch contact name for default project name
    let projectName = name
    if (!projectName) {
      const { data: contactData } = await context.supabase
        .from('contacts')
        .select('first_name, last_name')
        .eq('id', finalContactId)
        .single()

      if (contactData) {
        const contactFullName = `${contactData.first_name} ${contactData.last_name}`.trim()
        projectName = `${contactFullName} - Roofing Project`
      } else {
        projectName = 'New Project'
      }
    }

    const { data, error } = await context.supabase
      .from('projects')
      .insert({
        tenant_id: context.tenantId,
        contact_id: finalContactId,
        name: projectName,
        pipeline_stage,
        type,
        priority,
        estimated_value: estimated_value || null,
        lead_source,
        description: description || null,
        created_by: context.userId,
        status: 'active',
      })
      .select(`
        id,
        name,
        pipeline_stage,
        type,
        priority,
        estimated_value,
        contact:contact_id (
          first_name,
          last_name
        )
      `)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Supabase returns joined data as array, get first element
    const contactData = Array.isArray(data.contact) ? data.contact[0] : data.contact
    const contactName = contactData
      ? `${contactData.first_name} ${contactData.last_name}`.trim()
      : 'Unknown'

    return {
      success: true,
      data,
      message: `Created project "${data.name}" for ${contactName}. It's now in the ${pipeline_stage} stage on the pipeline board.`,
    }
  },
})

ariaFunctionRegistry.register({
  name: 'add_note',
  category: 'crm',
  description: 'Add a note or activity to a contact or project',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'add_note',
    description: 'Add a note or activity to a contact or project',
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'UUID of the contact (optional if project_id provided)',
        },
        project_id: {
          type: 'string',
          description: 'UUID of the project (optional if contact_id provided)',
        },
        content: { type: 'string', description: 'The note content' },
        type: {
          type: 'string',
          enum: ['note', 'call', 'email', 'meeting', 'task'],
          description: 'Type of activity',
        },
      },
      required: ['content'],
    },
  },
  execute: async (args, context) => {
    const { contact_id, project_id, content, type = 'note' } = args as {
      contact_id?: string
      project_id?: string
      content: string
      type?: string
    }

    // Use context entity if no explicit ID provided
    const finalContactId = contact_id || (context.entityType === 'contact' ? context.entityId : undefined)
    const finalProjectId = project_id || (context.entityType === 'project' ? context.entityId : undefined)

    if (!finalContactId && !finalProjectId) {
      return { success: false, error: 'Provide contact_id or project_id' }
    }

    const { error } = await context.supabase.from('activities').insert({
      tenant_id: context.tenantId,
      contact_id: finalContactId,
      project_id: finalProjectId,
      type,
      subject: type === 'note' ? 'Note' : type.charAt(0).toUpperCase() + type.slice(1),
      content,
      created_by: context.userId,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, message: 'Note added successfully' }
  },
})

// =============================================================================
// Activity History Functions (Girl Friday Phase 1 - Omniscience)
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_activities',
  category: 'crm',
  description: 'Get activity history for a contact or project. Shows calls, emails, SMS, notes, tasks, and meetings.',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_activities',
    description: 'Get activity history for a contact or project. Shows calls, emails, SMS, notes, tasks, and meetings. Use this to understand what has happened with a customer.',
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'UUID of the contact to get activities for',
        },
        project_id: {
          type: 'string',
          description: 'UUID of the project to get activities for',
        },
        types: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by activity types: call, sms, email, note, task, meeting, knock',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of activities to return (default: 10, max: 50)',
        },
        include_content: {
          type: 'boolean',
          description: 'Include full content of activities (default: true)',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const {
      contact_id,
      project_id,
      types,
      limit = 10,
      include_content = true,
    } = args as {
      contact_id?: string
      project_id?: string
      types?: string[]
      limit?: number
      include_content?: boolean
    }

    // Use context entity if no explicit ID provided
    const finalContactId = contact_id || (context.entityType === 'contact' ? context.entityId : undefined)
    const finalProjectId = project_id || (context.entityType === 'project' ? context.entityId : undefined)

    if (!finalContactId && !finalProjectId) {
      return { success: false, error: 'Provide contact_id or project_id, or call in context of a contact/project' }
    }

    // Query activities
    let query = context.supabase
      .from('activities')
      .select('id, type, subject, content, direction, created_at, metadata')
      .eq('tenant_id', context.tenantId)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 50))

    // Apply contact/project filters
    if (finalContactId) {
      query = query.eq('contact_id', finalContactId)
    }
    if (finalProjectId) {
      query = query.eq('project_id', finalProjectId)
    }

    // Apply type filter
    if (types && types.length > 0) {
      query = query.in('type', types)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    // Format activities for readability
    const formattedActivities = (data || []).map((activity) => ({
      id: activity.id,
      type: activity.type,
      subject: activity.subject,
      content: include_content ? activity.content : undefined,
      direction: activity.direction,
      when: activity.created_at,
      metadata: include_content ? activity.metadata : undefined,
    }))

    // Generate summary
    const activityTypes = [...new Set(formattedActivities.map((a) => a.type))]
    const summary = formattedActivities.length > 0
      ? `Found ${formattedActivities.length} activities (${activityTypes.join(', ')})`
      : 'No activities found'

    return {
      success: true,
      data: formattedActivities,
      count: formattedActivities.length,
      message: summary,
    }
  },
})

ariaFunctionRegistry.register({
  name: 'search_activities',
  category: 'crm',
  description: 'Search activities across all contacts by content, type, or date range',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'search_activities',
    description: 'Search activities across all contacts by content, type, or date range. Useful for finding specific conversations or events.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search text to find in activity content or subject',
        },
        type: {
          type: 'string',
          enum: ['call', 'sms', 'email', 'note', 'task', 'meeting', 'knock'],
          description: 'Filter by activity type',
        },
        date_from: {
          type: 'string',
          description: 'Start date in ISO format (e.g., 2026-01-01)',
        },
        date_to: {
          type: 'string',
          description: 'End date in ISO format (e.g., 2026-01-31)',
        },
        limit: {
          type: 'number',
          description: 'Maximum results (default: 10, max: 25)',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const {
      query,
      type,
      date_from,
      date_to,
      limit = 10,
    } = args as {
      query?: string
      type?: string
      date_from?: string
      date_to?: string
      limit?: number
    }

    // Need at least one filter
    if (!query && !type && !date_from) {
      return { success: false, error: 'Provide at least one filter: query, type, or date_from' }
    }

    let dbQuery = context.supabase
      .from('activities')
      .select('id, type, subject, content, direction, created_at, metadata, contact_id')
      .eq('tenant_id', context.tenantId)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 25))

    // Text search on content and subject
    if (query) {
      dbQuery = dbQuery.or(`content.ilike.%${query}%,subject.ilike.%${query}%`)
    }

    // Type filter
    if (type) {
      dbQuery = dbQuery.eq('type', type)
    }

    // Date range
    if (date_from) {
      dbQuery = dbQuery.gte('created_at', date_from)
    }
    if (date_to) {
      dbQuery = dbQuery.lte('created_at', date_to)
    }

    const { data, error } = await dbQuery

    if (error) {
      return { success: false, error: error.message }
    }

    // Get unique contact IDs to fetch contact info
    const contactIds = [...new Set((data || []).map((a) => a.contact_id).filter(Boolean))]
    let contactsMap: Record<string, { id: string; first_name: string; last_name: string; phone: string; email: string }> = {}

    if (contactIds.length > 0) {
      const { data: contacts } = await context.supabase
        .from('contacts')
        .select('id, first_name, last_name, phone, email')
        .in('id', contactIds)
        .eq('tenant_id', context.tenantId)

      contactsMap = (contacts || []).reduce((acc, c) => {
        acc[c.id] = c
        return acc
      }, {} as typeof contactsMap)
    }

    // Format results with contact info
    const results = (data || []).map((activity) => {
      const contact = activity.contact_id ? contactsMap[activity.contact_id] : null
      const contentStr = activity.content || ''
      return {
        id: activity.id,
        type: activity.type,
        subject: activity.subject,
        content: contentStr.substring(0, 200) + (contentStr.length > 200 ? '...' : ''),
        direction: activity.direction,
        when: activity.created_at,
        contact: contact ? {
          id: contact.id,
          name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
          phone: contact.phone,
          email: contact.email,
        } : null,
      }
    })

    return {
      success: true,
      data: results,
      count: results.length,
      message: results.length > 0
        ? `Found ${results.length} matching activities`
        : 'No activities found matching your criteria',
    }
  },
})

ariaFunctionRegistry.register({
  name: 'get_pipeline_stats',
  category: 'crm',
  description: 'Get current pipeline statistics and deal counts by stage',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_pipeline_stats',
    description: 'Get current pipeline statistics and deal counts by stage',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  execute: async (args, context) => {
    const { data, error } = await context.supabase
      .from('projects')
      .select('pipeline_stage, estimated_value')
      .eq('tenant_id', context.tenantId)
      .eq('is_deleted', false)

    if (error) {
      return { success: false, error: error.message }
    }

    // Aggregate by stage
    const stats = (data || []).reduce(
      (acc, project) => {
        const stage = project.pipeline_stage || 'unknown'
        if (!acc[stage]) {
          acc[stage] = { count: 0, value: 0 }
        }
        acc[stage].count++
        acc[stage].value += project.estimated_value || 0
        return acc
      },
      {} as Record<string, { count: number; value: number }>
    )

    const totalDeals = data?.length || 0
    const totalValue = data?.reduce((sum, p) => sum + (p.estimated_value || 0), 0) || 0

    return {
      success: true,
      data: {
        byStage: stats,
        totalDeals,
        totalValue,
      },
      message: `Pipeline has ${totalDeals} deals worth $${totalValue.toLocaleString()}`,
    }
  },
})

ariaFunctionRegistry.register({
  name: 'search_projects',
  category: 'crm',
  description: 'Search for projects/jobs by name, address, or contact name',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'search_projects',
    description: 'Search for projects/jobs by name, address, or contact name',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (project name, address, or contact name)',
        },
        limit: {
          type: 'number',
          description: 'Maximum results (default: 10)',
        },
      },
      required: ['query'],
    },
  },
  execute: async (args, context) => {
    const { query, limit = 10 } = args as { query: string; limit?: number }

    const { data, error } = await context.supabase
      .from('projects')
      .select('*, contacts:contact_id(first_name, last_name)')
      .eq('tenant_id', context.tenantId)
      .eq('is_deleted', false)
      .or(`name.ilike.%${query}%,property_address.ilike.%${query}%`)
      .limit(limit)

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      data: data || [],
      message: data?.length
        ? `Found ${data.length} project(s)`
        : 'No projects found',
    }
  },
})

// =============================================================================
// Project Management Functions
// =============================================================================

ariaFunctionRegistry.register({
  name: 'update_project_stage',
  category: 'crm',
  description: 'Move a project to a different pipeline stage',
  riskLevel: 'medium',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'update_project_stage',
    description: 'Move a project to a different pipeline stage (e.g., from Prospect to Qualified, or to Quote Sent)',
    parameters: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'UUID of the project to update. Use search_projects first if you need to find it.',
        },
        new_stage: {
          type: 'string',
          enum: ['prospect', 'qualified', 'quote_sent', 'negotiation', 'won', 'lost'],
          description: 'The new pipeline stage to move the project to',
        },
      },
      required: ['project_id', 'new_stage'],
    },
  },
  execute: async (args, context) => {
    const { project_id, new_stage } = args as { project_id: string; new_stage: string }

    // Use context project if not provided
    const finalProjectId = project_id || context.project?.id

    if (!finalProjectId) {
      return {
        success: false,
        error: 'A project_id is required. Use search_projects first to find the project.',
      }
    }

    const { data, error } = await context.supabase
      .from('projects')
      .update({
        pipeline_stage: new_stage,
        stage_changed_at: new Date().toISOString(),
      })
      .eq('id', finalProjectId)
      .eq('tenant_id', context.tenantId)
      .select('id, name, pipeline_stage')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Log the stage change as an activity
    await context.supabase.from('activities').insert({
      tenant_id: context.tenantId,
      project_id: finalProjectId,
      type: 'note',
      subject: 'Stage Changed',
      content: `Pipeline stage changed to ${new_stage}`,
      created_by: context.userId,
      metadata: { via: 'aria', previous_stage: context.project?.pipeline_stage },
    })

    return {
      success: true,
      data,
      message: `Moved "${data.name}" to ${new_stage} stage.`,
    }
  },
})

ariaFunctionRegistry.register({
  name: 'get_project_details',
  category: 'crm',
  description: 'Get detailed information about a specific project',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_project_details',
    description: 'Get detailed information about a specific project including contact info, status, value, and recent activities',
    parameters: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'UUID of the project',
        },
        name: {
          type: 'string',
          description: 'Project name to search for if project_id not provided',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { project_id, name } = args as { project_id?: string; name?: string }

    // Use context project if available
    const finalProjectId = project_id || context.project?.id

    let query = context.supabase
      .from('projects')
      .select(`
        *,
        contact:contact_id (
          id, first_name, last_name, email, phone, mobile_phone,
          address_street, address_city, address_state, address_zip
        ),
        activities (
          id, type, description, created_at
        )
      `)
      .eq('tenant_id', context.tenantId)
      .eq('is_deleted', false)

    if (finalProjectId) {
      query = query.eq('id', finalProjectId)
    } else if (name) {
      query = query.ilike('name', `%${name}%`)
    } else {
      return { success: false, error: 'Provide project_id or name to search' }
    }

    const { data, error } = await query.limit(1).single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Format a summary
    const contactInfo = Array.isArray(data.contact) ? data.contact[0] : data.contact
    const contactName = contactInfo
      ? `${contactInfo.first_name} ${contactInfo.last_name}`.trim()
      : 'No contact'

    const summary = [
      `Project: ${data.name}`,
      `Contact: ${contactName}`,
      `Stage: ${data.pipeline_stage || 'Not set'}`,
      `Status: ${data.status || 'active'}`,
      data.estimated_value ? `Estimated Value: $${data.estimated_value.toLocaleString()}` : null,
      data.priority ? `Priority: ${data.priority}` : null,
    ].filter(Boolean).join('\n')

    return {
      success: true,
      data,
      message: summary,
    }
  },
})

ariaFunctionRegistry.register({
  name: 'mark_project_won',
  category: 'crm',
  description: 'Mark a project as won (deal closed successfully)',
  riskLevel: 'medium',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'mark_project_won',
    description: 'Mark a project as won - the deal was closed successfully',
    parameters: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'UUID of the project to mark as won',
        },
        final_value: {
          type: 'number',
          description: 'Final contract value in dollars (optional)',
        },
        notes: {
          type: 'string',
          description: 'Any notes about the win',
        },
      },
      required: ['project_id'],
    },
  },
  execute: async (args, context) => {
    const { project_id, final_value, notes } = args as {
      project_id: string
      final_value?: number
      notes?: string
    }

    const finalProjectId = project_id || context.project?.id

    if (!finalProjectId) {
      return { success: false, error: 'A project_id is required.' }
    }

    const updateData: Record<string, unknown> = {
      pipeline_stage: 'won',
      status: 'won',
      stage_changed_at: new Date().toISOString(),
    }

    if (final_value) {
      updateData.final_value = final_value
    }

    const { data, error } = await context.supabase
      .from('projects')
      .update(updateData)
      .eq('id', finalProjectId)
      .eq('tenant_id', context.tenantId)
      .select('id, name, final_value, estimated_value')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Log the win
    await context.supabase.from('activities').insert({
      tenant_id: context.tenantId,
      project_id: finalProjectId,
      type: 'note',
      subject: 'Project Won',
      content: notes ? `Project WON! ${notes}` : 'Project marked as WON!',
      created_by: context.userId,
      metadata: { via: 'aria', event: 'project_won', final_value },
    })

    const value = data.final_value || data.estimated_value
    const valueStr = value ? ` worth $${value.toLocaleString()}` : ''

    return {
      success: true,
      data,
      message: `Congratulations! "${data.name}"${valueStr} has been marked as WON!`,
    }
  },
})

ariaFunctionRegistry.register({
  name: 'mark_project_lost',
  category: 'crm',
  description: 'Mark a project as lost (deal did not close)',
  riskLevel: 'medium',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'mark_project_lost',
    description: 'Mark a project as lost - the deal did not close',
    parameters: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'UUID of the project to mark as lost',
        },
        reason: {
          type: 'string',
          description: 'Why was the deal lost? (e.g., "went with competitor", "price too high", "decided not to proceed")',
        },
      },
      required: ['project_id'],
    },
  },
  execute: async (args, context) => {
    const { project_id, reason } = args as { project_id: string; reason?: string }

    const finalProjectId = project_id || context.project?.id

    if (!finalProjectId) {
      return { success: false, error: 'A project_id is required.' }
    }

    const { data, error } = await context.supabase
      .from('projects')
      .update({
        pipeline_stage: 'lost',
        status: 'lost',
        stage_changed_at: new Date().toISOString(),
      })
      .eq('id', finalProjectId)
      .eq('tenant_id', context.tenantId)
      .select('id, name')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Log the loss with reason
    await context.supabase.from('activities').insert({
      tenant_id: context.tenantId,
      project_id: finalProjectId,
      type: 'note',
      subject: 'Project Lost',
      content: reason ? `Project LOST: ${reason}` : 'Project marked as LOST',
      created_by: context.userId,
      metadata: { via: 'aria', event: 'project_lost', loss_reason: reason },
    })

    return {
      success: true,
      data,
      message: `"${data.name}" has been marked as lost.${reason ? ` Reason: ${reason}` : ''}`,
    }
  },
})

ariaFunctionRegistry.register({
  name: 'update_project',
  category: 'crm',
  description: 'Update project details like value, description, priority, or custom fields',
  riskLevel: 'medium',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'update_project',
    description: 'Update project details such as estimated value, description, priority, or other fields',
    parameters: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'UUID of the project to update',
        },
        name: {
          type: 'string',
          description: 'Updated project name',
        },
        estimated_value: {
          type: 'number',
          description: 'Updated estimated value in dollars',
        },
        priority: {
          type: 'string',
          enum: ['low', 'normal', 'high', 'urgent'],
          description: 'Updated priority level',
        },
        description: {
          type: 'string',
          description: 'Updated project description or notes',
        },
        type: {
          type: 'string',
          enum: ['roofing', 'siding', 'gutters', 'windows', 'other'],
          description: 'Updated project type',
        },
      },
      required: ['project_id'],
    },
  },
  execute: async (args, context) => {
    const { project_id, ...updates } = args as { project_id: string; [key: string]: unknown }

    const finalProjectId = project_id || context.project?.id

    if (!finalProjectId) {
      return { success: false, error: 'A project_id is required.' }
    }

    // Filter out undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined && v !== null)
    )

    if (Object.keys(cleanUpdates).length === 0) {
      return { success: false, error: 'No fields provided to update.' }
    }

    const { data, error } = await context.supabase
      .from('projects')
      .update(cleanUpdates)
      .eq('id', finalProjectId)
      .eq('tenant_id', context.tenantId)
      .select('id, name, estimated_value, priority, status')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    const updatedFields = Object.keys(cleanUpdates).join(', ')

    return {
      success: true,
      data,
      message: `Updated "${data.name}" - changed: ${updatedFields}.`,
    }
  },
})

ariaFunctionRegistry.register({
  name: 'reactivate_project',
  category: 'crm',
  description: 'Reactivate a lost project (bring it back into the pipeline)',
  riskLevel: 'medium',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'reactivate_project',
    description: 'Reactivate a project that was marked as lost - bring it back into the active pipeline',
    parameters: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'UUID of the project to reactivate',
        },
        new_stage: {
          type: 'string',
          enum: ['prospect', 'qualified', 'quote_sent', 'negotiation'],
          description: 'Which pipeline stage to move it to (default: prospect)',
        },
        reason: {
          type: 'string',
          description: 'Why is this project being reactivated?',
        },
      },
      required: ['project_id'],
    },
  },
  execute: async (args, context) => {
    const { project_id, new_stage = 'prospect', reason } = args as {
      project_id: string
      new_stage?: string
      reason?: string
    }

    const finalProjectId = project_id || context.project?.id

    if (!finalProjectId) {
      return { success: false, error: 'A project_id is required.' }
    }

    const { data, error } = await context.supabase
      .from('projects')
      .update({
        pipeline_stage: new_stage,
        status: 'active',
        stage_changed_at: new Date().toISOString(),
      })
      .eq('id', finalProjectId)
      .eq('tenant_id', context.tenantId)
      .select('id, name, pipeline_stage')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Log the reactivation
    await context.supabase.from('activities').insert({
      tenant_id: context.tenantId,
      project_id: finalProjectId,
      type: 'note',
      subject: 'Project Reactivated',
      content: reason
        ? `Project REACTIVATED: ${reason}`
        : `Project reactivated - moved to ${new_stage}`,
      created_by: context.userId,
      metadata: { via: 'aria', event: 'project_reactivated', new_stage },
    })

    return {
      success: true,
      data,
      message: `"${data.name}" has been reactivated and moved to ${new_stage} stage.`,
    }
  },
})

// =============================================================================
// Reporting & Analytics Functions
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_sales_summary',
  category: 'reporting',
  description: 'Get a summary of sales performance - revenue, close rate, pipeline value',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_sales_summary',
    description: 'Get a summary of sales performance including closed deals, revenue, close rate, and pipeline value. Can filter by time period.',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['today', 'this_week', 'this_month', 'this_quarter', 'this_year', 'all_time'],
          description: 'Time period for the report (default: this_month)',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { period = 'this_month' } = args as { period?: string }

    // Calculate date range
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0))
        break
      case 'this_week':
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - startDate.getDay())
        startDate.setHours(0, 0, 0, 0)
        break
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'this_quarter':
        const quarter = Math.floor(now.getMonth() / 3)
        startDate = new Date(now.getFullYear(), quarter * 3, 1)
        break
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(0) // all time
    }

    // Get won deals in period
    const { data: wonDeals, error: wonError } = await context.supabase
      .from('projects')
      .select('id, name, final_value, estimated_value, stage_changed_at')
      .eq('tenant_id', context.tenantId)
      .eq('pipeline_stage', 'won')
      .gte('stage_changed_at', startDate.toISOString())

    if (wonError) {
      return { success: false, error: wonError.message }
    }

    // Get lost deals in period (for close rate calculation)
    const { data: lostDeals, error: lostError } = await context.supabase
      .from('projects')
      .select('id')
      .eq('tenant_id', context.tenantId)
      .eq('pipeline_stage', 'lost')
      .gte('stage_changed_at', startDate.toISOString())

    if (lostError) {
      return { success: false, error: lostError.message }
    }

    // Get active pipeline value
    const { data: activeDeals, error: activeError } = await context.supabase
      .from('projects')
      .select('id, estimated_value, pipeline_stage')
      .eq('tenant_id', context.tenantId)
      .eq('is_deleted', false)
      .not('pipeline_stage', 'in', '(won,lost)')

    if (activeError) {
      return { success: false, error: activeError.message }
    }

    // Calculate metrics
    const wonCount = wonDeals?.length || 0
    const lostCount = lostDeals?.length || 0
    const totalDecisions = wonCount + lostCount
    const closeRate = totalDecisions > 0 ? Math.round((wonCount / totalDecisions) * 100) : 0

    const revenue = wonDeals?.reduce((sum, d) => sum + (d.final_value || d.estimated_value || 0), 0) || 0
    const pipelineValue = activeDeals?.reduce((sum, d) => sum + (d.estimated_value || 0), 0) || 0
    const activeCount = activeDeals?.length || 0

    // Pipeline breakdown
    const stageBreakdown: Record<string, number> = {}
    activeDeals?.forEach((d) => {
      const stage = d.pipeline_stage || 'unknown'
      stageBreakdown[stage] = (stageBreakdown[stage] || 0) + 1
    })

    const periodLabel = period.replace('_', ' ')
    const message = [
      `📊 Sales Summary (${periodLabel}):`,
      ``,
      `💰 Revenue: $${revenue.toLocaleString()} (${wonCount} deals won)`,
      `📈 Close Rate: ${closeRate}%`,
      `📋 Active Pipeline: $${pipelineValue.toLocaleString()} (${activeCount} deals)`,
      ``,
      `Stage breakdown: ${Object.entries(stageBreakdown).map(([s, c]) => `${s}: ${c}`).join(', ')}`,
    ].join('\n')

    return {
      success: true,
      data: {
        period,
        revenue,
        wonCount,
        lostCount,
        closeRate,
        pipelineValue,
        activeCount,
        stageBreakdown,
      },
      message,
    }
  },
})

ariaFunctionRegistry.register({
  name: 'get_lead_source_stats',
  category: 'reporting',
  description: 'See where leads are coming from and their conversion rates',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_lead_source_stats',
    description: 'Get statistics on lead sources - which sources bring in the most leads and which convert best',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['this_month', 'this_quarter', 'this_year', 'all_time'],
          description: 'Time period for the report (default: this_month)',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { period = 'this_month' } = args as { period?: string }

    // Calculate date range
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'this_quarter':
        const quarter = Math.floor(now.getMonth() / 3)
        startDate = new Date(now.getFullYear(), quarter * 3, 1)
        break
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(0)
    }

    // Get all projects with lead source
    const { data: projects, error } = await context.supabase
      .from('projects')
      .select('id, lead_source, pipeline_stage, estimated_value, final_value')
      .eq('tenant_id', context.tenantId)
      .eq('is_deleted', false)
      .gte('created_at', startDate.toISOString())

    if (error) {
      return { success: false, error: error.message }
    }

    // Aggregate by lead source
    const sourceStats: Record<string, {
      count: number
      won: number
      lost: number
      active: number
      revenue: number
    }> = {}

    projects?.forEach((p) => {
      const source = p.lead_source || 'unknown'
      if (!sourceStats[source]) {
        sourceStats[source] = { count: 0, won: 0, lost: 0, active: 0, revenue: 0 }
      }
      sourceStats[source].count++

      if (p.pipeline_stage === 'won') {
        sourceStats[source].won++
        sourceStats[source].revenue += p.final_value || p.estimated_value || 0
      } else if (p.pipeline_stage === 'lost') {
        sourceStats[source].lost++
      } else {
        sourceStats[source].active++
      }
    })

    // Sort by count descending
    const sorted = Object.entries(sourceStats)
      .sort(([, a], [, b]) => b.count - a.count)

    // Format message
    const lines = sorted.map(([source, stats]) => {
      const closeRate = (stats.won + stats.lost) > 0
        ? Math.round((stats.won / (stats.won + stats.lost)) * 100)
        : 0
      return `• ${source}: ${stats.count} leads, ${stats.won} won (${closeRate}% close rate), $${stats.revenue.toLocaleString()}`
    })

    const totalLeads = projects?.length || 0
    const message = [
      `📊 Lead Source Report (${period.replace('_', ' ')}):`,
      `Total: ${totalLeads} leads`,
      ``,
      ...lines,
    ].join('\n')

    return {
      success: true,
      data: { period, totalLeads, sourceStats },
      message,
    }
  },
})

ariaFunctionRegistry.register({
  name: 'get_communication_history',
  category: 'crm',
  description: 'Get past communications (calls, texts, emails) with a contact',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_communication_history',
    description: 'Get the history of communications with a contact - calls, texts, emails, and notes',
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'Contact ID to get history for',
        },
        type: {
          type: 'string',
          enum: ['all', 'call', 'sms', 'email', 'note'],
          description: 'Filter by communication type (default: all)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return (default: 20)',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { contact_id, type = 'all', limit = 20 } = args as {
      contact_id?: string
      type?: string
      limit?: number
    }

    const finalContactId = contact_id || context.contact?.id

    if (!finalContactId) {
      return { success: false, error: 'A contact_id is required.' }
    }

    // Get contact name first
    const { data: contact } = await context.supabase
      .from('contacts')
      .select('first_name, last_name')
      .eq('id', finalContactId)
      .single()

    const contactName = contact
      ? `${contact.first_name} ${contact.last_name}`.trim()
      : 'Unknown'

    // Build query for activities
    let query = context.supabase
      .from('activities')
      .select('id, type, content, created_at, metadata')
      .eq('tenant_id', context.tenantId)
      .eq('contact_id', finalContactId)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by type if not 'all'
    if (type !== 'all') {
      query = query.eq('type', type)
    } else {
      // Get communication-related types
      query = query.in('type', ['call', 'sms', 'email', 'note', 'meeting'])
    }

    const { data: activities, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    if (!activities || activities.length === 0) {
      return {
        success: true,
        data: [],
        message: `No communication history found for ${contactName}.`,
      }
    }

    // Format the history
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr)
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays === 0) return 'Today'
      if (diffDays === 1) return 'Yesterday'
      if (diffDays < 7) return `${diffDays} days ago`
      return date.toLocaleDateString()
    }

    const emojiMap: Record<string, string> = { call: '📞', sms: '💬', email: '📧', note: '📝', meeting: '🤝' }
    const lines = activities.map((a) => {
      const emoji = emojiMap[a.type as string] || '•'
      return `${emoji} ${formatDate(a.created_at)} [${a.type}]: ${a.content?.substring(0, 60)}${(a.content?.length || 0) > 60 ? '...' : ''}`
    })

    const message = [
      `📋 Communication History for ${contactName}:`,
      `(${activities.length} records)`,
      ``,
      ...lines,
    ].join('\n')

    return {
      success: true,
      data: activities,
      message,
    }
  },
})

// =============================================================================
// Insurance Functions (Critical for Storm Damage Roofing)
// =============================================================================

ariaFunctionRegistry.register({
  name: 'update_insurance_info',
  category: 'crm',
  description: 'Update insurance information for a contact or project',
  riskLevel: 'medium',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'update_insurance_info',
    description: 'Update insurance details - carrier, claim number, approved value, or assign an adjuster to a project',
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'Contact ID to update insurance info for',
        },
        project_id: {
          type: 'string',
          description: 'Project ID to update (for approved_value or adjuster)',
        },
        insurance_carrier: {
          type: 'string',
          description: 'Insurance company name (e.g., "State Farm", "Allstate")',
        },
        claim_number: {
          type: 'string',
          description: 'Insurance claim number',
        },
        customer_type: {
          type: 'string',
          enum: ['insurance', 'retail'],
          description: 'Whether this is an insurance or retail job',
        },
        approved_value: {
          type: 'number',
          description: 'Insurance approved value in dollars (for project)',
        },
        adjuster_name: {
          type: 'string',
          description: 'Name of the insurance adjuster (will search/create contact)',
        },
        adjuster_phone: {
          type: 'string',
          description: 'Adjuster phone number',
        },
        adjuster_email: {
          type: 'string',
          description: 'Adjuster email address',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const {
      contact_id,
      project_id,
      insurance_carrier,
      claim_number,
      customer_type,
      approved_value,
      adjuster_name,
      adjuster_phone,
      adjuster_email,
    } = args as {
      contact_id?: string
      project_id?: string
      insurance_carrier?: string
      claim_number?: string
      customer_type?: string
      approved_value?: number
      adjuster_name?: string
      adjuster_phone?: string
      adjuster_email?: string
    }

    const finalContactId = contact_id || context.contact?.id
    const finalProjectId = project_id || context.project?.id

    if (!finalContactId && !finalProjectId) {
      return { success: false, error: 'Provide contact_id or project_id to update insurance info.' }
    }

    const updates: string[] = []

    // Update contact insurance fields
    if (finalContactId && (insurance_carrier || claim_number || customer_type)) {
      const contactUpdates: Record<string, unknown> = {}
      if (insurance_carrier) contactUpdates.insurance_carrier = insurance_carrier
      if (claim_number) contactUpdates.claim_number = claim_number
      if (customer_type) contactUpdates.customer_type = customer_type

      const { error: contactError } = await context.supabase
        .from('contacts')
        .update(contactUpdates)
        .eq('id', finalContactId)
        .eq('tenant_id', context.tenantId)

      if (contactError) {
        return { success: false, error: contactError.message }
      }

      if (insurance_carrier) updates.push(`carrier: ${insurance_carrier}`)
      if (claim_number) updates.push(`claim #: ${claim_number}`)
      if (customer_type) updates.push(`type: ${customer_type}`)
    }

    // Update project fields (approved_value, adjuster)
    if (finalProjectId) {
      const projectUpdates: Record<string, unknown> = {}

      if (approved_value !== undefined) {
        projectUpdates.approved_value = approved_value
        updates.push(`approved: $${approved_value.toLocaleString()}`)
      }

      // Handle adjuster - create contact if needed
      if (adjuster_name) {
        // Search for existing adjuster contact
        const { data: existingAdjuster } = await context.supabase
          .from('contacts')
          .select('id, first_name, last_name')
          .eq('tenant_id', context.tenantId)
          .ilike('first_name', `%${adjuster_name.split(' ')[0]}%`)
          .eq('contact_type', 'adjuster')
          .limit(1)
          .single()

        let adjusterId: string

        if (existingAdjuster) {
          adjusterId = existingAdjuster.id
          updates.push(`adjuster: ${existingAdjuster.first_name} ${existingAdjuster.last_name} (existing)`)
        } else {
          // Create new adjuster contact
          const nameParts = adjuster_name.split(' ')
          const firstName = nameParts[0] || adjuster_name
          const lastName = nameParts.slice(1).join(' ') || ''

          const { data: newAdjuster, error: createError } = await context.supabase
            .from('contacts')
            .insert({
              tenant_id: context.tenantId,
              first_name: firstName,
              last_name: lastName,
              phone: adjuster_phone,
              email: adjuster_email,
              contact_type: 'adjuster',
              company: insurance_carrier,
              created_by: context.userId,
            })
            .select('id')
            .single()

          if (createError) {
            return { success: false, error: `Failed to create adjuster: ${createError.message}` }
          }

          adjusterId = newAdjuster.id
          updates.push(`adjuster: ${adjuster_name} (created)`)
        }

        projectUpdates.adjuster_contact_id = adjusterId
      }

      if (Object.keys(projectUpdates).length > 0) {
        const { error: projectError } = await context.supabase
          .from('projects')
          .update(projectUpdates)
          .eq('id', finalProjectId)
          .eq('tenant_id', context.tenantId)

        if (projectError) {
          return { success: false, error: projectError.message }
        }
      }
    }

    if (updates.length === 0) {
      return { success: false, error: 'No insurance fields provided to update.' }
    }

    // Log the update
    await context.supabase.from('activities').insert({
      tenant_id: context.tenantId,
      contact_id: finalContactId,
      project_id: finalProjectId,
      type: 'note',
      subject: 'Insurance Updated',
      content: `Insurance info updated: ${updates.join(', ')}`,
      created_by: context.userId,
      metadata: { via: 'aria', event: 'insurance_update' },
    })

    return {
      success: true,
      message: `Insurance info updated: ${updates.join(', ')}`,
    }
  },
})

ariaFunctionRegistry.register({
  name: 'get_insurance_status',
  category: 'crm',
  description: 'Get insurance details for a project or contact',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_insurance_status',
    description: 'Get insurance information including carrier, claim number, adjuster, and approved value',
    parameters: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID to get insurance status for',
        },
        contact_id: {
          type: 'string',
          description: 'Contact ID to get insurance info for',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { project_id, contact_id } = args as { project_id?: string; contact_id?: string }

    const finalProjectId = project_id || context.project?.id
    const finalContactId = contact_id || context.contact?.id

    if (!finalProjectId && !finalContactId) {
      return { success: false, error: 'Provide project_id or contact_id.' }
    }

    let projectData = null
    let contactData = null

    // Get project with adjuster info
    if (finalProjectId) {
      const { data, error } = await context.supabase
        .from('projects')
        .select(`
          id, name, approved_value, estimated_value, final_value, pipeline_stage,
          contact:contact_id (
            id, first_name, last_name, insurance_carrier, claim_number, customer_type
          ),
          adjuster:adjuster_contact_id (
            id, first_name, last_name, phone, email, company
          )
        `)
        .eq('id', finalProjectId)
        .eq('tenant_id', context.tenantId)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      projectData = data
      // Get contact data from project
      contactData = Array.isArray(data.contact) ? data.contact[0] : data.contact
    } else if (finalContactId) {
      // Get contact directly
      const { data, error } = await context.supabase
        .from('contacts')
        .select('id, first_name, last_name, insurance_carrier, claim_number, customer_type')
        .eq('id', finalContactId)
        .eq('tenant_id', context.tenantId)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      contactData = data
    }

    // Build response message
    const lines: string[] = ['🏥 Insurance Status:']

    if (projectData) {
      lines.push(`Project: ${projectData.name}`)
      lines.push(`Stage: ${projectData.pipeline_stage}`)
    }

    if (contactData) {
      const contactName = `${contactData.first_name} ${contactData.last_name}`.trim()
      lines.push(`Customer: ${contactName}`)

      if (contactData.customer_type) {
        lines.push(`Job Type: ${contactData.customer_type === 'insurance' ? '🏥 Insurance' : '💵 Retail'}`)
      }
      if (contactData.insurance_carrier) {
        lines.push(`Carrier: ${contactData.insurance_carrier}`)
      }
      if (contactData.claim_number) {
        lines.push(`Claim #: ${contactData.claim_number}`)
      }
    }

    if (projectData) {
      if (projectData.approved_value) {
        lines.push(`✅ Approved: $${projectData.approved_value.toLocaleString()}`)
      } else if (projectData.estimated_value) {
        lines.push(`📝 Estimated: $${projectData.estimated_value.toLocaleString()} (not yet approved)`)
      }

      const adjuster = Array.isArray(projectData.adjuster) ? projectData.adjuster[0] : projectData.adjuster
      if (adjuster) {
        lines.push(``)
        lines.push(`👤 Adjuster: ${adjuster.first_name} ${adjuster.last_name}`)
        if (adjuster.company) lines.push(`   Company: ${adjuster.company}`)
        if (adjuster.phone) lines.push(`   Phone: ${adjuster.phone}`)
        if (adjuster.email) lines.push(`   Email: ${adjuster.email}`)
      } else {
        lines.push(``)
        lines.push(`⚠️ No adjuster assigned`)
      }
    }

    return {
      success: true,
      data: { project: projectData, contact: contactData },
      message: lines.join('\n'),
    }
  },
})

ariaFunctionRegistry.register({
  name: 'schedule_adjuster_meeting',
  category: 'calendar',
  description: 'Schedule a meeting with the insurance adjuster',
  riskLevel: 'medium',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'schedule_adjuster_meeting',
    description: 'Schedule an adjuster meeting/inspection for a project',
    parameters: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID for the adjuster meeting',
        },
        date: {
          type: 'string',
          description: 'Date/time for the meeting (e.g., "tomorrow at 2pm", "January 15 at 10am")',
        },
        meeting_type: {
          type: 'string',
          enum: ['initial_inspection', 'reinspection', 'supplement_review', 'final_inspection'],
          description: 'Type of adjuster meeting (default: initial_inspection)',
        },
        notes: {
          type: 'string',
          description: 'Notes about the meeting',
        },
        notify_adjuster: {
          type: 'boolean',
          description: 'Whether to notify the adjuster (via email/SMS) - default false',
        },
      },
      required: ['project_id', 'date'],
    },
  },
  execute: async (args, context) => {
    const {
      project_id,
      date,
      meeting_type = 'initial_inspection',
      notes,
      notify_adjuster = false,
    } = args as {
      project_id: string
      date: string
      meeting_type?: string
      notes?: string
      notify_adjuster?: boolean
    }

    const finalProjectId = project_id || context.project?.id

    if (!finalProjectId) {
      return { success: false, error: 'A project_id is required.' }
    }

    // Get project with adjuster and contact info
    const { data: project, error: projectError } = await context.supabase
      .from('projects')
      .select(`
        id, name, property_address,
        contact:contact_id (id, first_name, last_name, phone, address_street, address_city),
        adjuster:adjuster_contact_id (id, first_name, last_name, email, phone)
      `)
      .eq('id', finalProjectId)
      .eq('tenant_id', context.tenantId)
      .single()

    if (projectError) {
      return { success: false, error: projectError.message }
    }

    // Parse the date
    let meetingDate: Date
    const lowerDate = date.toLowerCase()
    const now = new Date()

    if (lowerDate === 'today') {
      meetingDate = now
    } else if (lowerDate === 'tomorrow') {
      meetingDate = new Date(now)
      meetingDate.setDate(meetingDate.getDate() + 1)
      meetingDate.setHours(10, 0, 0, 0)
    } else if (lowerDate.includes('next')) {
      meetingDate = new Date(now)
      meetingDate.setDate(meetingDate.getDate() + 7)
      meetingDate.setHours(10, 0, 0, 0)
    } else {
      meetingDate = new Date(date)
      if (isNaN(meetingDate.getTime())) {
        return { success: false, error: `Could not parse date: "${date}"` }
      }
    }

    // Extract time if present
    const timeMatch = lowerDate.match(/(\d{1,2})\s*(am|pm)/i)
    if (timeMatch) {
      let hours = parseInt(timeMatch[1])
      if (timeMatch[2].toLowerCase() === 'pm' && hours < 12) hours += 12
      if (timeMatch[2].toLowerCase() === 'am' && hours === 12) hours = 0
      meetingDate.setHours(hours, 0, 0, 0)
    }

    const contactData = Array.isArray(project.contact) ? project.contact[0] : project.contact
    const adjusterData = Array.isArray(project.adjuster) ? project.adjuster[0] : project.adjuster

    // Format meeting title
    const meetingTypeLabels: Record<string, string> = {
      initial_inspection: 'Initial Adjuster Inspection',
      reinspection: 'Adjuster Re-inspection',
      supplement_review: 'Supplement Review Meeting',
      final_inspection: 'Final Inspection',
    }
    const title = `${meetingTypeLabels[meeting_type] || 'Adjuster Meeting'} - ${project.name}`

    // Create the activity
    const { data: activity, error: activityError } = await context.supabase
      .from('activities')
      .insert({
        tenant_id: context.tenantId,
        contact_id: contactData?.id,
        project_id: finalProjectId,
        type: 'meeting',
        subject: title,
        scheduled_at: meetingDate.toISOString(),
        created_by: context.userId,
        metadata: {
          appointment_type: 'adjuster_meeting',
          meeting_type,
          adjuster_id: adjusterData?.id,
          adjuster_name: adjusterData ? `${adjusterData.first_name} ${adjusterData.last_name}` : null,
          property_address: project.property_address || contactData?.address_street,
          notes,
          status: 'scheduled',
          via: 'aria',
        },
      })
      .select()
      .single()

    if (activityError) {
      return { success: false, error: activityError.message }
    }

    const dateStr = meetingDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    const timeStr = meetingDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })

    let message = `📅 ${meetingTypeLabels[meeting_type]} scheduled:\n`
    message += `Date: ${dateStr} at ${timeStr}\n`
    message += `Project: ${project.name}\n`

    if (adjusterData) {
      message += `Adjuster: ${adjusterData.first_name} ${adjusterData.last_name}\n`
    } else {
      message += `⚠️ Note: No adjuster assigned to this project yet\n`
    }

    if (notify_adjuster && adjusterData?.email) {
      try {
        await sendEmail({
          to: adjusterData.email,
          subject: `${meetingTypeLabels[meeting_type]} Scheduled - ${project.name}`,
          html: `<p>An ${meetingTypeLabels[meeting_type]} has been scheduled for ${dateStr} at ${timeStr}.</p><p>Project: ${project.name}</p>${notes ? `<p>Notes: ${notes}</p>` : ''}`,
        })
        message += `\n(Notification sent to ${adjusterData.email})`
      } catch (err) {
        logger.error('Failed to notify adjuster', { error: err, email: adjusterData.email })
        message += `\n(Adjuster notification requested but email delivery failed)`
      }
    }

    return {
      success: true,
      data: activity,
      message,
    }
  },
})

// =============================================================================
// Production & Job Management Functions
// =============================================================================

ariaFunctionRegistry.register({
  name: 'start_production',
  category: 'crm',
  description: 'Start production on a won project',
  riskLevel: 'medium',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'start_production',
    description: 'Start production/work on a project that has been won. Sets status to in_progress and records start date.',
    parameters: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID to start production on',
        },
        start_date: {
          type: 'string',
          description: 'When production starts (default: today). Can be "today", "tomorrow", or a date.',
        },
        assigned_to: {
          type: 'string',
          description: 'Name or ID of team member to assign (optional)',
        },
        notes: {
          type: 'string',
          description: 'Notes about the job start',
        },
      },
      required: ['project_id'],
    },
  },
  execute: async (args, context) => {
    const { project_id, start_date, assigned_to, notes } = args as {
      project_id: string
      start_date?: string
      assigned_to?: string
      notes?: string
    }

    const finalProjectId = project_id || context.project?.id

    if (!finalProjectId) {
      return { success: false, error: 'A project_id is required.' }
    }

    // Parse start date
    let productionStartDate = new Date()
    if (start_date) {
      const lowerDate = start_date.toLowerCase()
      if (lowerDate === 'tomorrow') {
        productionStartDate.setDate(productionStartDate.getDate() + 1)
      } else if (lowerDate !== 'today') {
        const parsed = new Date(start_date)
        if (!isNaN(parsed.getTime())) {
          productionStartDate = parsed
        }
      }
    }

    const updateData: Record<string, unknown> = {
      status: 'in_progress',
      scheduled_start: productionStartDate.toISOString(),
    }

    if (assigned_to) {
      updateData.crew_assigned = assigned_to
    }

    const { data, error } = await context.supabase
      .from('projects')
      .update(updateData)
      .eq('id', finalProjectId)
      .eq('tenant_id', context.tenantId)
      .select('id, name, status, scheduled_start, crew_assigned')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Log the production start
    await context.supabase.from('activities').insert({
      tenant_id: context.tenantId,
      project_id: finalProjectId,
      type: 'note',
      subject: 'Production Started',
      content: notes
        ? `Production STARTED: ${notes}`
        : `Production started${assigned_to ? ` - assigned to ${assigned_to}` : ''}`,
      created_by: context.userId,
      metadata: { via: 'aria', event: 'production_started', crew_assigned: assigned_to },
    })

    const dateStr = productionStartDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })

    let message = `🚀 Production started on "${data.name}"!\n`
    message += `Start Date: ${dateStr}\n`
    if (data.crew_assigned) {
      message += `Assigned to: ${data.crew_assigned}`
    }

    return { success: true, data, message }
  },
})

ariaFunctionRegistry.register({
  name: 'update_job_progress',
  category: 'crm',
  description: 'Update progress on an in-progress job',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'update_job_progress',
    description: 'Log progress update on a job - what was done, any issues, completion percentage',
    parameters: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID to update',
        },
        progress_note: {
          type: 'string',
          description: 'What was accomplished or update on the job',
        },
        completion_percentage: {
          type: 'number',
          description: 'Estimated completion percentage (0-100)',
        },
        issues: {
          type: 'string',
          description: 'Any issues or blockers encountered',
        },
      },
      required: ['project_id', 'progress_note'],
    },
  },
  execute: async (args, context) => {
    const { project_id, progress_note, completion_percentage, issues } = args as {
      project_id: string
      progress_note: string
      completion_percentage?: number
      issues?: string
    }

    const finalProjectId = project_id || context.project?.id

    if (!finalProjectId) {
      return { success: false, error: 'A project_id is required.' }
    }

    // Get project name
    const { data: project } = await context.supabase
      .from('projects')
      .select('name')
      .eq('id', finalProjectId)
      .single()

    // Build the progress note
    let fullNote = `📋 Progress Update: ${progress_note}`
    if (completion_percentage !== undefined) {
      fullNote += `\n📊 Completion: ${completion_percentage}%`
    }
    if (issues) {
      fullNote += `\n⚠️ Issues: ${issues}`
    }

    // Log the progress
    const { error } = await context.supabase.from('activities').insert({
      tenant_id: context.tenantId,
      project_id: finalProjectId,
      type: 'note',
      subject: 'Progress Update',
      content: fullNote,
      created_by: context.userId,
      metadata: {
        via: 'aria',
        event: 'progress_update',
        completion_percentage,
        has_issues: !!issues,
      },
    })

    if (error) {
      return { success: false, error: error.message }
    }

    // Update project custom_fields with completion if provided
    if (completion_percentage !== undefined) {
      await context.supabase
        .from('projects')
        .update({
          custom_fields: context.supabase.rpc('jsonb_set_nested', {
            target: 'custom_fields',
            path: '{completion_percentage}',
            value: completion_percentage,
          }),
        })
        .eq('id', finalProjectId)
    }

    let message = `✅ Progress logged for "${project?.name || 'project'}":\n${progress_note}`
    if (completion_percentage !== undefined) {
      message += `\n📊 ${completion_percentage}% complete`
    }
    if (issues) {
      message += `\n⚠️ Issues noted: ${issues}`
    }

    return { success: true, message }
  },
})

ariaFunctionRegistry.register({
  name: 'complete_project',
  category: 'crm',
  description: 'Mark a project as completed',
  riskLevel: 'medium',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'complete_project',
    description: 'Mark a project as completed - work is done',
    parameters: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID to complete',
        },
        completion_date: {
          type: 'string',
          description: 'When the project was completed (default: today)',
        },
        final_notes: {
          type: 'string',
          description: 'Final notes about the completed job',
        },
        final_value: {
          type: 'number',
          description: 'Final job value if different from estimate',
        },
      },
      required: ['project_id'],
    },
  },
  execute: async (args, context) => {
    const { project_id, completion_date, final_notes, final_value } = args as {
      project_id: string
      completion_date?: string
      final_notes?: string
      final_value?: number
    }

    const finalProjectId = project_id || context.project?.id

    if (!finalProjectId) {
      return { success: false, error: 'A project_id is required.' }
    }

    // Parse completion date
    let endDate = new Date()
    if (completion_date && completion_date.toLowerCase() !== 'today') {
      const parsed = new Date(completion_date)
      if (!isNaN(parsed.getTime())) {
        endDate = parsed
      }
    }

    const updateData: Record<string, unknown> = {
      status: 'completed',
      end_date: endDate.toISOString(),
    }

    if (final_value !== undefined) {
      updateData.final_value = final_value
    }

    const { data, error } = await context.supabase
      .from('projects')
      .update(updateData)
      .eq('id', finalProjectId)
      .eq('tenant_id', context.tenantId)
      .select('id, name, status, start_date, end_date, final_value, estimated_value')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Calculate job duration if we have start date
    let durationStr = ''
    if (data.start_date) {
      const startDate = new Date(data.start_date)
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      durationStr = `${days} day${days !== 1 ? 's' : ''}`
    }

    // Log the completion
    await context.supabase.from('activities').insert({
      tenant_id: context.tenantId,
      project_id: finalProjectId,
      type: 'note',
      subject: 'Project Completed',
      content: final_notes
        ? `🎉 Project COMPLETED: ${final_notes}`
        : '🎉 Project marked as COMPLETED',
      created_by: context.userId,
      metadata: { via: 'aria', event: 'project_completed', duration_days: durationStr },
    })

    const value = data.final_value || data.estimated_value
    let message = `🎉 "${data.name}" is COMPLETE!\n`
    if (durationStr) {
      message += `Duration: ${durationStr}\n`
    }
    if (value) {
      message += `Value: $${value.toLocaleString()}`
    }

    return { success: true, data, message }
  },
})

ariaFunctionRegistry.register({
  name: 'assign_project',
  category: 'crm',
  description: 'Assign a project to a team member',
  riskLevel: 'medium',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'assign_project',
    description: 'Assign a project to a team member',
    parameters: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID to assign',
        },
        assigned_to: {
          type: 'string',
          description: 'Name of the team member to assign to',
        },
        notify: {
          type: 'boolean',
          description: 'Whether to notify the team member (default: false)',
        },
      },
      required: ['project_id', 'assigned_to'],
    },
  },
  execute: async (args, context) => {
    const { project_id, assigned_to, notify = false } = args as {
      project_id: string
      assigned_to: string
      notify?: boolean
    }

    const finalProjectId = project_id || context.project?.id

    if (!finalProjectId) {
      return { success: false, error: 'A project_id is required.' }
    }

    const { data, error } = await context.supabase
      .from('projects')
      .update({ crew_assigned: assigned_to })
      .eq('id', finalProjectId)
      .eq('tenant_id', context.tenantId)
      .select('id, name, crew_assigned')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Log the assignment
    await context.supabase.from('activities').insert({
      tenant_id: context.tenantId,
      project_id: finalProjectId,
      type: 'note',
      subject: 'Project Assigned',
      content: `Project assigned to ${assigned_to}`,
      created_by: context.userId,
      metadata: { via: 'aria', event: 'project_assigned', crew_assigned: assigned_to },
    })

    let message = `✅ "${data.name}" assigned to ${assigned_to}`
    if (notify) {
      const notifyResult = await notifyTeamMember({
        supabase: context.supabase,
        tenantId: context.tenantId,
        assignedTo: assigned_to,
        subject: `Project Assigned: ${data.name}`,
        body: `You have been assigned to project "${data.name}".`,
      })
      if (notifyResult.sent) {
        message += `\n(Notification sent via ${notifyResult.channels.join(', ')})`
      } else {
        message += '\n(Notification requested but delivery failed)'
      }
    }

    return { success: true, data, message }
  },
})

ariaFunctionRegistry.register({
  name: 'get_team_workload',
  category: 'reporting',
  description: 'See how many projects each team member has',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_team_workload',
    description: 'Get a summary of how many active projects each team member has assigned',
    parameters: {
      type: 'object',
      properties: {
        include_completed: {
          type: 'boolean',
          description: 'Include completed projects in count (default: false)',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { include_completed = false } = args as { include_completed?: boolean }

    // Get all projects with assignments
    let query = context.supabase
      .from('projects')
      .select('id, name, crew_assigned, status, pipeline_stage, estimated_value')
      .eq('tenant_id', context.tenantId)
      .eq('is_deleted', false)

    if (!include_completed) {
      query = query.not('status', 'in', '(completed,cancelled)')
      query = query.not('pipeline_stage', 'eq', 'lost')
    }

    const { data: projects, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    // Aggregate by assigned_to
    const workload: Record<string, {
      count: number
      in_progress: number
      pipeline: number
      value: number
    }> = {}

    projects?.forEach((p) => {
      const assignee = p.crew_assigned || 'Unassigned'
      if (!workload[assignee]) {
        workload[assignee] = { count: 0, in_progress: 0, pipeline: 0, value: 0 }
      }
      workload[assignee].count++
      workload[assignee].value += p.estimated_value || 0

      if (p.status === 'in_progress') {
        workload[assignee].in_progress++
      } else if (!['completed', 'cancelled'].includes(p.status || '')) {
        workload[assignee].pipeline++
      }
    })

    // Sort by count descending
    const sorted = Object.entries(workload)
      .sort(([, a], [, b]) => b.count - a.count)

    const lines = sorted.map(([name, stats]) => {
      return `• ${name}: ${stats.count} projects (${stats.in_progress} active, ${stats.pipeline} pipeline) - $${stats.value.toLocaleString()}`
    })

    const totalProjects = projects?.length || 0
    const message = [
      `👥 Team Workload:`,
      `Total: ${totalProjects} projects`,
      ``,
      ...lines,
    ].join('\n')

    return {
      success: true,
      data: { totalProjects, workload },
      message,
    }
  },
})

// =============================================================================
// Contact Management Functions
// =============================================================================

ariaFunctionRegistry.register({
  name: 'update_contact',
  category: 'crm',
  description: 'Update information for an existing contact',
  riskLevel: 'medium',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'update_contact',
    description: 'Update contact information like phone, email, address, or other details',
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'UUID of the contact to update',
        },
        first_name: { type: 'string', description: 'Updated first name' },
        last_name: { type: 'string', description: 'Updated last name' },
        email: { type: 'string', description: 'Updated email address' },
        phone: { type: 'string', description: 'Updated phone number' },
        mobile_phone: { type: 'string', description: 'Updated mobile phone' },
        address_street: { type: 'string', description: 'Updated street address' },
        address_city: { type: 'string', description: 'Updated city' },
        address_state: { type: 'string', description: 'Updated state' },
        address_zip: { type: 'string', description: 'Updated ZIP code' },
      },
      required: ['contact_id'],
    },
  },
  execute: async (args, context) => {
    const { contact_id, ...updates } = args as { contact_id: string; [key: string]: unknown }

    const finalContactId = contact_id || context.contact?.id

    if (!finalContactId) {
      return { success: false, error: 'A contact_id is required.' }
    }

    // Filter out undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined && v !== null)
    )

    if (Object.keys(cleanUpdates).length === 0) {
      return { success: false, error: 'No fields provided to update.' }
    }

    const { data, error } = await context.supabase
      .from('contacts')
      .update(cleanUpdates)
      .eq('id', finalContactId)
      .eq('tenant_id', context.tenantId)
      .select('id, first_name, last_name, email, phone')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    const updatedFields = Object.keys(cleanUpdates).join(', ')

    return {
      success: true,
      data,
      message: `Updated ${data.first_name} ${data.last_name}'s ${updatedFields}.`,
    }
  },
})

// =============================================================================
// Activity & Schedule Functions
// =============================================================================

ariaFunctionRegistry.register({
  name: 'search_activities',
  category: 'crm',
  description: 'Search for past activities, notes, and interactions',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'search_activities',
    description: 'Search for past activities, notes, calls, emails, and other interactions for a contact or project',
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'Filter by contact ID',
        },
        project_id: {
          type: 'string',
          description: 'Filter by project ID',
        },
        type: {
          type: 'string',
          enum: ['note', 'call', 'email', 'meeting', 'task'],
          description: 'Filter by activity type',
        },
        limit: {
          type: 'number',
          description: 'Maximum results (default: 10)',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { contact_id, project_id, type, limit = 10 } = args as {
      contact_id?: string
      project_id?: string
      type?: string
      limit?: number
    }

    // Use context if available
    const finalContactId = contact_id || context.contact?.id
    const finalProjectId = project_id || context.project?.id

    let query = context.supabase
      .from('activities')
      .select(`
        id, type, content, created_at, scheduled_at, metadata,
        contact:contact_id (first_name, last_name),
        project:project_id (name)
      `)
      .eq('tenant_id', context.tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (finalContactId) {
      query = query.eq('contact_id', finalContactId)
    }
    if (finalProjectId) {
      query = query.eq('project_id', finalProjectId)
    }
    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    if (!data || data.length === 0) {
      return { success: true, data: [], message: 'No activities found.' }
    }

    // Format summary
    const summaries = data.slice(0, 5).map((a) => {
      const date = new Date(a.created_at).toLocaleDateString()
      return `${date} [${a.type}]: ${a.content?.substring(0, 50)}...`
    })

    return {
      success: true,
      data,
      message: `Found ${data.length} activities:\n${summaries.join('\n')}`,
    }
  },
})

ariaFunctionRegistry.register({
  name: 'get_today_schedule',
  category: 'crm',
  description: 'Get today\'s scheduled appointments, tasks, and follow-ups',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_today_schedule',
    description: 'Get today\'s schedule including appointments, tasks, callbacks, and follow-ups that are due',
    parameters: {
      type: 'object',
      properties: {
        include_overdue: {
          type: 'boolean',
          description: 'Include overdue items from previous days (default: true)',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { include_overdue = true } = args as { include_overdue?: boolean }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    let query = context.supabase
      .from('activities')
      .select(`
        id, type, content, scheduled_at, metadata,
        contact:contact_id (first_name, last_name),
        project:project_id (name)
      `)
      .eq('tenant_id', context.tenantId)
      .not('scheduled_at', 'is', null)
      .order('scheduled_at', { ascending: true })

    if (include_overdue) {
      // Get items due today or overdue
      query = query.lt('scheduled_at', tomorrow.toISOString())
    } else {
      // Only today's items
      query = query.gte('scheduled_at', today.toISOString()).lt('scheduled_at', tomorrow.toISOString())
    }

    // Filter to pending tasks only
    query = query.or('metadata->>status.is.null,metadata->>status.eq.pending')

    const { data, error } = await query.limit(20)

    if (error) {
      return { success: false, error: error.message }
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        data: [],
        message: 'Your schedule is clear! No tasks or appointments due today.',
      }
    }

    // Separate overdue vs today
    const overdue = data.filter((a) => new Date(a.scheduled_at) < today)
    const todayItems = data.filter((a) => new Date(a.scheduled_at) >= today)

    let message = ''
    if (overdue.length > 0) {
      message += `⚠️ ${overdue.length} overdue item(s)\n`
    }
    message += `📅 ${todayItems.length} item(s) due today\n\n`

    const formatItem = (a: typeof data[0]) => {
      const contactData = Array.isArray(a.contact) ? a.contact[0] : a.contact
      const projectData = Array.isArray(a.project) ? a.project[0] : a.project
      const who = contactData ? `${contactData.first_name} ${contactData.last_name}` : projectData?.name || ''
      return `• [${a.type}] ${a.content?.substring(0, 40)}${who ? ` - ${who}` : ''}`
    }

    if (overdue.length > 0) {
      message += 'OVERDUE:\n' + overdue.map(formatItem).join('\n') + '\n\n'
    }
    if (todayItems.length > 0) {
      message += 'TODAY:\n' + todayItems.map(formatItem).join('\n')
    }

    return {
      success: true,
      data: { overdue, today: todayItems },
      message,
    }
  },
})

ariaFunctionRegistry.register({
  name: 'book_appointment',
  category: 'actions',
  description: 'Schedule an appointment or meeting',
  riskLevel: 'medium',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'book_appointment',
    description: 'Schedule an appointment, inspection, meeting, or site visit with a contact',
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'Contact ID for the appointment',
        },
        project_id: {
          type: 'string',
          description: 'Related project ID (optional)',
        },
        title: {
          type: 'string',
          description: 'Appointment title (e.g., "Roof Inspection", "Estimate Review")',
        },
        date: {
          type: 'string',
          description: 'Date/time for the appointment (e.g., "tomorrow at 2pm", "January 15 at 10am", "next Monday")',
        },
        duration_minutes: {
          type: 'number',
          description: 'Appointment duration in minutes (default: 60)',
        },
        notes: {
          type: 'string',
          description: 'Any notes or details about the appointment',
        },
        appointment_type: {
          type: 'string',
          enum: ['inspection', 'estimate', 'meeting', 'site_visit', 'follow_up', 'other'],
          description: 'Type of appointment',
        },
      },
      required: ['title', 'date'],
    },
  },
  execute: async (args, context) => {
    const {
      contact_id,
      project_id,
      title,
      date,
      duration_minutes = 60,
      notes,
      appointment_type = 'meeting',
    } = args as {
      contact_id?: string
      project_id?: string
      title: string
      date: string
      duration_minutes?: number
      notes?: string
      appointment_type?: string
    }

    const finalContactId = contact_id || context.contact?.id
    const finalProjectId = project_id || context.project?.id

    // Parse the date - handle natural language
    let appointmentDate: Date
    const lowerDate = date.toLowerCase()

    const now = new Date()
    if (lowerDate === 'today') {
      appointmentDate = now
    } else if (lowerDate === 'tomorrow') {
      appointmentDate = new Date(now)
      appointmentDate.setDate(appointmentDate.getDate() + 1)
      appointmentDate.setHours(9, 0, 0, 0) // Default 9am
    } else if (lowerDate.includes('next monday')) {
      appointmentDate = new Date(now)
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7
      appointmentDate.setDate(appointmentDate.getDate() + daysUntilMonday)
      appointmentDate.setHours(9, 0, 0, 0)
    } else if (lowerDate.includes('next week')) {
      appointmentDate = new Date(now)
      appointmentDate.setDate(appointmentDate.getDate() + 7)
      appointmentDate.setHours(9, 0, 0, 0)
    } else {
      // Try to parse as a date
      appointmentDate = new Date(date)
      if (isNaN(appointmentDate.getTime())) {
        return {
          success: false,
          error: `Could not parse date: "${date}". Try formats like "tomorrow at 2pm", "January 15 at 10am", or "2024-01-15T14:00:00"`,
        }
      }
    }

    // Extract time from the date string if present
    const timeMatch = lowerDate.match(/(\d{1,2})\s*(am|pm)/i)
    if (timeMatch) {
      let hours = parseInt(timeMatch[1])
      if (timeMatch[2].toLowerCase() === 'pm' && hours < 12) hours += 12
      if (timeMatch[2].toLowerCase() === 'am' && hours === 12) hours = 0
      appointmentDate.setHours(hours, 0, 0, 0)
    }

    const { data, error } = await context.supabase
      .from('activities')
      .insert({
        tenant_id: context.tenantId,
        contact_id: finalContactId,
        project_id: finalProjectId,
        type: 'meeting',
        subject: title,
        scheduled_at: appointmentDate.toISOString(),
        created_by: context.userId,
        metadata: {
          appointment_type,
          duration_minutes,
          notes,
          status: 'scheduled',
          via: 'aria',
        },
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    const dateStr = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    const timeStr = appointmentDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })

    return {
      success: true,
      data,
      message: `Appointment scheduled: "${title}" on ${dateStr} at ${timeStr}.`,
    }
  },
})

// =============================================================================
// Weather Function (existing)
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_weather',
  category: 'weather',
  description: 'Check weather conditions for job safety (wind, rain)',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_weather',
    description: 'Check weather conditions for job safety (wind, rain)',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City name or address to check weather for',
        },
      },
      required: ['location'],
    },
  },
  execute: async (args, _context) => {
    const { location } = args as { location: string }

    try {
      // Call internal weather API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/voice/weather`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location }),
        }
      )

      if (!response.ok) {
        return { success: false, error: 'Failed to fetch weather' }
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Weather fetch failed',
      }
    }
  },
})

// =============================================================================
// SMS/Email Functions (Human-in-the-Loop)
// =============================================================================

ariaFunctionRegistry.register({
  name: 'draft_sms',
  category: 'actions',
  description: 'Draft an SMS message for user approval before sending',
  riskLevel: 'medium',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'draft_sms',
    description:
      'Draft an SMS message for a contact. The message will be shown to the user for approval before sending. Use this when the user wants to text someone.',
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'ID of the contact to send SMS to',
        },
        phone: {
          type: 'string',
          description: 'Phone number if contact_id not provided',
        },
        message: {
          type: 'string',
          description: 'The SMS message content (keep under 160 chars)',
        },
        context: {
          type: 'string',
          description: 'Why this message is being sent (for approval context)',
        },
      },
      required: ['message'],
    },
  },
  execute: async (args, context) => {
    const { contact_id, phone, message, context: msgContext } = args as {
      contact_id?: string
      phone?: string
      message: string
      context?: string
    }

    let recipientPhone = phone
    let recipientName = 'Unknown'

    // If contact_id provided, look up their phone
    if (contact_id) {
      const { data: contact } = await context.supabase
        .from('contacts')
        .select('first_name, last_name, phone')
        .eq('id', contact_id)
        .eq('tenant_id', context.tenantId)
        .single()

      if (contact) {
        recipientName = `${contact.first_name} ${contact.last_name}`.trim()
        recipientPhone = contact.phone || phone
      }
    }

    if (!recipientPhone) {
      return {
        success: false,
        error: 'No phone number available for this contact',
      }
    }

    // Return draft for approval (HITL pattern)
    return {
      success: true,
      awaitingApproval: true,
      draft: {
        type: 'sms' as const,
        recipient: recipientPhone,
        body: message,
        metadata: {
          contact_id,
          contact_name: recipientName,
          context: msgContext,
        },
      },
      message: `Draft SMS to ${recipientName} (${recipientPhone}): "${message}"`,
    }
  },
})

ariaFunctionRegistry.register({
  name: 'draft_email',
  category: 'actions',
  description: 'Draft an email for user approval before sending',
  riskLevel: 'medium',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'draft_email',
    description:
      'Draft an email for a contact. The email will be shown to the user for approval before sending. Use this when the user wants to email someone.',
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'ID of the contact to email',
        },
        email: {
          type: 'string',
          description: 'Email address if contact_id not provided',
        },
        subject: {
          type: 'string',
          description: 'Email subject line',
        },
        body: {
          type: 'string',
          description: 'Email body content',
        },
        context: {
          type: 'string',
          description: 'Why this email is being sent (for approval context)',
        },
      },
      required: ['subject', 'body'],
    },
  },
  execute: async (args, context) => {
    const { contact_id, email, subject, body, context: emailContext } = args as {
      contact_id?: string
      email?: string
      subject: string
      body: string
      context?: string
    }

    let recipientEmail = email
    let recipientName = 'Unknown'

    // If contact_id provided, look up their email
    if (contact_id) {
      const { data: contact } = await context.supabase
        .from('contacts')
        .select('first_name, last_name, email')
        .eq('id', contact_id)
        .eq('tenant_id', context.tenantId)
        .single()

      if (contact) {
        recipientName = `${contact.first_name} ${contact.last_name}`.trim()
        recipientEmail = contact.email || email
      }
    }

    if (!recipientEmail) {
      return {
        success: false,
        error: 'No email address available for this contact',
      }
    }

    // Return draft for approval (HITL pattern)
    return {
      success: true,
      awaitingApproval: true,
      draft: {
        type: 'email' as const,
        recipient: recipientEmail,
        subject,
        body,
        metadata: {
          contact_id,
          contact_name: recipientName,
          context: emailContext,
        },
      },
      message: `Draft email to ${recipientName} (${recipientEmail})\nSubject: ${subject}\n\n${body}`,
    }
  },
})

// =============================================================================
// Task Management Functions
// =============================================================================

ariaFunctionRegistry.register({
  name: 'create_task',
  category: 'actions',
  description: 'Create a follow-up task or reminder',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'create_task',
    description:
      'Create a task or follow-up reminder. Can be linked to a contact or project. Use for scheduling callbacks, follow-ups, or any action items.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Task title/description',
        },
        due_date: {
          type: 'string',
          description: 'Due date (YYYY-MM-DD or relative like "tomorrow", "next week")',
        },
        contact_id: {
          type: 'string',
          description: 'Link task to a contact',
        },
        project_id: {
          type: 'string',
          description: 'Link task to a project',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Task priority level',
        },
        assigned_to: {
          type: 'string',
          description: 'User ID to assign the task to',
        },
      },
      required: ['title'],
    },
  },
  execute: async (args, context) => {
    const { title, due_date, contact_id, project_id, priority, assigned_to } = args as {
      title: string
      due_date?: string
      contact_id?: string
      project_id?: string
      priority?: 'low' | 'medium' | 'high'
      assigned_to?: string
    }

    // Parse relative dates
    let parsedDueDate: Date | null = null
    if (due_date) {
      const today = new Date()
      const lower = due_date.toLowerCase()

      if (lower === 'today') {
        parsedDueDate = today
      } else if (lower === 'tomorrow') {
        parsedDueDate = new Date(today.setDate(today.getDate() + 1))
      } else if (lower === 'next week') {
        parsedDueDate = new Date(today.setDate(today.getDate() + 7))
      } else if (lower.includes('day')) {
        const days = parseInt(lower) || 1
        parsedDueDate = new Date(today.setDate(today.getDate() + days))
      } else {
        // Try parsing as date string
        parsedDueDate = new Date(due_date)
        if (isNaN(parsedDueDate.getTime())) {
          parsedDueDate = null
        }
      }
    }

    // Create task as activity with type 'task'
    const { data, error } = await context.supabase
      .from('activities')
      .insert({
        tenant_id: context.tenantId,
        contact_id: contact_id || null,
        project_id: project_id || null,
        type: 'task',
        subject: title,
        content: JSON.stringify({
          priority: priority || 'medium',
          assigned_to: assigned_to || context.userId,
          status: 'pending',
        }),
        scheduled_at: parsedDueDate?.toISOString() || null,
        created_by: context.userId,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    const dueDateStr = parsedDueDate
      ? parsedDueDate.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      : 'no due date'

    return {
      success: true,
      data,
      message: `Task created: "${title}" (${dueDateStr}, ${priority || 'medium'} priority)`,
    }
  },
})

ariaFunctionRegistry.register({
  name: 'get_pending_tasks',
  category: 'actions',
  description: 'Get pending and overdue tasks',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_pending_tasks',
    description:
      'Get all pending tasks, optionally filtered by assignee or overdue status. Shows tasks that need attention.',
    parameters: {
      type: 'object',
      properties: {
        assigned_to: {
          type: 'string',
          description: 'Filter by assigned user ID (use "me" for current user)',
        },
        overdue_only: {
          type: 'boolean',
          description: 'Only show overdue tasks',
        },
        contact_id: {
          type: 'string',
          description: 'Filter by contact',
        },
        project_id: {
          type: 'string',
          description: 'Filter by project',
        },
      },
    },
  },
  execute: async (args, context) => {
    const { assigned_to, overdue_only, contact_id, project_id } = args as {
      assigned_to?: string
      overdue_only?: boolean
      contact_id?: string
      project_id?: string
    }

    let query = context.supabase
      .from('activities')
      .select(
        `
        id,
        subject,
        content,
        scheduled_at,
        contact_id,
        project_id,
        created_at,
        contact:contacts!contact_id(first_name, last_name),
        project:projects!project_id(name)
      `
      )
      .eq('tenant_id', context.tenantId)
      .eq('type', 'task')
      .order('scheduled_at', { ascending: true, nullsFirst: false })

    if (contact_id) {
      query = query.eq('contact_id', contact_id)
    }
    if (project_id) {
      query = query.eq('project_id', project_id)
    }

    const { data: tasks, error } = await query.limit(20)

    if (error) {
      return { success: false, error: error.message }
    }

    // Filter for pending tasks (status in content JSON)
    const now = new Date()
    interface TaskWithRelations {
      id: string
      subject: string
      content: string | null
      scheduled_at: string | null
      contact_id: string | null
      project_id: string | null
      created_at: string
      contact: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null
      project: { name: string } | { name: string }[] | null
    }

    const pendingTasks = (tasks as TaskWithRelations[])?.filter((task) => {
      try {
        const desc = task.content ? JSON.parse(task.content) : {}
        if (desc.status === 'completed') return false

        // Filter by assignee
        if (assigned_to) {
          const assigneeId = assigned_to === 'me' ? context.userId : assigned_to
          if (desc.assigned_to !== assigneeId) return false
        }

        // Filter overdue only
        if (overdue_only && task.scheduled_at) {
          const dueDate = new Date(task.scheduled_at)
          if (dueDate >= now) return false
        }

        return true
      } catch {
        return true // Include tasks with non-JSON content
      }
    })

    if (!pendingTasks?.length) {
      return {
        success: true,
        data: [],
        message: overdue_only ? 'No overdue tasks found.' : 'No pending tasks found.',
      }
    }

    // Format response
    const formatted = pendingTasks.map((task) => {
      const contactData = Array.isArray(task.contact) ? task.contact[0] : task.contact
      const projectData = Array.isArray(task.project) ? task.project[0] : task.project
      const dueDate = task.scheduled_at ? new Date(task.scheduled_at) : null
      const isOverdue = dueDate && dueDate < now

      let desc
      try {
        desc = task.content ? JSON.parse(task.content) : {}
      } catch {
        desc = {}
      }

      return {
        id: task.id,
        title: task.subject,
        priority: desc.priority || 'medium',
        due_date: dueDate?.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        is_overdue: isOverdue,
        contact: contactData
          ? `${contactData.first_name} ${contactData.last_name}`.trim()
          : null,
        project: projectData?.name || null,
      }
    })

    const overdueCount = formatted.filter((t) => t.is_overdue).length

    return {
      success: true,
      data: formatted,
      message: `Found ${formatted.length} pending task(s)${
        overdueCount > 0 ? ` (${overdueCount} overdue)` : ''
      }.`,
    }
  },
})

ariaFunctionRegistry.register({
  name: 'complete_task',
  category: 'actions',
  description: 'Mark a task as completed',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'complete_task',
    description: 'Mark a task as completed. Use after a task has been done.',
    parameters: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'ID of the task to complete',
        },
        notes: {
          type: 'string',
          description: 'Completion notes',
        },
      },
      required: ['task_id'],
    },
  },
  execute: async (args, context) => {
    const { task_id, notes } = args as { task_id: string; notes?: string }

    // Get current task
    const { data: task, error: fetchError } = await context.supabase
      .from('activities')
      .select('subject, content')
      .eq('id', task_id)
      .eq('tenant_id', context.tenantId)
      .eq('type', 'task')
      .single()

    if (fetchError || !task) {
      return { success: false, error: 'Task not found' }
    }

    // Update content to mark as completed
    let desc
    try {
      desc = task.content ? JSON.parse(task.content) : {}
    } catch {
      desc = {}
    }

    desc.status = 'completed'
    desc.completed_at = new Date().toISOString()
    desc.completed_by = context.userId
    if (notes) desc.completion_notes = notes

    const { error: updateError } = await context.supabase
      .from('activities')
      .update({ content: JSON.stringify(desc) })
      .eq('id', task_id)
      .eq('tenant_id', context.tenantId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return {
      success: true,
      message: `Task "${task.subject}" marked as completed.`,
    }
  },
})

// =============================================================================
// Location-Based Search
// =============================================================================

ariaFunctionRegistry.register({
  name: 'search_by_address',
  category: 'crm',
  description: 'Search contacts and projects by address or city',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'search_by_address',
    description:
      'Search for contacts and projects by address, city, or zip code. Useful for finding customers in a specific area.',
    parameters: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: 'City name to search',
        },
        zip: {
          type: 'string',
          description: 'ZIP code to search',
        },
        street: {
          type: 'string',
          description: 'Street name or partial address',
        },
      },
    },
  },
  execute: async (args, context) => {
    const { city, zip, street } = args as {
      city?: string
      zip?: string
      street?: string
    }

    if (!city && !zip && !street) {
      return {
        success: false,
        error: 'Please provide at least one search criteria: city, zip, or street',
      }
    }

    let query = context.supabase
      .from('contacts')
      .select(
        `
        id,
        first_name,
        last_name,
        phone,
        address_street,
        address_city,
        address_state,
        address_zip,
        projects!contact_id(id, name, status, pipeline_stage)
      `
      )
      .eq('tenant_id', context.tenantId)

    if (city) {
      query = query.ilike('address_city', `%${city}%`)
    }
    if (zip) {
      query = query.eq('address_zip', zip)
    }
    if (street) {
      query = query.ilike('address_street', `%${street}%`)
    }

    const { data: contacts, error } = await query.limit(20)

    if (error) {
      return { success: false, error: error.message }
    }

    if (!contacts?.length) {
      const criteria = [city && `city "${city}"`, zip && `ZIP ${zip}`, street && `"${street}"`]
        .filter(Boolean)
        .join(', ')
      return {
        success: true,
        data: [],
        message: `No contacts found matching ${criteria}.`,
      }
    }

    interface ContactWithProjects {
      id: string
      first_name: string
      last_name: string
      phone: string | null
      address_street: string | null
      address_city: string | null
      address_state: string | null
      address_zip: string | null
      projects: Array<{
        id: string
        name: string
        status: string | null
        pipeline_stage: string | null
      }> | null
    }

    const formatted = (contacts as ContactWithProjects[]).map((c) => ({
      id: c.id,
      name: `${c.first_name} ${c.last_name}`.trim(),
      phone: c.phone,
      address: [c.address_street, c.address_city, c.address_state, c.address_zip]
        .filter(Boolean)
        .join(', '),
      project_count: c.projects?.length || 0,
      has_active_project: c.projects?.some(
        (p) => p.status === 'active' || !['won', 'lost', 'completed'].includes(p.pipeline_stage || '')
      ),
    }))

    return {
      success: true,
      data: formatted,
      message: `Found ${contacts.length} contact(s) in the specified area.`,
    }
  },
})

// =============================================================================
// Phone Lookup and Call Logging
// =============================================================================

ariaFunctionRegistry.register({
  name: 'search_by_phone',
  category: 'crm',
  description: 'Find a contact by phone number',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'search_by_phone',
    description:
      'Find a contact by their phone number. Useful when someone calls and you need to look them up. Handles various phone formats.',
    parameters: {
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          description: 'Phone number to search (any format)',
        },
      },
      required: ['phone'],
    },
  },
  execute: async (args, context) => {
    const { phone } = args as { phone: string }

    // Normalize phone number - remove all non-digits
    const normalized = phone.replace(/\D/g, '')
    const last10 = normalized.slice(-10) // Get last 10 digits

    // Search with various patterns
    const { data: contacts, error } = await context.supabase
      .from('contacts')
      .select(
        `
        id,
        first_name,
        last_name,
        phone,
        email,
        address_city,
        address_state,
        stage,
        projects!contact_id(id, name, pipeline_stage, status)
      `
      )
      .eq('tenant_id', context.tenantId)
      .or(`phone.ilike.%${last10}%,phone.ilike.%${normalized}%`)
      .limit(5)

    if (error) {
      return { success: false, error: error.message }
    }

    if (!contacts?.length) {
      return {
        success: true,
        data: null,
        message: `No contact found with phone number "${phone}". Would you like me to create a new contact?`,
      }
    }

    interface ContactWithProjects {
      id: string
      first_name: string
      last_name: string
      phone: string | null
      email: string | null
      address_city: string | null
      address_state: string | null
      stage: string | null
      projects: Array<{
        id: string
        name: string
        pipeline_stage: string | null
        status: string | null
      }> | null
    }

    const formatted = (contacts as ContactWithProjects[]).map((c) => ({
      id: c.id,
      name: `${c.first_name} ${c.last_name}`.trim(),
      phone: c.phone,
      email: c.email,
      location: [c.address_city, c.address_state].filter(Boolean).join(', '),
      stage: c.stage,
      active_projects: c.projects?.filter(
        (p) => !['won', 'lost', 'completed'].includes(p.pipeline_stage || '')
      ).length || 0,
    }))

    if (formatted.length === 1) {
      const c = formatted[0]
      return {
        success: true,
        data: formatted[0],
        message: `Found: ${c.name}${c.location ? ` (${c.location})` : ''}${
          c.active_projects ? ` - ${c.active_projects} active project(s)` : ''
        }`,
      }
    }

    return {
      success: true,
      data: formatted,
      message: `Found ${formatted.length} contacts matching that phone number.`,
    }
  },
})

ariaFunctionRegistry.register({
  name: 'log_phone_call',
  category: 'crm',
  description: 'Log a phone call with a contact',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'log_phone_call',
    description:
      'Log a phone call with a contact. Records call direction, duration, and notes. Use after completing a call.',
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'ID of the contact called',
        },
        direction: {
          type: 'string',
          enum: ['inbound', 'outbound'],
          description: 'Whether the call was inbound or outbound',
        },
        duration_minutes: {
          type: 'number',
          description: 'Call duration in minutes (approximate)',
        },
        notes: {
          type: 'string',
          description: 'Notes about the call - what was discussed',
        },
        outcome: {
          type: 'string',
          enum: ['answered', 'voicemail', 'no_answer', 'busy', 'wrong_number'],
          description: 'Call outcome',
        },
        follow_up_needed: {
          type: 'boolean',
          description: 'Whether a follow-up is needed',
        },
        follow_up_date: {
          type: 'string',
          description: 'When to follow up (if needed)',
        },
      },
      required: ['contact_id'],
    },
  },
  execute: async (args, context) => {
    const {
      contact_id,
      direction,
      duration_minutes,
      notes,
      outcome,
      follow_up_needed,
      follow_up_date,
    } = args as {
      contact_id: string
      direction?: 'inbound' | 'outbound'
      duration_minutes?: number
      notes?: string
      outcome?: string
      follow_up_needed?: boolean
      follow_up_date?: string
    }

    // Verify contact exists
    const { data: contact, error: contactError } = await context.supabase
      .from('contacts')
      .select('first_name, last_name')
      .eq('id', contact_id)
      .eq('tenant_id', context.tenantId)
      .single()

    if (contactError || !contact) {
      return { success: false, error: 'Contact not found' }
    }

    // Log the call as an activity
    const { data, error } = await context.supabase
      .from('activities')
      .insert({
        tenant_id: context.tenantId,
        contact_id,
        type: 'call',
        subject: `Phone call (${direction || 'call'})${outcome ? ` - ${outcome}` : ''}`,
        content: JSON.stringify({
          direction: direction || 'unknown',
          duration_minutes,
          outcome: outcome || 'answered',
          notes,
          follow_up_needed,
          follow_up_date,
        }),
        created_by: context.userId,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Create follow-up task if needed
    if (follow_up_needed && follow_up_date) {
      const parsedDate = new Date(follow_up_date)
      if (!isNaN(parsedDate.getTime())) {
        await context.supabase.from('activities').insert({
          tenant_id: context.tenantId,
          contact_id,
          type: 'task',
          subject: `Follow up with ${contact.first_name} ${contact.last_name}`,
          content: JSON.stringify({
            priority: 'medium',
            assigned_to: context.userId,
            status: 'pending',
            related_call_id: data.id,
          }),
          scheduled_at: parsedDate.toISOString(),
          created_by: context.userId,
        })
      }
    }

    const contactName = `${contact.first_name} ${contact.last_name}`.trim()
    return {
      success: true,
      data,
      message: `Call logged for ${contactName}${
        follow_up_needed ? ` (follow-up scheduled)` : ''
      }.`,
    }
  },
})

// =============================================================================
// Contact Timeline and Recent Activity
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_contact_timeline',
  category: 'crm',
  description: 'Get complete history/timeline for a contact',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_contact_timeline',
    description:
      'Get the complete timeline of interactions with a contact - calls, notes, emails, appointments, project updates. Shows full history.',
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'ID of the contact',
        },
        limit: {
          type: 'number',
          description: 'Max number of events to return (default 20)',
        },
      },
      required: ['contact_id'],
    },
  },
  execute: async (args, context) => {
    const { contact_id, limit = 20 } = args as { contact_id: string; limit?: number }

    // Get contact info
    const { data: contact, error: contactError } = await context.supabase
      .from('contacts')
      .select('first_name, last_name, created_at')
      .eq('id', contact_id)
      .eq('tenant_id', context.tenantId)
      .single()

    if (contactError || !contact) {
      return { success: false, error: 'Contact not found' }
    }

    // Get all activities for this contact
    const { data: activities, error } = await context.supabase
      .from('activities')
      .select(
        `
        id,
        type,
        subject,
        content,
        created_at,
        scheduled_at,
        project:projects!project_id(name)
      `
      )
      .eq('tenant_id', context.tenantId)
      .eq('contact_id', contact_id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return { success: false, error: error.message }
    }

    const typeLabels: Record<string, string> = {
      call: 'Phone Call',
      note: 'Note',
      email: 'Email',
      task: 'Task',
      meeting: 'Meeting',
      appointment: 'Appointment',
      stage_change: 'Stage Change',
    }

    interface ActivityWithProject {
      id: string
      type: string
      subject: string
      content: string | null
      created_at: string
      scheduled_at: string | null
      project: { name: string } | { name: string }[] | null
    }

    const timeline = (activities as ActivityWithProject[])?.map((a) => {
      const projectData = Array.isArray(a.project) ? a.project[0] : a.project
      let details = ''
      try {
        const desc = a.content ? JSON.parse(a.content) : {}
        if (desc.notes) details = desc.notes
        if (desc.outcome) details = `${desc.outcome}${details ? ': ' + details : ''}`
      } catch {
        details = a.content || ''
      }

      return {
        id: a.id,
        type: typeLabels[a.type] || a.type,
        title: a.subject,
        details: details.substring(0, 100) + (details.length > 100 ? '...' : ''),
        date: new Date(a.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
        project: projectData?.name || null,
      }
    }) || []

    const contactName = `${contact.first_name} ${contact.last_name}`.trim()
    const createdDate = new Date(contact.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

    return {
      success: true,
      data: {
        contact_name: contactName,
        contact_since: createdDate,
        events: timeline,
      },
      message: `Timeline for ${contactName}: ${timeline.length} event(s) recorded since ${createdDate}.`,
    }
  },
})

ariaFunctionRegistry.register({
  name: 'get_recent_activity',
  category: 'crm',
  description: 'Get recent activity across all contacts and projects',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_recent_activity',
    description:
      'Get recent activity across the entire CRM - calls, notes, project updates, etc. Great for seeing what happened today or this week.',
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of days to look back (default 1 = today)',
        },
        type: {
          type: 'string',
          enum: ['call', 'note', 'email', 'task', 'meeting', 'all'],
          description: 'Filter by activity type',
        },
        limit: {
          type: 'number',
          description: 'Max number of activities (default 20)',
        },
      },
    },
  },
  execute: async (args, context) => {
    const { days = 1, type, limit = 20 } = args as {
      days?: number
      type?: string
      limit?: number
    }

    const since = new Date()
    since.setDate(since.getDate() - days)

    let query = context.supabase
      .from('activities')
      .select(
        `
        id,
        type,
        subject,
        content,
        created_at,
        contact:contacts!contact_id(first_name, last_name),
        project:projects!project_id(name)
      `
      )
      .eq('tenant_id', context.tenantId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit)

    if (type && type !== 'all') {
      query = query.eq('type', type)
    }

    const { data: activities, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    if (!activities?.length) {
      const timeframe = days === 1 ? 'today' : `the past ${days} days`
      return {
        success: true,
        data: [],
        message: `No activity recorded ${timeframe}.`,
      }
    }

    const typeEmoji: Record<string, string> = {
      call: 'Phone',
      note: 'Note',
      email: 'Email',
      task: 'Task',
      meeting: 'Meeting',
      appointment: 'Apt',
    }

    interface ActivityWithRelations {
      id: string
      type: string
      subject: string
      content: string | null
      created_at: string
      contact: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null
      project: { name: string } | { name: string }[] | null
    }

    const formatted = (activities as ActivityWithRelations[]).map((a) => {
      const contactData = Array.isArray(a.contact) ? a.contact[0] : a.contact
      const projectData = Array.isArray(a.project) ? a.project[0] : a.project

      return {
        id: a.id,
        type: typeEmoji[a.type] || a.type,
        title: a.subject,
        contact: contactData
          ? `${contactData.first_name} ${contactData.last_name}`.trim()
          : null,
        project: projectData?.name || null,
        time: new Date(a.created_at).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
        date: new Date(a.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      }
    })

    const timeframe = days === 1 ? 'today' : `the past ${days} days`
    const typeSummary: Record<string, number> = {}
    activities.forEach((a) => {
      typeSummary[a.type] = (typeSummary[a.type] || 0) + 1
    })

    const summaryParts = Object.entries(typeSummary)
      .map(([t, count]) => `${count} ${t}${count > 1 ? 's' : ''}`)
      .join(', ')

    return {
      success: true,
      data: formatted,
      message: `Activity ${timeframe}: ${summaryParts}.`,
    }
  },
})

// =============================================================================
// Export registry
// =============================================================================

export default ariaFunctionRegistry

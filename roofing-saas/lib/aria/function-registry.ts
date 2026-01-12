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
      description: content,
      created_by: context.userId,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, message: 'Note added successfully' }
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
      .select('*, contacts(first_name, last_name)')
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
      description: `Pipeline stage changed to ${new_stage}`,
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
      description: notes ? `Project WON! ${notes}` : 'Project marked as WON!',
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
      description: reason ? `Project LOST: ${reason}` : 'Project marked as LOST',
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
        id, type, description, created_at, due_date, metadata,
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
      return `${date} [${a.type}]: ${a.description?.substring(0, 50)}...`
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
        id, type, description, due_date, metadata,
        contact:contact_id (first_name, last_name),
        project:project_id (name)
      `)
      .eq('tenant_id', context.tenantId)
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true })

    if (include_overdue) {
      // Get items due today or overdue
      query = query.lt('due_date', tomorrow.toISOString())
    } else {
      // Only today's items
      query = query.gte('due_date', today.toISOString()).lt('due_date', tomorrow.toISOString())
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
    const overdue = data.filter((a) => new Date(a.due_date) < today)
    const todayItems = data.filter((a) => new Date(a.due_date) >= today)

    let message = ''
    if (overdue.length > 0) {
      message += `⚠️ ${overdue.length} overdue item(s)\n`
    }
    message += `📅 ${todayItems.length} item(s) due today\n\n`

    const formatItem = (a: typeof data[0]) => {
      const contactData = Array.isArray(a.contact) ? a.contact[0] : a.contact
      const projectData = Array.isArray(a.project) ? a.project[0] : a.project
      const who = contactData ? `${contactData.first_name} ${contactData.last_name}` : projectData?.name || ''
      return `• [${a.type}] ${a.description?.substring(0, 40)}${who ? ` - ${who}` : ''}`
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
        description: title,
        due_date: appointmentDate.toISOString(),
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
// Export registry
// =============================================================================

export default ariaFunctionRegistry

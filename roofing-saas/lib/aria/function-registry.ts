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

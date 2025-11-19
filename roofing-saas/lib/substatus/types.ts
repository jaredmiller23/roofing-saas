/**
 * Type definitions for Substatus System
 *
 * Provides granular status tracking with dependent substatus values
 * Example: Contact stage "qualified" → substatuses like "budget_approved", "decision_maker_identified"
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export type EntityType = 'contacts' | 'projects' | 'activities'

export interface SubstatusConfig {
  id: string
  tenant_id: string

  // Which entity and status field
  entity_type: EntityType
  status_field_name: string // 'stage' for contacts, 'status' for projects
  status_value: string // Parent status (e.g., 'qualified', 'in_progress')

  // Substatus definition
  substatus_value: string // Code (e.g., 'budget_approved')
  substatus_label: string // Display label (e.g., 'Budget Approved')
  substatus_description?: string | null

  // Display settings
  display_order: number
  color?: string | null // Badge color
  icon?: string | null // Icon name

  // Behavior
  is_active: boolean
  is_default: boolean // Auto-select when status changes
  is_terminal: boolean // Can't change after setting

  // Workflow automation
  auto_transition_to?: string | null
  auto_transition_delay_hours?: number | null

  // Metadata
  created_by?: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

// GET /api/substatus/configs
export interface GetSubstatusConfigsRequest {
  entity_type: EntityType
  status_value?: string // Optional: only get configs for specific status
}

export interface GetSubstatusConfigsResponse {
  configs: SubstatusConfig[]
  total: number
}

// POST /api/substatus/configs
export interface CreateSubstatusConfigRequest {
  entity_type: EntityType
  status_field_name: string
  status_value: string
  substatus_value: string
  substatus_label: string
  substatus_description?: string
  display_order?: number
  color?: string
  icon?: string
  is_default?: boolean
  is_terminal?: boolean
  auto_transition_to?: string
  auto_transition_delay_hours?: number
}

export interface CreateSubstatusConfigResponse {
  config: SubstatusConfig
}

// PATCH /api/substatus/configs/:id
export interface UpdateSubstatusConfigRequest {
  substatus_label?: string
  substatus_description?: string
  display_order?: number
  color?: string
  icon?: string
  is_active?: boolean
  is_default?: boolean
  is_terminal?: boolean
  auto_transition_to?: string
  auto_transition_delay_hours?: number
}

export interface UpdateSubstatusConfigResponse {
  config: SubstatusConfig
}

// ============================================================================
// UI COMPONENT TYPES
// ============================================================================

/**
 * Props for substatus selector component
 */
export interface SubstatusSelectorProps {
  entity_type: EntityType
  status_value: string // Current status (determines available substatuses)
  current_substatus?: string | null
  onChange: (substatus: string | null) => void
  disabled?: boolean
  placeholder?: string
}

/**
 * Props for substatus badge component
 */
export interface SubstatusBadgeProps {
  substatus_value?: string | null
  substatus_label: string
  color?: string
  size?: 'sm' | 'md' | 'lg'
  icon?: string
  showIcon?: boolean
}

/**
 * Props for substatus config manager (admin)
 */
export interface SubstatusConfigManagerProps {
  entity_type: EntityType
  status_values: string[] // All possible status values for this entity
  onConfigChange?: () => void
}

/**
 * Grouped substatuses by parent status
 */
export interface GroupedSubstatusConfigs {
  [status_value: string]: SubstatusConfig[]
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Helper type for substatus validation
 */
export interface SubstatusValidationResult {
  is_valid: boolean
  error?: string
  config?: SubstatusConfig
}

/**
 * Helper type for substatus change events
 */
export interface SubstatusChangeEvent {
  entity_type: EntityType
  entity_id: string
  old_status: string
  new_status: string
  old_substatus?: string | null
  new_substatus?: string | null
  changed_by: string
  changed_at: string
}

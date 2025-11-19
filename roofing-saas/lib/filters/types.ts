/**
 * Type definitions for Configurable Filters System
 *
 * Supports admin-configurable filters with saved presets for contacts,
 * projects, pipeline, and activities.
 */

// ============================================================================
// FILTER FIELD TYPES
// ============================================================================

export type FilterFieldType =
  | 'text'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'date_range'
  | 'number'
  | 'number_range'
  | 'boolean'
  | 'user_select'
  | 'tag_select'

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'in'
  | 'not_in'
  | 'between'
  | 'is_null'
  | 'is_not_null'

export type EntityType = 'contacts' | 'projects' | 'pipeline' | 'activities'

// ============================================================================
// FILTER CONFIG
// ============================================================================

export interface FilterOption {
  value: string
  label: string
  color?: string // For badge/pill colors
  icon?: string // Optional icon name
}

export interface FilterConfig {
  id: string
  tenant_id: string
  entity_type: EntityType

  // Field definition
  field_name: string // Database column name
  field_label: string // UI display label
  field_type: FilterFieldType
  filter_operator: FilterOperator

  // Options (for select/multi-select)
  filter_options: FilterOption[]

  // Display settings
  display_order: number
  is_quick_filter: boolean // Show in quick filters bar
  is_advanced_filter: boolean // Show in advanced panel
  is_active: boolean

  // Custom field integration
  custom_field_id?: string | null

  // Metadata
  created_by?: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// SAVED FILTERS
// ============================================================================

export interface FilterCriterion {
  operator: FilterOperator
  value: unknown // Can be string, number, array, date, etc.
}

export interface FilterCriteria {
  [field_name: string]: FilterCriterion
}

export interface SavedFilter {
  id: string
  tenant_id: string
  entity_type: EntityType

  // Filter identification
  name: string
  description?: string | null

  // The actual filter values
  filter_criteria: FilterCriteria

  // Sharing
  created_by: string
  is_shared: boolean
  is_default: boolean
  is_system: boolean

  // Usage tracking
  usage_count: number
  last_used_at?: string | null

  // Metadata
  created_at: string
  updated_at: string
}

// ============================================================================
// FILTER USAGE LOGS
// ============================================================================

export interface FilterUsageLog {
  id: string
  tenant_id: string
  user_id: string
  entity_type: EntityType
  filter_field: string

  // References
  filter_config_id?: string | null
  saved_filter_id?: string | null

  // Applied filter
  filter_value: unknown

  // Results
  results_count?: number | null

  // When
  used_at: string
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

// GET /api/filters/configs
export interface GetFilterConfigsRequest {
  entity_type: EntityType
}

export interface GetFilterConfigsResponse {
  configs: FilterConfig[]
  total: number
}

// POST /api/filters/configs
export interface CreateFilterConfigRequest {
  entity_type: EntityType
  field_name: string
  field_label: string
  field_type: FilterFieldType
  filter_operator: FilterOperator
  filter_options?: FilterOption[]
  is_quick_filter?: boolean
  is_advanced_filter?: boolean
  display_order?: number
}

export interface CreateFilterConfigResponse {
  config: FilterConfig
}

// PATCH /api/filters/configs/:id
export interface UpdateFilterConfigRequest {
  field_label?: string
  field_type?: FilterFieldType
  filter_operator?: FilterOperator
  filter_options?: FilterOption[]
  is_quick_filter?: boolean
  is_advanced_filter?: boolean
  is_active?: boolean
  display_order?: number
}

export interface UpdateFilterConfigResponse {
  config: FilterConfig
}

// GET /api/filters/saved
export interface GetSavedFiltersRequest {
  entity_type: EntityType
  include_shared?: boolean
}

export interface GetSavedFiltersResponse {
  filters: SavedFilter[]
  total: number
}

// POST /api/filters/saved
export interface CreateSavedFilterRequest {
  entity_type: EntityType
  name: string
  description?: string
  filter_criteria: FilterCriteria
  is_shared?: boolean
  is_default?: boolean
}

export interface CreateSavedFilterResponse {
  filter: SavedFilter
}

// PATCH /api/filters/saved/:id
export interface UpdateSavedFilterRequest {
  name?: string
  description?: string
  filter_criteria?: FilterCriteria
  is_shared?: boolean
  is_default?: boolean
}

export interface UpdateSavedFilterResponse {
  filter: SavedFilter
}

// POST /api/filters/usage
export interface LogFilterUsageRequest {
  entity_type: EntityType
  filter_field: string
  filter_config_id?: string
  saved_filter_id?: string
  filter_value: unknown
  results_count?: number
}

export interface LogFilterUsageResponse {
  success: boolean
  log_id: string
}

// GET /api/filters/analytics
export interface GetFilterAnalyticsRequest {
  entity_type?: EntityType
  start_date?: string
  end_date?: string
}

export interface FilterAnalytics {
  most_used_fields: {
    field_name: string
    field_label: string
    usage_count: number
  }[]
  most_used_saved_filters: {
    filter_id: string
    filter_name: string
    usage_count: number
  }[]
  average_results_per_filter: number
  total_filter_uses: number
}

export interface GetFilterAnalyticsResponse {
  analytics: FilterAnalytics
}

// ============================================================================
// UI COMPONENT TYPES
// ============================================================================

/**
 * Active filter state (what user has currently selected)
 */
export interface ActiveFilter {
  field_name: string
  field_label: string
  field_type: FilterFieldType
  operator: FilterOperator
  value: unknown
  display_value?: string // Human-readable display (e.g., "John Doe" instead of UUID)
}

/**
 * Filter state for a page/component
 */
export interface FilterState {
  entity_type: EntityType
  active_filters: ActiveFilter[]
  saved_filter_id?: string | null // If using a saved filter
}

/**
 * Props for filter components
 */
export interface FilterBarProps {
  entity_type: EntityType
  configs: FilterConfig[]
  saved_filters: SavedFilter[]
  active_filters: ActiveFilter[]
  onFilterChange: (filters: ActiveFilter[]) => void
  onSaveFilter: (name: string, description?: string) => Promise<void>
  onLoadFilter: (filter_id: string) => void
  onClearFilters: () => void
}

export interface FilterPillProps {
  filter: ActiveFilter
  onRemove: () => void
  onEdit?: () => void
}

export interface FilterBuilderProps {
  config: FilterConfig
  value?: FilterCriterion
  onChange: (value: FilterCriterion) => void
}

export interface SavedFilterPickerProps {
  entity_type: EntityType
  filters: SavedFilter[]
  selected_id?: string | null
  onSelect: (filter_id: string) => void
  onCreate: () => void
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Helper type for building SQL WHERE clauses from filters
 */
export interface SQLWhereClause {
  clause: string
  params: unknown[]
}

/**
 * Helper type for filter validation
 */
export interface FilterValidationResult {
  is_valid: boolean
  errors: string[]
}

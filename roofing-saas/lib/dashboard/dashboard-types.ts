/**
 * Custom Dashboard Builder Type Definitions
 *
 * Comprehensive type system for building drag-and-drop dashboards
 * with custom widgets, templates, and role-based configurations.
 */

// Core Dashboard Types
export type DashboardStatus = 'active' | 'draft' | 'archived'
export type DashboardVisibility = 'private' | 'team' | 'organization'

export interface Dashboard {
  id: string
  tenant_id: string
  name: string
  description?: string
  status: DashboardStatus
  visibility: DashboardVisibility
  owner_id: string
  role_based: boolean
  target_roles?: string[] // Role IDs this dashboard applies to
  is_default: boolean // Is this the default dashboard for the roles
  is_template: boolean
  template_category?: DashboardTemplateCategory
  layout: DashboardLayout
  widgets: DashboardWidget[]
  settings: DashboardSettings
  created_at: string
  updated_at: string
  created_by: string
  last_modified_by: string
}

// Layout Configuration
export interface DashboardLayout {
  type: 'grid' | 'free' // Grid-based or free positioning
  columns: number // Number of columns in grid (e.g., 12-column grid)
  rowHeight: number // Height of each row in pixels
  gap: number // Gap between widgets in pixels
  responsive: boolean
  breakpoints?: LayoutBreakpoints
}

export interface LayoutBreakpoints {
  lg: number // Large screens (>= 1200px)
  md: number // Medium screens (>= 992px)
  sm: number // Small screens (>= 768px)
  xs: number // Extra small screens (< 768px)
}

// Widget Types
export type WidgetType =
  | 'metric_card'
  | 'chart_bar'
  | 'chart_line'
  | 'chart_pie'
  | 'chart_area'
  | 'chart_scatter'
  | 'list_recent'
  | 'list_top'
  | 'table_data'
  | 'progress_bar'
  | 'progress_ring'
  | 'map_heatmap'
  | 'map_pins'
  | 'calendar_events'
  | 'activity_feed'
  | 'leaderboard'
  | 'revenue_forecast'
  | 'pipeline_funnel'
  | 'team_performance'
  | 'task_summary'
  | 'weather_widget'
  | 'custom_iframe'
  | 'custom_html'

export interface DashboardWidget {
  id: string
  type: WidgetType
  title: string
  description?: string
  position: WidgetPosition
  size: WidgetSize
  config: WidgetConfig
  data_source?: WidgetDataSource
  refresh_interval?: number // Auto-refresh in seconds (0 = no auto-refresh)
  enabled: boolean
  loading_state?: 'idle' | 'loading' | 'error'
  error_message?: string
  last_updated_at?: string
}

export interface WidgetPosition {
  x: number // Column position (0-indexed)
  y: number // Row position (0-indexed)
  z?: number // Z-index for overlapping widgets (free layout)
}

export interface WidgetSize {
  width: number // Number of columns to span
  height: number // Number of rows to span
  min_width?: number
  min_height?: number
  max_width?: number
  max_height?: number
  resizable: boolean
}

// Widget Configuration
export type WidgetConfig =
  | MetricCardConfig
  | ChartConfig
  | ListConfig
  | TableConfig
  | ProgressConfig
  | MapConfig
  | CalendarConfig
  | ActivityFeedConfig
  | LeaderboardConfig
  | ForecastConfig
  | FunnelConfig
  | TeamPerformanceConfig
  | TaskSummaryConfig
  | WeatherConfig
  | CustomConfig

// Metric Card Widget
export interface MetricCardConfig {
  type: 'metric_card'
  metric: string // Field to display (e.g., "total_revenue", "lead_count")
  format: 'number' | 'currency' | 'percentage' | 'duration'
  prefix?: string
  suffix?: string
  trend?: {
    enabled: boolean
    comparison_period: 'previous_period' | 'previous_week' | 'previous_month' | 'previous_year'
    show_percentage: boolean
    show_arrow: boolean
  }
  icon?: string
  color?: string
  goal?: {
    enabled: boolean
    target: number
    show_progress: boolean
  }
}

// Chart Widget
export interface ChartConfig {
  type: 'chart_bar' | 'chart_line' | 'chart_pie' | 'chart_area' | 'chart_scatter'
  x_axis: ChartAxis
  y_axis: ChartAxis
  series: ChartSeries[]
  legend: {
    enabled: boolean
    position: 'top' | 'bottom' | 'left' | 'right'
  }
  tooltip: {
    enabled: boolean
    format?: string
  }
  colors?: string[]
  stacked?: boolean // For bar/area charts
  smooth?: boolean // For line/area charts
}

export interface ChartAxis {
  field: string
  label?: string
  format?: string
  scale?: 'linear' | 'log' | 'time'
}

export interface ChartSeries {
  id: string
  name: string
  field: string
  color?: string
  type?: 'bar' | 'line' | 'area' // For mixed charts
}

// List Widget
export interface ListConfig {
  type: 'list_recent' | 'list_top'
  entity: 'contacts' | 'projects' | 'tasks' | 'calls' | 'jobs'
  fields: ListField[]
  limit: number
  sort_by: string
  sort_order: 'asc' | 'desc'
  filters?: WidgetFilter[]
  show_avatars?: boolean
  show_timestamps?: boolean
  click_action?: 'view' | 'edit' | 'custom'
}

export interface ListField {
  field: string
  label?: string
  format?: string
  width?: string // CSS width value
}

// Table Widget
export interface TableConfig {
  type: 'table_data'
  entity: 'contacts' | 'projects' | 'tasks' | 'calls' | 'jobs' | 'events'
  columns: TableColumn[]
  pagination: {
    enabled: boolean
    page_size: number
  }
  sorting: {
    enabled: boolean
    default_sort?: string
    default_order?: 'asc' | 'desc'
  }
  filters?: WidgetFilter[]
  search?: {
    enabled: boolean
    fields: string[]
    placeholder?: string
  }
  row_actions?: RowAction[]
}

export interface TableColumn {
  field: string
  header: string
  sortable: boolean
  filterable: boolean
  format?: string
  width?: string
  align?: 'left' | 'center' | 'right'
}

export interface RowAction {
  id: string
  label: string
  icon?: string
  action: 'view' | 'edit' | 'delete' | 'custom'
  custom_handler?: string // Function name for custom actions
}

// Progress Widget
export interface ProgressConfig {
  type: 'progress_bar' | 'progress_ring'
  metric: string
  goal: number
  format: 'number' | 'currency' | 'percentage'
  color?: string
  show_value: boolean
  show_percentage: boolean
  segments?: ProgressSegment[] // For multi-segment progress
}

export interface ProgressSegment {
  id: string
  label: string
  value: number
  color: string
}

// Map Widget
export interface MapConfig {
  type: 'map_heatmap' | 'map_pins'
  entity: 'contacts' | 'projects' | 'jobs' | 'storms'
  location_field: string // Field containing lat/lng
  value_field?: string // For heatmap intensity
  filters?: WidgetFilter[]
  cluster?: boolean // Cluster nearby markers
  popup_fields?: string[] // Fields to show in marker popup
  center?: {
    lat: number
    lng: number
  }
  zoom?: number
}

// Calendar Widget
export interface CalendarConfig {
  type: 'calendar_events'
  view: 'month' | 'week' | 'day' | 'agenda'
  event_sources: CalendarEventSource[]
  show_weekends: boolean
  time_format: '12h' | '24h'
  first_day_of_week: 0 | 1 // 0 = Sunday, 1 = Monday
}

export interface CalendarEventSource {
  id: string
  entity: 'tasks' | 'events' | 'jobs' | 'calls'
  title_field: string
  start_field: string
  end_field?: string
  color?: string
  filters?: WidgetFilter[]
}

// Activity Feed Widget
export interface ActivityFeedConfig {
  type: 'activity_feed'
  activities: ActivityType[]
  limit: number
  group_by_date: boolean
  show_user: boolean
  show_timestamp: boolean
  filters?: WidgetFilter[]
}

export type ActivityType =
  | 'contact_created'
  | 'contact_updated'
  | 'project_created'
  | 'project_status_changed'
  | 'task_created'
  | 'task_completed'
  | 'call_logged'
  | 'email_sent'
  | 'sms_sent'

// Leaderboard Widget
export interface LeaderboardConfig {
  type: 'leaderboard'
  metric: string // What to rank by (e.g., "revenue", "deals_closed")
  entity: 'users' | 'teams' | 'territories'
  period: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all_time'
  limit: number
  show_ranking: boolean
  show_trend: boolean
  show_avatars: boolean
  format: 'number' | 'currency' | 'percentage'
}

// Revenue Forecast Widget
export interface ForecastConfig {
  type: 'revenue_forecast'
  forecast_periods: number // Number of periods to forecast
  period_type: 'day' | 'week' | 'month' | 'quarter'
  confidence_interval: boolean
  actual_vs_forecast: boolean
  historical_periods: number // How many past periods to show
}

// Pipeline Funnel Widget
export interface FunnelConfig {
  type: 'pipeline_funnel'
  stages: string[] // Array of stage names
  metric: 'count' | 'value'
  show_conversion_rates: boolean
  show_drop_off: boolean
  orientation: 'vertical' | 'horizontal'
}

// Team Performance Widget
export interface TeamPerformanceConfig {
  type: 'team_performance'
  metrics: PerformanceMetric[]
  team_field?: string // Field to group by teams
  period: 'today' | 'week' | 'month' | 'quarter' | 'year'
  comparison_enabled: boolean
  comparison_period?: 'previous_period' | 'same_period_last_year'
}

export interface PerformanceMetric {
  id: string
  name: string
  field: string
  format: 'number' | 'currency' | 'percentage'
  goal?: number
}

// Task Summary Widget
export interface TaskSummaryConfig {
  type: 'task_summary'
  group_by: 'status' | 'priority' | 'assigned_to' | 'due_date'
  show_overdue: boolean
  show_completed: boolean
  filters?: WidgetFilter[]
}

// Weather Widget
export interface WeatherConfig {
  type: 'weather_widget'
  location?: {
    lat: number
    lng: number
  }
  use_user_location: boolean
  show_forecast: boolean
  forecast_days: number
  show_storm_tracking: boolean
}

// Custom Widgets
export interface CustomConfig {
  type: 'custom_iframe' | 'custom_html'
  content: string // URL for iframe or HTML content
  sandbox?: string[] // Sandbox attributes for iframe
  allow_scripts?: boolean
  custom_css?: string
}

// Data Source Configuration
export interface WidgetDataSource {
  type: 'query' | 'api' | 'realtime' | 'computed'
  config: DataSourceConfig
  cache_ttl?: number // Cache time-to-live in seconds
}

export type DataSourceConfig =
  | QueryDataSource
  | APIDataSource
  | RealtimeDataSource
  | ComputedDataSource

export interface QueryDataSource {
  type: 'query'
  entity: string
  fields: string[]
  filters?: WidgetFilter[]
  aggregations?: Aggregation[]
  group_by?: string[]
  order_by?: OrderBy[]
  limit?: number
  offset?: number
}

export interface APIDataSource {
  type: 'api'
  endpoint: string
  method: 'GET' | 'POST'
  headers?: Record<string, string>
  body?: Record<string, unknown>
  transform?: string // JavaScript function to transform response
}

export interface RealtimeDataSource {
  type: 'realtime'
  channel: string
  event?: string
  transform?: string
}

export interface ComputedDataSource {
  type: 'computed'
  dependencies: string[] // Widget IDs this widget depends on
  computation: string // JavaScript function to compute value
}

// Filter Types
export interface WidgetFilter {
  field: string
  operator: FilterOperator
  value: unknown
  logic_gate?: 'AND' | 'OR'
}

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'in'
  | 'not_in'
  | 'is_null'
  | 'is_not_null'
  | 'between'

// Aggregation Types
export interface Aggregation {
  field: string
  function: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'count_distinct'
  alias?: string
}

export interface OrderBy {
  field: string
  order: 'asc' | 'desc'
}

// Dashboard Settings
export interface DashboardSettings {
  theme?: 'light' | 'dark' | 'auto'
  auto_refresh?: {
    enabled: boolean
    interval: number // seconds
  }
  date_range?: {
    type: 'relative' | 'absolute'
    relative?: RelativeDateRange
    absolute?: AbsoluteDateRange
  }
  filters?: GlobalFilter[]
  variables?: DashboardVariable[]
  export_enabled: boolean
  share_enabled: boolean
}

export type RelativeDateRange =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_week'
  | 'this_month'
  | 'this_quarter'
  | 'this_year'
  | 'last_week'
  | 'last_month'
  | 'last_quarter'
  | 'last_year'

export interface AbsoluteDateRange {
  start: string // ISO date string
  end: string // ISO date string
}

export interface GlobalFilter {
  id: string
  label: string
  field: string
  type: 'select' | 'multiselect' | 'date' | 'text' | 'number'
  options?: FilterOption[]
  default_value?: unknown
  required: boolean
}

export interface FilterOption {
  label: string
  value: unknown
}

export interface DashboardVariable {
  id: string
  name: string
  type: 'string' | 'number' | 'boolean' | 'date'
  value: unknown
  description?: string
}

// Template Types
export type DashboardTemplateCategory =
  | 'sales'
  | 'operations'
  | 'marketing'
  | 'executive'
  | 'team_lead'
  | 'field_rep'
  | 'customer_service'
  | 'finance'

export interface DashboardTemplate {
  id: string
  name: string
  description: string
  category: DashboardTemplateCategory
  preview_image?: string
  tags: string[]
  target_roles?: string[]
  layout: DashboardLayout
  widgets: DashboardWidget[]
  settings: DashboardSettings
  is_official: boolean // Provided by system vs user-created
  usage_count: number
  rating?: number
  created_at: string
  created_by: string
}

// Widget Registry
export interface WidgetDefinition {
  type: WidgetType
  name: string
  description: string
  icon: string
  category: WidgetCategory
  default_size: WidgetSize
  default_config: WidgetConfig
  supports_realtime: boolean
  supports_export: boolean
  config_schema: unknown // JSON Schema for validation
  preview_component?: string // React component name
}

export type WidgetCategory =
  | 'metrics'
  | 'charts'
  | 'lists'
  | 'maps'
  | 'calendar'
  | 'activity'
  | 'performance'
  | 'custom'

// API Types
export interface CreateDashboardInput {
  name: string
  description?: string
  visibility: DashboardVisibility
  role_based: boolean
  target_roles?: string[]
  is_default?: boolean
  layout: DashboardLayout
  widgets?: DashboardWidget[]
  settings?: Partial<DashboardSettings>
}

export interface UpdateDashboardInput extends Partial<CreateDashboardInput> {
  id: string
}

export interface DashboardFilters {
  status?: DashboardStatus[]
  visibility?: DashboardVisibility[]
  is_template?: boolean
  template_category?: DashboardTemplateCategory
  role_id?: string
  search?: string
  page?: number
  limit?: number
}

export interface DashboardListResponse {
  dashboards: Dashboard[]
  total: number
  page: number
  limit: number
  has_more: boolean
}

// Widget Data Response
export interface WidgetDataResponse {
  widget_id: string
  data: unknown
  metadata?: {
    total_count?: number
    last_updated?: string
    next_refresh?: string
  }
  error?: {
    code: string
    message: string
  }
}

// Drag and Drop Types
export interface DragItem {
  type: 'widget' | 'new_widget'
  widget?: DashboardWidget
  widget_type?: WidgetType
}

export interface DropResult {
  position: WidgetPosition
  size: WidgetSize
}

// Permission Types
export interface DashboardPermissions {
  can_view: boolean
  can_edit: boolean
  can_delete: boolean
  can_share: boolean
  can_export: boolean
  can_create_template: boolean
}

// Export Types
export type ExportFormat = 'pdf' | 'png' | 'csv' | 'json'

export interface ExportOptions {
  format: ExportFormat
  include_data: boolean
  include_filters: boolean
  page_size?: 'letter' | 'a4' | 'legal'
  orientation?: 'portrait' | 'landscape'
}

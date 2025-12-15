/**
 * Widget Registry
 *
 * Central registry for all available dashboard widgets.
 * Manages widget definitions, validation, and discovery.
 */

import type {
  WidgetDefinition,
  WidgetType,
  WidgetCategory,
  WidgetConfig,
  WidgetSize,
} from './dashboard-types'

// Widget Registry Storage
const widgetRegistry = new Map<WidgetType, WidgetDefinition>()

/**
 * Register a new widget type
 */
export function registerWidget(definition: WidgetDefinition): void {
  if (widgetRegistry.has(definition.type)) {
    console.warn(`Widget type "${definition.type}" is already registered. Overwriting...`)
  }
  widgetRegistry.set(definition.type, definition)
}

/**
 * Get a widget definition by type
 */
export function getWidgetDefinition(type: WidgetType): WidgetDefinition | undefined {
  return widgetRegistry.get(type)
}

/**
 * Get all registered widgets
 */
export function getAllWidgets(): WidgetDefinition[] {
  return Array.from(widgetRegistry.values())
}

/**
 * Get widgets by category
 */
export function getWidgetsByCategory(category: WidgetCategory): WidgetDefinition[] {
  return Array.from(widgetRegistry.values()).filter((w) => w.category === category)
}

/**
 * Search widgets by name or description
 */
export function searchWidgets(query: string): WidgetDefinition[] {
  const lowerQuery = query.toLowerCase()
  return Array.from(widgetRegistry.values()).filter(
    (w) =>
      w.name.toLowerCase().includes(lowerQuery) ||
      w.description.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Check if a widget type is registered
 */
export function isWidgetRegistered(type: WidgetType): boolean {
  return widgetRegistry.has(type)
}

/**
 * Unregister a widget type (primarily for testing)
 */
export function unregisterWidget(type: WidgetType): boolean {
  return widgetRegistry.delete(type)
}

/**
 * Clear all registered widgets (primarily for testing)
 */
export function clearRegistry(): void {
  widgetRegistry.clear()
}

// Default Widget Definitions
// These are the built-in widgets available in the system

registerWidget({
  type: 'metric_card',
  name: 'Metric Card',
  description: 'Display a single key metric with optional trend and goal tracking',
  icon: 'Activity',
  category: 'metrics',
  default_size: {
    width: 3,
    height: 2,
    min_width: 2,
    min_height: 2,
    max_width: 6,
    max_height: 3,
    resizable: true,
  },
  default_config: {
    type: 'metric_card',
    metric: 'total_revenue',
    format: 'currency',
    trend: {
      enabled: true,
      comparison_period: 'previous_month',
      show_percentage: true,
      show_arrow: true,
    },
  } as WidgetConfig,
  supports_realtime: true,
  supports_export: true,
  config_schema: {}, // TODO: Add JSON Schema
})

registerWidget({
  type: 'chart_bar',
  name: 'Bar Chart',
  description: 'Visualize data using vertical or horizontal bars',
  icon: 'BarChart3',
  category: 'charts',
  default_size: {
    width: 6,
    height: 4,
    min_width: 4,
    min_height: 3,
    max_width: 12,
    max_height: 8,
    resizable: true,
  },
  default_config: {
    type: 'chart_bar',
    x_axis: { field: 'month', label: 'Month' },
    y_axis: { field: 'value', label: 'Value' },
    series: [
      {
        id: 'series1',
        name: 'Series 1',
        field: 'value',
      },
    ],
    legend: { enabled: true, position: 'bottom' },
    tooltip: { enabled: true },
    stacked: false,
  } as WidgetConfig,
  supports_realtime: true,
  supports_export: true,
  config_schema: {},
})

registerWidget({
  type: 'chart_line',
  name: 'Line Chart',
  description: 'Display trends over time with line graphs',
  icon: 'TrendingUp',
  category: 'charts',
  default_size: {
    width: 6,
    height: 4,
    min_width: 4,
    min_height: 3,
    max_width: 12,
    max_height: 8,
    resizable: true,
  },
  default_config: {
    type: 'chart_line',
    x_axis: { field: 'date', label: 'Date', scale: 'time' },
    y_axis: { field: 'value', label: 'Value' },
    series: [
      {
        id: 'series1',
        name: 'Series 1',
        field: 'value',
      },
    ],
    legend: { enabled: true, position: 'bottom' },
    tooltip: { enabled: true },
    smooth: true,
  } as WidgetConfig,
  supports_realtime: true,
  supports_export: true,
  config_schema: {},
})

registerWidget({
  type: 'chart_pie',
  name: 'Pie Chart',
  description: 'Show proportional data with pie or donut charts',
  icon: 'PieChart',
  category: 'charts',
  default_size: {
    width: 4,
    height: 4,
    min_width: 3,
    min_height: 3,
    max_width: 6,
    max_height: 6,
    resizable: true,
  },
  default_config: {
    type: 'chart_pie',
    x_axis: { field: 'category', label: 'Category' },
    y_axis: { field: 'value', label: 'Value' },
    series: [
      {
        id: 'series1',
        name: 'Distribution',
        field: 'value',
      },
    ],
    legend: { enabled: true, position: 'right' },
    tooltip: { enabled: true },
  } as WidgetConfig,
  supports_realtime: true,
  supports_export: true,
  config_schema: {},
})

registerWidget({
  type: 'chart_area',
  name: 'Area Chart',
  description: 'Display cumulative data over time with filled areas',
  icon: 'AreaChart',
  category: 'charts',
  default_size: {
    width: 6,
    height: 4,
    min_width: 4,
    min_height: 3,
    max_width: 12,
    max_height: 8,
    resizable: true,
  },
  default_config: {
    type: 'chart_area',
    x_axis: { field: 'date', label: 'Date', scale: 'time' },
    y_axis: { field: 'value', label: 'Value' },
    series: [
      {
        id: 'series1',
        name: 'Series 1',
        field: 'value',
      },
    ],
    legend: { enabled: true, position: 'bottom' },
    tooltip: { enabled: true },
    stacked: false,
    smooth: true,
  } as WidgetConfig,
  supports_realtime: true,
  supports_export: true,
  config_schema: {},
})

registerWidget({
  type: 'list_recent',
  name: 'Recent Items List',
  description: 'Show a list of most recent items (contacts, tasks, etc.)',
  icon: 'List',
  category: 'lists',
  default_size: {
    width: 4,
    height: 4,
    min_width: 3,
    min_height: 3,
    max_width: 6,
    max_height: 8,
    resizable: true,
  },
  default_config: {
    type: 'list_recent',
    entity: 'contacts',
    fields: [
      { field: 'name', label: 'Name' },
      { field: 'status', label: 'Status' },
    ],
    limit: 10,
    sort_by: 'created_at',
    sort_order: 'desc',
    show_avatars: true,
    show_timestamps: true,
    click_action: 'view',
  } as WidgetConfig,
  supports_realtime: true,
  supports_export: true,
  config_schema: {},
})

registerWidget({
  type: 'list_top',
  name: 'Top Items List',
  description: 'Show top performers or ranked items',
  icon: 'Trophy',
  category: 'lists',
  default_size: {
    width: 4,
    height: 4,
    min_width: 3,
    min_height: 3,
    max_width: 6,
    max_height: 8,
    resizable: true,
  },
  default_config: {
    type: 'list_top',
    entity: 'contacts',
    fields: [
      { field: 'name', label: 'Name' },
      { field: 'value', label: 'Value' },
    ],
    limit: 10,
    sort_by: 'value',
    sort_order: 'desc',
    show_avatars: true,
    show_timestamps: false,
  } as WidgetConfig,
  supports_realtime: true,
  supports_export: true,
  config_schema: {},
})

registerWidget({
  type: 'table_data',
  name: 'Data Table',
  description: 'Display data in a sortable, filterable table',
  icon: 'Table',
  category: 'lists',
  default_size: {
    width: 8,
    height: 5,
    min_width: 6,
    min_height: 4,
    max_width: 12,
    max_height: 10,
    resizable: true,
  },
  default_config: {
    type: 'table_data',
    entity: 'contacts',
    columns: [
      { field: 'name', header: 'Name', sortable: true, filterable: true, align: 'left' },
      { field: 'status', header: 'Status', sortable: true, filterable: true, align: 'center' },
      { field: 'value', header: 'Value', sortable: true, filterable: false, align: 'right' },
    ],
    pagination: { enabled: true, page_size: 25 },
    sorting: { enabled: true, default_sort: 'created_at', default_order: 'desc' },
    search: { enabled: true, fields: ['name', 'email'], placeholder: 'Search...' },
  } as WidgetConfig,
  supports_realtime: true,
  supports_export: true,
  config_schema: {},
})

registerWidget({
  type: 'progress_bar',
  name: 'Progress Bar',
  description: 'Show progress towards a goal with a horizontal bar',
  icon: 'Progress',
  category: 'metrics',
  default_size: {
    width: 3,
    height: 2,
    min_width: 2,
    min_height: 1,
    max_width: 6,
    max_height: 3,
    resizable: true,
  },
  default_config: {
    type: 'progress_bar',
    metric: 'monthly_revenue',
    goal: 100000,
    format: 'currency',
    show_value: true,
    show_percentage: true,
  } as WidgetConfig,
  supports_realtime: true,
  supports_export: true,
  config_schema: {},
})

registerWidget({
  type: 'progress_ring',
  name: 'Progress Ring',
  description: 'Display progress in a circular format',
  icon: 'CircleProgress',
  category: 'metrics',
  default_size: {
    width: 3,
    height: 3,
    min_width: 2,
    min_height: 2,
    max_width: 4,
    max_height: 4,
    resizable: true,
  },
  default_config: {
    type: 'progress_ring',
    metric: 'quota_completion',
    goal: 100,
    format: 'percentage',
    show_value: true,
    show_percentage: true,
  } as WidgetConfig,
  supports_realtime: true,
  supports_export: true,
  config_schema: {},
})

registerWidget({
  type: 'map_pins',
  name: 'Map with Pins',
  description: 'Show locations on an interactive map',
  icon: 'MapPin',
  category: 'maps',
  default_size: {
    width: 6,
    height: 5,
    min_width: 4,
    min_height: 4,
    max_width: 12,
    max_height: 10,
    resizable: true,
  },
  default_config: {
    type: 'map_pins',
    entity: 'contacts',
    location_field: 'address',
    cluster: true,
    popup_fields: ['name', 'status', 'value'],
  } as WidgetConfig,
  supports_realtime: true,
  supports_export: false,
  config_schema: {},
})

registerWidget({
  type: 'map_heatmap',
  name: 'Heatmap',
  description: 'Visualize data density or intensity on a map',
  icon: 'Map',
  category: 'maps',
  default_size: {
    width: 6,
    height: 5,
    min_width: 4,
    min_height: 4,
    max_width: 12,
    max_height: 10,
    resizable: true,
  },
  default_config: {
    type: 'map_heatmap',
    entity: 'projects',
    location_field: 'address',
    value_field: 'value',
  } as WidgetConfig,
  supports_realtime: true,
  supports_export: false,
  config_schema: {},
})

registerWidget({
  type: 'calendar_events',
  name: 'Calendar',
  description: 'Display events, tasks, and appointments in a calendar view',
  icon: 'Calendar',
  category: 'calendar',
  default_size: {
    width: 8,
    height: 6,
    min_width: 6,
    min_height: 5,
    max_width: 12,
    max_height: 10,
    resizable: true,
  },
  default_config: {
    type: 'calendar_events',
    view: 'month',
    event_sources: [
      {
        id: 'tasks',
        entity: 'tasks',
        title_field: 'title',
        start_field: 'due_date',
        color: '#FF8243',
      },
    ],
    show_weekends: true,
    time_format: '12h',
    first_day_of_week: 0,
  } as WidgetConfig,
  supports_realtime: true,
  supports_export: false,
  config_schema: {},
})

registerWidget({
  type: 'activity_feed',
  name: 'Activity Feed',
  description: 'Show recent activity and updates',
  icon: 'Activity',
  category: 'activity',
  default_size: {
    width: 4,
    height: 6,
    min_width: 3,
    min_height: 4,
    max_width: 6,
    max_height: 10,
    resizable: true,
  },
  default_config: {
    type: 'activity_feed',
    activities: [
      'contact_created',
      'contact_updated',
      'task_created',
      'task_completed',
      'call_logged',
    ],
    limit: 20,
    group_by_date: true,
    show_user: true,
    show_timestamp: true,
  } as WidgetConfig,
  supports_realtime: true,
  supports_export: true,
  config_schema: {},
})

registerWidget({
  type: 'leaderboard',
  name: 'Leaderboard',
  description: 'Rank users, teams, or territories by performance',
  icon: 'Award',
  category: 'performance',
  default_size: {
    width: 4,
    height: 5,
    min_width: 3,
    min_height: 4,
    max_width: 6,
    max_height: 8,
    resizable: true,
  },
  default_config: {
    type: 'leaderboard',
    metric: 'revenue',
    entity: 'users',
    period: 'month',
    limit: 10,
    show_ranking: true,
    show_trend: true,
    show_avatars: true,
    format: 'currency',
  } as WidgetConfig,
  supports_realtime: true,
  supports_export: true,
  config_schema: {},
})

registerWidget({
  type: 'revenue_forecast',
  name: 'Revenue Forecast',
  description: 'Predict future revenue based on historical data',
  icon: 'TrendingUp',
  category: 'performance',
  default_size: {
    width: 6,
    height: 4,
    min_width: 4,
    min_height: 3,
    max_width: 12,
    max_height: 6,
    resizable: true,
  },
  default_config: {
    type: 'revenue_forecast',
    forecast_periods: 6,
    period_type: 'month',
    confidence_interval: true,
    actual_vs_forecast: true,
    historical_periods: 12,
  } as WidgetConfig,
  supports_realtime: false,
  supports_export: true,
  config_schema: {},
})

registerWidget({
  type: 'pipeline_funnel',
  name: 'Pipeline Funnel',
  description: 'Visualize conversion rates through pipeline stages',
  icon: 'Filter',
  category: 'performance',
  default_size: {
    width: 5,
    height: 4,
    min_width: 4,
    min_height: 3,
    max_width: 8,
    max_height: 6,
    resizable: true,
  },
  default_config: {
    type: 'pipeline_funnel',
    stages: ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won'],
    metric: 'value',
    show_conversion_rates: true,
    show_drop_off: true,
    orientation: 'vertical',
  } as WidgetConfig,
  supports_realtime: true,
  supports_export: true,
  config_schema: {},
})

registerWidget({
  type: 'team_performance',
  name: 'Team Performance',
  description: 'Compare team metrics and KPIs',
  icon: 'Users',
  category: 'performance',
  default_size: {
    width: 6,
    height: 4,
    min_width: 4,
    min_height: 3,
    max_width: 12,
    max_height: 6,
    resizable: true,
  },
  default_config: {
    type: 'team_performance',
    metrics: [
      {
        id: 'revenue',
        name: 'Revenue',
        field: 'total_revenue',
        format: 'currency',
        goal: 50000,
      },
    ],
    period: 'month',
    comparison_enabled: true,
    comparison_period: 'previous_period',
  } as WidgetConfig,
  supports_realtime: true,
  supports_export: true,
  config_schema: {},
})

registerWidget({
  type: 'task_summary',
  name: 'Task Summary',
  description: 'Overview of tasks by status, priority, or assignee',
  icon: 'CheckSquare',
  category: 'activity',
  default_size: {
    width: 4,
    height: 3,
    min_width: 3,
    min_height: 2,
    max_width: 6,
    max_height: 5,
    resizable: true,
  },
  default_config: {
    type: 'task_summary',
    group_by: 'status',
    show_overdue: true,
    show_completed: false,
  } as WidgetConfig,
  supports_realtime: true,
  supports_export: true,
  config_schema: {},
})

registerWidget({
  type: 'weather_widget',
  name: 'Weather',
  description: 'Current weather and storm tracking for roofing operations',
  icon: 'Cloud',
  category: 'custom',
  default_size: {
    width: 3,
    height: 3,
    min_width: 2,
    min_height: 2,
    max_width: 4,
    max_height: 4,
    resizable: true,
  },
  default_config: {
    type: 'weather_widget',
    use_user_location: true,
    show_forecast: true,
    forecast_days: 5,
    show_storm_tracking: true,
  } as WidgetConfig,
  supports_realtime: true,
  supports_export: false,
  config_schema: {},
})

registerWidget({
  type: 'custom_iframe',
  name: 'Custom Embed (iframe)',
  description: 'Embed external content via iframe',
  icon: 'Frame',
  category: 'custom',
  default_size: {
    width: 6,
    height: 4,
    min_width: 3,
    min_height: 3,
    max_width: 12,
    max_height: 10,
    resizable: true,
  },
  default_config: {
    type: 'custom_iframe',
    content: '',
    sandbox: ['allow-scripts', 'allow-same-origin'],
  } as WidgetConfig,
  supports_realtime: false,
  supports_export: false,
  config_schema: {},
})

registerWidget({
  type: 'custom_html',
  name: 'Custom HTML',
  description: 'Add custom HTML content',
  icon: 'Code',
  category: 'custom',
  default_size: {
    width: 4,
    height: 3,
    min_width: 2,
    min_height: 2,
    max_width: 12,
    max_height: 10,
    resizable: true,
  },
  default_config: {
    type: 'custom_html',
    content: '<div>Custom HTML content</div>',
    allow_scripts: false,
  } as WidgetConfig,
  supports_realtime: false,
  supports_export: false,
  config_schema: {},
})

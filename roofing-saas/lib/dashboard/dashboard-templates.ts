/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Dashboard Templates
 *
 * Pre-built dashboard templates for different roles and use cases.
 */

import type {
  DashboardTemplate,
  DashboardLayout,
  DashboardWidget,
  DashboardSettings,
} from './dashboard-types'

// Default layout configuration
const defaultLayout: DashboardLayout = {
  type: 'grid',
  columns: 12,
  rowHeight: 80,
  gap: 16,
  responsive: true,
  breakpoints: {
    lg: 1200,
    md: 992,
    sm: 768,
    xs: 576,
  },
}

// Default settings
const defaultSettings: DashboardSettings = {
  theme: 'auto',
  auto_refresh: {
    enabled: false,
    interval: 300, // 5 minutes
  },
  date_range: {
    type: 'relative',
    relative: 'last_30_days',
  },
  export_enabled: true,
  share_enabled: true,
}

// Sales Dashboard Template
export const salesDashboardTemplate: DashboardTemplate = {
  id: 'template_sales',
  name: 'Sales Dashboard',
  description: 'Comprehensive sales performance tracking with revenue, pipeline, and activity metrics',
  category: 'sales',
  tags: ['sales', 'revenue', 'pipeline', 'leads'],
  target_roles: ['sales_manager', 'sales_rep'],
  layout: defaultLayout,
  settings: defaultSettings,
  is_official: true,
  usage_count: 0,
  created_at: new Date().toISOString(),
  created_by: 'system',
  widgets: [
    {
      id: 'widget_revenue',
      type: 'metric_card',
      title: 'Total Revenue',
      description: 'Revenue for selected period',
      position: { x: 0, y: 0 },
      size: { width: 3, height: 2, resizable: true },
      enabled: true,
      config: {
        type: 'metric_card',
        metric: 'total_revenue',
        format: 'currency',
        trend: {
          enabled: true,
          comparison_period: 'previous_month',
          show_percentage: true,
          show_arrow: true,
        },
        icon: 'DollarSign',
        color: '#10b981',
      },
    },
    {
      id: 'widget_deals_closed',
      type: 'metric_card',
      title: 'Deals Closed',
      description: 'Number of closed deals',
      position: { x: 3, y: 0 },
      size: { width: 3, height: 2, resizable: true },
      enabled: true,
      config: {
        type: 'metric_card',
        metric: 'deals_closed',
        format: 'number',
        trend: {
          enabled: true,
          comparison_period: 'previous_month',
          show_percentage: true,
          show_arrow: true,
        },
        icon: 'TrendingUp',
        color: '#3b82f6',
      },
    },
    {
      id: 'widget_pipeline_value',
      type: 'metric_card',
      title: 'Pipeline Value',
      description: 'Total value in pipeline',
      position: { x: 6, y: 0 },
      size: { width: 3, height: 2, resizable: true },
      enabled: true,
      config: {
        type: 'metric_card',
        metric: 'pipeline_value',
        format: 'currency',
        icon: 'PieChart',
        color: '#8b5cf6',
      },
    },
    {
      id: 'widget_conversion_rate',
      type: 'metric_card',
      title: 'Conversion Rate',
      description: 'Lead to customer conversion',
      position: { x: 9, y: 0 },
      size: { width: 3, height: 2, resizable: true },
      enabled: true,
      config: {
        type: 'metric_card',
        metric: 'conversion_rate',
        format: 'percentage',
        icon: 'Target',
        color: '#f59e0b',
      },
    },
    {
      id: 'widget_revenue_chart',
      type: 'chart_line',
      title: 'Revenue Trend',
      description: 'Monthly revenue over time',
      position: { x: 0, y: 2 },
      size: { width: 8, height: 4, resizable: true },
      enabled: true,
      config: {
        type: 'chart_line',
        x_axis: { field: 'month', label: 'Month', scale: 'time' },
        y_axis: { field: 'revenue', label: 'Revenue' },
        series: [
          { id: 'revenue', name: 'Revenue', field: 'revenue', color: '#10b981' },
        ],
        legend: { enabled: true, position: 'bottom' },
        tooltip: { enabled: true, format: 'currency' },
        smooth: true,
      },
    },
    {
      id: 'widget_pipeline_funnel',
      type: 'pipeline_funnel',
      title: 'Sales Pipeline',
      description: 'Deal progression through stages',
      position: { x: 8, y: 2 },
      size: { width: 4, height: 4, resizable: true },
      enabled: true,
      config: {
        type: 'pipeline_funnel',
        stages: ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won'],
        metric: 'value',
        show_conversion_rates: true,
        show_drop_off: true,
        orientation: 'vertical',
      },
    },
    {
      id: 'widget_recent_deals',
      type: 'list_recent',
      title: 'Recent Deals',
      description: 'Latest closed deals',
      position: { x: 0, y: 6 },
      size: { width: 6, height: 4, resizable: true },
      enabled: true,
      config: {
        type: 'list_recent',
        entity: 'projects',
        fields: [
          { field: 'name', label: 'Deal Name' },
          { field: 'value', label: 'Value', format: 'currency' },
          { field: 'status', label: 'Status' },
        ],
        limit: 10,
        sort_by: 'closed_date',
        sort_order: 'desc',
        show_timestamps: true,
        click_action: 'view',
      },
    },
    {
      id: 'widget_leaderboard',
      type: 'leaderboard',
      title: 'Top Performers',
      description: 'Sales rep rankings',
      position: { x: 6, y: 6 },
      size: { width: 6, height: 4, resizable: true },
      enabled: true,
      config: {
        type: 'leaderboard',
        metric: 'revenue',
        entity: 'users',
        period: 'month',
        limit: 10,
        show_ranking: true,
        show_trend: true,
        show_avatars: true,
        format: 'currency',
      },
    },
  ],
}

// Executive Dashboard Template
export const executiveDashboardTemplate: DashboardTemplate = {
  id: 'template_executive',
  name: 'Executive Dashboard',
  description: 'High-level overview of business performance and KPIs',
  category: 'executive',
  tags: ['executive', 'kpi', 'overview'],
  target_roles: ['admin', 'executive'],
  layout: defaultLayout,
  settings: defaultSettings,
  is_official: true,
  usage_count: 0,
  created_at: new Date().toISOString(),
  created_by: 'system',
  widgets: [
    {
      id: 'widget_monthly_revenue',
      type: 'metric_card',
      title: 'Monthly Revenue',
      position: { x: 0, y: 0 },
      size: { width: 3, height: 2, resizable: true },
      enabled: true,
      config: {
        type: 'metric_card',
        metric: 'monthly_revenue',
        format: 'currency',
        trend: {
          enabled: true,
          comparison_period: 'previous_month',
          show_percentage: true,
          show_arrow: true,
        },
        goal: {
          enabled: true,
          target: 500000,
          show_progress: true,
        },
      },
    },
    {
      id: 'widget_active_projects',
      type: 'metric_card',
      title: 'Active Projects',
      position: { x: 3, y: 0 },
      size: { width: 3, height: 2, resizable: true },
      enabled: true,
      config: {
        type: 'metric_card',
        metric: 'active_projects',
        format: 'number',
      },
    },
    {
      id: 'widget_customer_satisfaction',
      type: 'metric_card',
      title: 'Customer Satisfaction',
      position: { x: 6, y: 0 },
      size: { width: 3, height: 2, resizable: true },
      enabled: true,
      config: {
        type: 'metric_card',
        metric: 'csat_score',
        format: 'percentage',
      },
    },
    {
      id: 'widget_forecast',
      type: 'revenue_forecast',
      title: 'Revenue Forecast',
      position: { x: 0, y: 2 },
      size: { width: 12, height: 4, resizable: true },
      enabled: true,
      config: {
        type: 'revenue_forecast',
        forecast_periods: 6,
        period_type: 'month',
        confidence_interval: true,
        actual_vs_forecast: true,
        historical_periods: 12,
      },
    },
    {
      id: 'widget_team_performance',
      type: 'team_performance',
      title: 'Team Performance',
      position: { x: 0, y: 6 },
      size: { width: 12, height: 4, resizable: true },
      enabled: true,
      config: {
        type: 'team_performance',
        metrics: [
          {
            id: 'revenue',
            name: 'Revenue',
            field: 'total_revenue',
            format: 'currency',
            goal: 50000,
          },
          {
            id: 'deals',
            name: 'Deals Closed',
            field: 'deals_closed',
            format: 'number',
            goal: 10,
          },
        ],
        period: 'month',
        comparison_enabled: true,
        comparison_period: 'previous_period',
      },
    },
  ],
}

// Operations Dashboard Template
export const operationsDashboardTemplate: DashboardTemplate = {
  id: 'template_operations',
  name: 'Operations Dashboard',
  description: 'Track jobs, projects, and field operations',
  category: 'operations',
  tags: ['operations', 'jobs', 'projects', 'scheduling'],
  target_roles: ['operations_manager', 'project_manager'],
  layout: defaultLayout,
  settings: defaultSettings,
  is_official: true,
  usage_count: 0,
  created_at: new Date().toISOString(),
  created_by: 'system',
  widgets: [
    {
      id: 'widget_active_jobs',
      type: 'metric_card',
      title: 'Active Jobs',
      position: { x: 0, y: 0 },
      size: { width: 3, height: 2, resizable: true },
      enabled: true,
      config: {
        type: 'metric_card',
        metric: 'active_jobs',
        format: 'number',
      },
    },
    {
      id: 'widget_scheduled_today',
      type: 'metric_card',
      title: 'Scheduled Today',
      position: { x: 3, y: 0 },
      size: { width: 3, height: 2, resizable: true },
      enabled: true,
      config: {
        type: 'metric_card',
        metric: 'scheduled_today',
        format: 'number',
      },
    },
    {
      id: 'widget_calendar',
      type: 'calendar_events',
      title: 'Job Calendar',
      position: { x: 0, y: 2 },
      size: { width: 8, height: 6, resizable: true },
      enabled: true,
      config: {
        type: 'calendar_events',
        view: 'week',
        event_sources: [
          {
            id: 'jobs',
            entity: 'jobs',
            title_field: 'title',
            start_field: 'scheduled_date',
            color: '#3b82f6',
          },
        ],
        show_weekends: false,
        time_format: '12h',
        first_day_of_week: 1,
      },
    },
    {
      id: 'widget_job_map',
      type: 'map_pins',
      title: 'Job Locations',
      position: { x: 8, y: 2 },
      size: { width: 4, height: 6, resizable: true },
      enabled: true,
      config: {
        type: 'map_pins',
        entity: 'jobs',
        location_field: 'address',
        cluster: true,
        popup_fields: ['title', 'status', 'scheduled_date'],
      },
    },
    {
      id: 'widget_tasks',
      type: 'task_summary',
      title: 'Task Summary',
      position: { x: 0, y: 8 },
      size: { width: 6, height: 3, resizable: true },
      enabled: true,
      config: {
        type: 'task_summary',
        group_by: 'status',
        show_overdue: true,
        show_completed: false,
      },
    },
  ],
}

// Field Rep Dashboard Template
export const fieldRepDashboardTemplate: DashboardTemplate = {
  id: 'template_field_rep',
  name: 'Field Rep Dashboard',
  description: 'Daily activities, tasks, and territory management for field representatives',
  category: 'field_rep',
  tags: ['field', 'mobile', 'tasks', 'leads'],
  target_roles: ['field_rep', 'canvasser'],
  layout: defaultLayout,
  settings: defaultSettings,
  is_official: true,
  usage_count: 0,
  created_at: new Date().toISOString(),
  created_by: 'system',
  widgets: [
    {
      id: 'widget_todays_tasks',
      type: 'list_recent',
      title: "Today's Tasks",
      position: { x: 0, y: 0 },
      size: { width: 6, height: 4, resizable: true },
      enabled: true,
      config: {
        type: 'list_recent',
        entity: 'tasks',
        fields: [
          { field: 'title', label: 'Task' },
          { field: 'due_date', label: 'Due', format: 'time' },
          { field: 'priority', label: 'Priority' },
        ],
        limit: 10,
        sort_by: 'due_date',
        sort_order: 'asc',
        click_action: 'edit',
      },
    },
    {
      id: 'widget_territory_map',
      type: 'map_pins',
      title: 'My Territory',
      position: { x: 6, y: 0 },
      size: { width: 6, height: 4, resizable: true },
      enabled: true,
      config: {
        type: 'map_pins',
        entity: 'contacts',
        location_field: 'address',
        cluster: true,
        popup_fields: ['name', 'status', 'phone'],
      },
    },
    {
      id: 'widget_activity',
      type: 'activity_feed',
      title: 'Recent Activity',
      position: { x: 0, y: 4 },
      size: { width: 6, height: 5, resizable: true },
      enabled: true,
      config: {
        type: 'activity_feed',
        activities: ['contact_created', 'task_completed', 'call_logged'],
        limit: 15,
        group_by_date: true,
        show_user: false,
        show_timestamp: true,
      },
    },
    {
      id: 'widget_weather',
      type: 'weather_widget',
      title: 'Weather',
      position: { x: 6, y: 4 },
      size: { width: 3, height: 3, resizable: true },
      enabled: true,
      config: {
        type: 'weather_widget',
        use_user_location: true,
        show_forecast: true,
        forecast_days: 3,
        show_storm_tracking: true,
      },
    },
  ],
}

// Template Registry
const templateRegistry = new Map<string, DashboardTemplate>([
  ['template_sales', salesDashboardTemplate],
  ['template_executive', executiveDashboardTemplate],
  ['template_operations', operationsDashboardTemplate],
  ['template_field_rep', fieldRepDashboardTemplate],
])

/**
 * Get all available templates
 */
export function getAllTemplates(): DashboardTemplate[] {
  return Array.from(templateRegistry.values())
}

/**
 * Get template by ID
 */
export function getTemplate(id: string): DashboardTemplate | undefined {
  return templateRegistry.get(id)
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): DashboardTemplate[] {
  return Array.from(templateRegistry.values()).filter((t) => t.category === category)
}

/**
 * Get templates by role
 */
export function getTemplatesByRole(roleId: string): DashboardTemplate[] {
  return Array.from(templateRegistry.values()).filter(
    (t) => t.target_roles?.includes(roleId)
  )
}

/**
 * Register a new template
 */
export function registerTemplate(template: DashboardTemplate): void {
  templateRegistry.set(template.id, template)
}

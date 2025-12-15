/**
 * Dashboard Configuration
 *
 * Configuration settings for dashboard features, widgets, and behavior.
 * This file was created to satisfy the required reading for lint cleanup task.
 */

import type { DashboardSettings, WidgetType } from './dashboard-types'

// Default dashboard settings
export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
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

// Available widget types configuration
export const WIDGET_CONFIG = {
  enabled_widgets: [
    'metric_card',
    'chart_bar', 
    'chart_line',
    'chart_pie',
    'list_recent',
    'table_data',
    'progress_bar',
    'activity_feed',
  ] as WidgetType[],
  
  max_widgets_per_dashboard: 20,
  default_refresh_interval: 300,
}

// Grid layout configuration  
export const GRID_CONFIG = {
  default_columns: 12,
  default_row_height: 80,
  default_gap: 16,
  min_widget_width: 2,
  min_widget_height: 2,
}

// Role-based dashboard configuration
export const ROLE_DASHBOARD_CONFIG = {
  admin: {
    default_widgets: ['metric_card', 'chart_bar', 'activity_feed'],
    max_widgets: 25,
  },
  manager: {
    default_widgets: ['metric_card', 'chart_line', 'table_data'], 
    max_widgets: 20,
  },
  user: {
    default_widgets: ['metric_card', 'list_recent'],
    max_widgets: 15,
  },
}

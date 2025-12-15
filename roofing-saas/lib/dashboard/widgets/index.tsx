/**
 * Widget Component Index
 *
 * Exports all widget components for easy importing.
 */

export { MetricCardWidget } from './MetricCardWidget'

// Export a widget renderer factory
import type { DashboardWidget, MetricCardConfig } from '@/lib/dashboard/dashboard-types'
import { MetricCardWidget } from './MetricCardWidget'

interface MetricCardData {
  value: number;
  previous_value?: number;
  goal?: number;
}

export function renderWidget(widget: DashboardWidget, data?: unknown) {
  switch (widget.type) {
    case 'metric_card':
      return <MetricCardWidget config={widget.config as MetricCardConfig} data={data as MetricCardData} />

    // Add more widget renderers here as they are implemented
    case 'chart_bar':
    case 'chart_line':
    case 'chart_pie':
    case 'chart_area':
    case 'list_recent':
    case 'list_top':
    case 'table_data':
    case 'progress_bar':
    case 'progress_ring':
    case 'map_pins':
    case 'map_heatmap':
    case 'calendar_events':
    case 'activity_feed':
    case 'leaderboard':
    case 'revenue_forecast':
    case 'pipeline_funnel':
    case 'team_performance':
    case 'task_summary':
    case 'weather_widget':
    case 'custom_iframe':
    case 'custom_html':
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p className="text-sm">Widget type "{widget.type}" not yet implemented</p>
        </div>
      )

    default:
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p className="text-sm">Unknown widget type</p>
        </div>
      )
  }
}

/**
 * Dashboard Components Export Index
 *
 * Central export file for all dashboard-related components.
 */

import React from 'react'

export { DashboardMetrics } from './DashboardMetrics'
export { DashboardScopeFilter, type DashboardScope } from './DashboardScopeFilter'
export { ActivityFeed } from './ActivityFeed'
export { WeeklyChallengeWidget } from './WeeklyChallengeWidget'

// Re-export from DashboardEditor for compatibility
export { DashboardEditor, default as default } from '../../lib/dashboard/DashboardEditor'

// Placeholder renderWidget function for dashboard usage example
export function renderWidget(widget: { type: string }, _data?: unknown): React.ReactElement {
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      <p>Widget: {widget.type}</p>
    </div>
  )
}
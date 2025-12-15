/**
 * Dashboard Builder Usage Examples
 *
 * This file demonstrates how to use the custom dashboard builder system
 * in various scenarios.
 */

'use client'

import { useState, useEffect } from 'react'
import {
  fetchDashboards,
  fetchDashboard,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  duplicateDashboard,
  getDefaultDashboard,
  getAllTemplates,
  getTemplatesByRole,
} from '@/lib/dashboard'
import { DashboardEditor, renderWidget } from '@/components/dashboard'
import type { Dashboard, DashboardTemplate } from '@/lib/dashboard/dashboard-types'

// ============================================================================
// Example 1: Dashboard List Page
// ============================================================================

export function DashboardListPage() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboards() {
      try {
        const response = await fetchDashboards({
          status: ['active', 'draft'],
          page: 1,
          limit: 20,
        })
        setDashboards(response.dashboards)
      } catch (error) {
        console.error('Failed to load dashboards:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboards()
  }, [])

  const handleDuplicate = async (dashboardId: string) => {
    try {
      const newDashboard = await duplicateDashboard(dashboardId)
      setDashboards([...dashboards, newDashboard])
    } catch (error) {
      console.error('Failed to duplicate dashboard:', error)
    }
  }

  const handleDelete = async (dashboardId: string) => {
    try {
      await deleteDashboard(dashboardId)
      setDashboards(dashboards.filter((d) => d.id !== dashboardId))
    } catch (error) {
      console.error('Failed to delete dashboard:', error)
    }
  }

  if (loading) return <div>Loading dashboards...</div>

  return (
    <div>
      <h1>My Dashboards</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dashboards.map((dashboard) => (
          <div key={dashboard.id} className="border rounded p-4">
            <h3>{dashboard.name}</h3>
            <p>{dashboard.description}</p>
            <p>{dashboard.widgets.length} widgets</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => handleDuplicate(dashboard.id)}>Duplicate</button>
              <button onClick={() => handleDelete(dashboard.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Example 2: Create Dashboard from Template
// ============================================================================

export function CreateDashboardFromTemplate() {
  const [templates, setTemplates] = useState<DashboardTemplate[]>([])
  const [userRole, setUserRole] = useState<string>('sales_rep')

  useEffect(() => {
    // Load templates for user's role
    const roleTemplates = getTemplatesByRole(userRole)
    setTemplates(roleTemplates)
  }, [userRole])

  const handleCreateFromTemplate = async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    if (!template) return

    try {
      const dashboard = await createDashboard({
        name: template.name,
        description: template.description,
        visibility: 'private',
        role_based: false,
        layout: template.layout,
        widgets: template.widgets,
        settings: template.settings,
      })

      console.log('Created dashboard:', dashboard)
      // Navigate to dashboard or show success message
    } catch (error) {
      console.error('Failed to create dashboard:', error)
    }
  }

  return (
    <div>
      <h2>Create Dashboard from Template</h2>
      <div className="grid gap-4">
        {templates.map((template) => (
          <div key={template.id} className="border rounded p-4">
            <h3>{template.name}</h3>
            <p>{template.description}</p>
            <p>Category: {template.category}</p>
            <button onClick={() => handleCreateFromTemplate(template.id)}>
              Use Template
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Example 3: Dashboard Editor Page
// ============================================================================

export function DashboardEditorPage({ dashboardId }: { dashboardId?: string }) {
  const [dashboard, setDashboard] = useState<Dashboard | undefined>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      if (!dashboardId) {
        setLoading(false)
        return
      }

      try {
        const data = await fetchDashboard(dashboardId)
        if (data) setDashboard(data)
      } catch (error) {
        console.error('Failed to load dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [dashboardId])

  const handleSave = (savedDashboard: Dashboard) => {
    console.log('Dashboard saved:', savedDashboard)
    setDashboard(savedDashboard)
    // Navigate away or show success message
  }

  const handleCancel = () => {
    // Navigate back to dashboard list
    console.log('Edit cancelled')
  }

  if (loading) return <div>Loading dashboard...</div>

  return (
    <div className="h-screen">
      <DashboardEditor
        dashboard={dashboard}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  )
}

// ============================================================================
// Example 4: Dashboard View (Read-Only)
// ============================================================================

export function DashboardViewPage({ dashboardId }: { dashboardId: string }) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [widgetData, setWidgetData] = useState<Record<string, unknown>>({})

  useEffect(() => {
    async function loadDashboard() {
      try {
        const data = await fetchDashboard(dashboardId)
        if (!data) return

        setDashboard(data)

        // Load data for all widgets
        // This is a simplified example - in production you'd want to batch these
        const dataPromises = data.widgets.map(async (widget) => {
          if (!widget.data_source) return { widgetId: widget.id, data: null }

          try {
            const { fetchWidgetData } = await import('@/lib/dashboard')
            const response = await fetchWidgetData(widget)
            return { widgetId: widget.id, data: response.data }
          } catch (error) {
            console.error(`Failed to load widget ${widget.id}:`, error)
            return { widgetId: widget.id, data: null }
          }
        })

        const results = await Promise.all(dataPromises)
        const dataMap = results.reduce((acc, { widgetId, data }) => {
          acc[widgetId] = data
          return acc
        }, {} as Record<string, unknown>)

        setWidgetData(dataMap)
      } catch (error) {
        console.error('Failed to load dashboard:', error)
      }
    }

    loadDashboard()
  }, [dashboardId])

  if (!dashboard) return <div>Loading dashboard...</div>

  return (
    <div className="p-6">
      <h1>{dashboard.name}</h1>
      {dashboard.description && <p>{dashboard.description}</p>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${dashboard.layout.columns}, 1fr)`,
          gap: `${dashboard.layout.gap}px`,
          marginTop: '2rem',
        }}
      >
        {dashboard.widgets
          .filter((w) => w.enabled)
          .map((widget) => {
            const { x, y } = widget.position
            const { width, height } = widget.size

            return (
              <div
                key={widget.id}
                style={{
                  gridColumn: `${x + 1} / span ${width}`,
                  gridRow: `${y + 1} / span ${height}`,
                  minHeight: `${height * dashboard.layout.rowHeight}px`,
                }}
              >
                <div className="border rounded p-4">
                  <h3>{widget.title}</h3>
                  <div className="mt-2">
                    {renderWidget(widget, widgetData[widget.id])}
                  </div>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}

// ============================================================================
// Example 5: Load User's Default Dashboard
// ============================================================================

export function UserDefaultDashboard() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [userRole, setUserRole] = useState<string>('sales_rep')

  useEffect(() => {
    async function loadDefaultDashboard() {
      try {
        // Try to get role-based default dashboard
        const defaultDash = await getDefaultDashboard(userRole)

        if (defaultDash) {
          setDashboard(defaultDash)
        } else {
          // No default dashboard, create one from template
          const templates = getTemplatesByRole(userRole)
          if (templates.length > 0) {
            const template = templates[0]
            const newDashboard = await createDashboard({
              name: template.name,
              description: template.description,
              visibility: 'private',
              role_based: false,
              layout: template.layout,
              widgets: template.widgets,
              settings: template.settings,
            })
            setDashboard(newDashboard)
          }
        }
      } catch (error) {
        console.error('Failed to load default dashboard:', error)
      }
    }

    loadDefaultDashboard()
  }, [userRole])

  if (!dashboard) return <div>Loading your dashboard...</div>

  return <DashboardViewPage dashboardId={dashboard.id} />
}

// ============================================================================
// Example 6: Programmatically Add Widgets
// ============================================================================

export async function addWidgetsToDashboard(dashboardId: string) {
  const { addWidget } = await import('@/lib/dashboard')

  // Add a metric card
  await addWidget(dashboardId, {
    type: 'metric_card',
    title: 'Total Revenue',
    position: { x: 0, y: 0 },
    size: { width: 3, height: 2, resizable: true },
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
    },
    data_source: {
      type: 'query',
      config: {
        type: 'query',
        entity: 'projects',
        fields: ['value'],
        aggregations: [
          {
            field: 'value',
            function: 'sum',
            alias: 'total_revenue',
          },
        ],
      },
    },
    enabled: true,
  })

  // Add a chart
  await addWidget(dashboardId, {
    type: 'chart_line',
    title: 'Revenue Trend',
    position: { x: 3, y: 0 },
    size: { width: 6, height: 4, resizable: true },
    config: {
      type: 'chart_line',
      x_axis: { field: 'month', label: 'Month', scale: 'time' },
      y_axis: { field: 'revenue', label: 'Revenue' },
      series: [
        {
          id: 'revenue',
          name: 'Revenue',
          field: 'revenue',
          color: '#10b981',
        },
      ],
      legend: { enabled: true, position: 'bottom' },
      tooltip: { enabled: true },
      smooth: true,
    },
    data_source: {
      type: 'query',
      config: {
        type: 'query',
        entity: 'revenue_by_month',
        fields: ['month', 'revenue'],
        order_by: [{ field: 'month', order: 'asc' }],
        limit: 12,
      },
    },
    enabled: true,
  })
}

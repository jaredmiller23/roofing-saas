/**
 * Dashboard Engine
 *
 * Core engine for managing dashboards, widgets, and data fetching.
 * Handles dashboard CRUD operations, widget management, and data loading.
 */

import { createClient } from '@/lib/supabase/client'
import type {
  Dashboard,
  DashboardWidget,
  CreateDashboardInput,
  UpdateDashboardInput,
  DashboardFilters,
  DashboardListResponse,
  WidgetDataResponse,
  WidgetDataSource,
  QueryDataSource,
  DashboardPermissions,
  WidgetPosition,
  WidgetSize,
} from './dashboard-types'
import { getWidgetDefinition } from './widget-registry'

/**
 * Fetch all dashboards for the current user/tenant
 */
export async function fetchDashboards(
  filters?: DashboardFilters
): Promise<DashboardListResponse> {
  const supabase = createClient()

  // Build query
  let query = supabase
    .from('dashboards')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })

  // Apply filters
  if (filters?.status?.length) {
    query = query.in('status', filters.status)
  }
  if (filters?.visibility?.length) {
    query = query.in('visibility', filters.visibility)
  }
  if (filters?.is_template !== undefined) {
    query = query.eq('is_template', filters.is_template)
  }
  if (filters?.template_category) {
    query = query.eq('template_category', filters.template_category)
  }
  if (filters?.role_id) {
    query = query.contains('target_roles', [filters.role_id])
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }

  // Pagination
  const page = filters?.page || 1
  const limit = filters?.limit || 20
  const from = (page - 1) * limit
  const to = from + limit - 1

  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to fetch dashboards: ${error.message}`)
  }

  return {
    dashboards: (data || []) as Dashboard[],
    total: count || 0,
    page,
    limit,
    has_more: count ? from + limit < count : false,
  }
}

/**
 * Fetch a single dashboard by ID
 */
export async function fetchDashboard(id: string): Promise<Dashboard | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('dashboards')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Failed to fetch dashboard:', error)
    return null
  }

  return data as Dashboard
}

/**
 * Create a new dashboard
 */
export async function createDashboard(input: CreateDashboardInput): Promise<Dashboard> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Get tenant_id from user metadata
  const tenant_id = user.user_metadata?.tenant_id

  const dashboard: Partial<Dashboard> = {
    ...input,
    tenant_id,
    owner_id: user.id,
    status: 'draft',
    is_template: false,
    created_by: user.id,
    last_modified_by: user.id,
    settings: {
      export_enabled: true,
      share_enabled: true,
      ...input.settings,
    },
  }

  const { data, error } = await supabase
    .from('dashboards')
    .insert(dashboard)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create dashboard: ${error.message}`)
  }

  return data as Dashboard
}

/**
 * Update an existing dashboard
 */
export async function updateDashboard(input: UpdateDashboardInput): Promise<Dashboard> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { id, ...updates } = input

  const { data, error } = await supabase
    .from('dashboards')
    .update({
      ...updates,
      last_modified_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update dashboard: ${error.message}`)
  }

  return data as Dashboard
}

/**
 * Delete a dashboard
 */
export async function deleteDashboard(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('dashboards')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete dashboard: ${error.message}`)
  }
}

/**
 * Duplicate a dashboard
 */
export async function duplicateDashboard(id: string, newName?: string): Promise<Dashboard> {
  const original = await fetchDashboard(id)
  if (!original) {
    throw new Error('Dashboard not found')
  }

  const input: CreateDashboardInput = {
    name: newName || `${original.name} (Copy)`,
    description: original.description,
    visibility: original.visibility,
    role_based: original.role_based,
    target_roles: original.target_roles,
    is_default: false, // Copies are never default
    layout: original.layout,
    widgets: original.widgets,
    settings: original.settings,
  }

  return createDashboard(input)
}

/**
 * Add a widget to a dashboard
 */
export async function addWidget(
  dashboardId: string,
  widget: Omit<DashboardWidget, 'id'>
): Promise<Dashboard> {
  const dashboard = await fetchDashboard(dashboardId)
  if (!dashboard) {
    throw new Error('Dashboard not found')
  }

  // Generate new widget ID
  const newWidget: DashboardWidget = {
    ...widget,
    id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  }

  // Add widget to dashboard
  const updatedWidgets = [...dashboard.widgets, newWidget]

  return updateDashboard({
    id: dashboardId,
    widgets: updatedWidgets,
  })
}

/**
 * Update a widget in a dashboard
 */
export async function updateWidget(
  dashboardId: string,
  widgetId: string,
  updates: Partial<DashboardWidget>
): Promise<Dashboard> {
  const dashboard = await fetchDashboard(dashboardId)
  if (!dashboard) {
    throw new Error('Dashboard not found')
  }

  const updatedWidgets = dashboard.widgets.map((w) =>
    w.id === widgetId ? { ...w, ...updates } : w
  )

  return updateDashboard({
    id: dashboardId,
    widgets: updatedWidgets,
  })
}

/**
 * Remove a widget from a dashboard
 */
export async function removeWidget(dashboardId: string, widgetId: string): Promise<Dashboard> {
  const dashboard = await fetchDashboard(dashboardId)
  if (!dashboard) {
    throw new Error('Dashboard not found')
  }

  const updatedWidgets = dashboard.widgets.filter((w) => w.id !== widgetId)

  return updateDashboard({
    id: dashboardId,
    widgets: updatedWidgets,
  })
}

/**
 * Reposition a widget
 */
export async function repositionWidget(
  dashboardId: string,
  widgetId: string,
  position: WidgetPosition
): Promise<Dashboard> {
  return updateWidget(dashboardId, widgetId, { position })
}

/**
 * Resize a widget
 */
export async function resizeWidget(
  dashboardId: string,
  widgetId: string,
  size: WidgetSize
): Promise<Dashboard> {
  return updateWidget(dashboardId, widgetId, { size })
}

/**
 * Fetch data for a widget
 */
export async function fetchWidgetData(
  widget: DashboardWidget,
  context?: Record<string, unknown>
): Promise<WidgetDataResponse> {
  try {
    if (!widget.data_source) {
      // Widget has no data source, return empty data
      return {
        widget_id: widget.id,
        data: null,
        metadata: {
          last_updated: new Date().toISOString(),
        },
      }
    }

    const { type, config } = widget.data_source

    switch (type) {
      case 'query':
        return await fetchQueryData(widget, config as QueryDataSource, context)
      case 'api':
        return await fetchAPIData(widget, config, context)
      case 'realtime':
        return await fetchRealtimeData(widget, config, context)
      case 'computed':
        return await fetchComputedData(widget, config, context)
      default:
        throw new Error(`Unsupported data source type: ${type}`)
    }
  } catch (error) {
    return {
      widget_id: widget.id,
      data: null,
      error: {
        code: 'FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

/**
 * Fetch data from database query
 */
async function fetchQueryData(
  widget: DashboardWidget,
  config: QueryDataSource,
  context?: Record<string, unknown>
): Promise<WidgetDataResponse> {
  const supabase = createClient()

  let query = supabase.from(config.entity).select(config.fields.join(','))

  // Apply filters
  if (config.filters?.length) {
    for (const filter of config.filters) {
      switch (filter.operator) {
        case 'equals':
          query = query.eq(filter.field, filter.value)
          break
        case 'not_equals':
          query = query.neq(filter.field, filter.value)
          break
        case 'greater_than':
          query = query.gt(filter.field, filter.value)
          break
        case 'less_than':
          query = query.lt(filter.field, filter.value)
          break
        case 'in':
          query = query.in(filter.field, filter.value as unknown[])
          break
        case 'is_null':
          query = query.is(filter.field, null)
          break
        case 'is_not_null':
          query = query.not(filter.field, 'is', null)
          break
        // Add more operators as needed
      }
    }
  }

  // Apply ordering
  if (config.order_by?.length) {
    for (const order of config.order_by) {
      query = query.order(order.field, { ascending: order.order === 'asc' })
    }
  }

  // Apply limit
  if (config.limit) {
    query = query.limit(config.limit)
  }

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Query failed: ${error.message}`)
  }

  return {
    widget_id: widget.id,
    data,
    metadata: {
      total_count: count || data?.length || 0,
      last_updated: new Date().toISOString(),
    },
  }
}

/**
 * Fetch data from external API
 */
async function fetchAPIData(
  widget: DashboardWidget,
  config: unknown,
  context?: Record<string, unknown>
): Promise<WidgetDataResponse> {
  // TODO: Implement API data fetching
  throw new Error('API data source not yet implemented')
}

/**
 * Fetch realtime data
 */
async function fetchRealtimeData(
  widget: DashboardWidget,
  config: unknown,
  context?: Record<string, unknown>
): Promise<WidgetDataResponse> {
  // TODO: Implement realtime data subscription
  throw new Error('Realtime data source not yet implemented')
}

/**
 * Fetch computed data
 */
async function fetchComputedData(
  widget: DashboardWidget,
  config: unknown,
  context?: Record<string, unknown>
): Promise<WidgetDataResponse> {
  // TODO: Implement computed data
  throw new Error('Computed data source not yet implemented')
}

/**
 * Get default dashboard for a user's role
 */
export async function getDefaultDashboard(roleId?: string): Promise<Dashboard | null> {
  const supabase = createClient()

  let query = supabase
    .from('dashboards')
    .select('*')
    .eq('is_default', true)
    .eq('status', 'active')

  if (roleId) {
    query = query.contains('target_roles', [roleId])
  }

  const { data, error } = await query.limit(1).single()

  if (error || !data) {
    return null
  }

  return data as Dashboard
}

/**
 * Check user permissions for a dashboard
 */
export async function checkDashboardPermissions(
  dashboardId: string,
  userId: string
): Promise<DashboardPermissions> {
  const dashboard = await fetchDashboard(dashboardId)

  if (!dashboard) {
    return {
      can_view: false,
      can_edit: false,
      can_delete: false,
      can_share: false,
      can_export: false,
      can_create_template: false,
    }
  }

  const isOwner = dashboard.owner_id === userId

  // Basic permissions logic (extend based on roles/permissions system)
  return {
    can_view: true, // TODO: Check visibility settings
    can_edit: isOwner || dashboard.visibility !== 'private',
    can_delete: isOwner,
    can_share: dashboard.settings.share_enabled && isOwner,
    can_export: dashboard.settings.export_enabled,
    can_create_template: isOwner,
  }
}

/**
 * Auto-layout widgets in a grid
 */
export function autoLayoutWidgets(
  widgets: DashboardWidget[],
  columns: number = 12
): DashboardWidget[] {
  let currentX = 0
  let currentY = 0
  let rowHeight = 0

  return widgets.map((widget) => {
    const widgetWidth = widget.size.width
    const widgetHeight = widget.size.height

    // Check if widget fits in current row
    if (currentX + widgetWidth > columns) {
      // Move to next row
      currentX = 0
      currentY += rowHeight
      rowHeight = 0
    }

    const updatedWidget = {
      ...widget,
      position: {
        ...widget.position,
        x: currentX,
        y: currentY,
      },
    }

    currentX += widgetWidth
    rowHeight = Math.max(rowHeight, widgetHeight)

    return updatedWidget
  })
}

/**
 * Validate widget configuration
 */
export function validateWidget(widget: DashboardWidget): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check if widget type is registered
  const definition = getWidgetDefinition(widget.type)
  if (!definition) {
    errors.push(`Unknown widget type: ${widget.type}`)
  }

  // Validate size constraints
  if (definition) {
    const { min_width, max_width, min_height, max_height } = definition.default_size

    if (min_width && widget.size.width < min_width) {
      errors.push(`Width must be at least ${min_width}`)
    }
    if (max_width && widget.size.width > max_width) {
      errors.push(`Width must be at most ${max_width}`)
    }
    if (min_height && widget.size.height < min_height) {
      errors.push(`Height must be at least ${min_height}`)
    }
    if (max_height && widget.size.height > max_height) {
      errors.push(`Height must be at most ${max_height}`)
    }
  }

  // Validate position (non-negative)
  if (widget.position.x < 0 || widget.position.y < 0) {
    errors.push('Position coordinates must be non-negative')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

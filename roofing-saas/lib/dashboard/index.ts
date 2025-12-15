/**
 * Dashboard Builder Module Index
 *
 * Central exports for the custom dashboard builder system.
 */

// Type exports
export type * from './dashboard-types'

// Engine exports
export {
  fetchDashboards,
  fetchDashboard,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  duplicateDashboard,
  addWidget,
  updateWidget,
  removeWidget,
  repositionWidget,
  resizeWidget,
  fetchWidgetData,
  getDefaultDashboard,
  checkDashboardPermissions,
  autoLayoutWidgets,
  validateWidget,
} from './dashboard-engine'

// Widget registry exports
export {
  registerWidget,
  getWidgetDefinition,
  getAllWidgets,
  getWidgetsByCategory,
  searchWidgets,
  isWidgetRegistered,
  unregisterWidget,
  clearRegistry,
} from './widget-registry'

// Template exports
export {
  getAllTemplates,
  getTemplate,
  getTemplatesByCategory,
  getTemplatesByRole,
  registerTemplate,
  salesDashboardTemplate,
  executiveDashboardTemplate,
  operationsDashboardTemplate,
  fieldRepDashboardTemplate,
} from './dashboard-templates'

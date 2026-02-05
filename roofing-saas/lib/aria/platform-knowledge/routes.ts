/**
 * App Route Definitions
 * Maps features and pages to their URLs.
 * Used by ARIA to understand where users are and navigate them.
 */

export interface RouteDefinition {
  /** Internal name */
  name: string
  /** Human-readable label */
  label: string
  /** URL path (without locale prefix) */
  path: string
  /** Description of what this page does */
  description: string
  /** Related features/keywords */
  keywords: string[]
  /** Parent route name (for hierarchy) */
  parent?: string
}

// =============================================================================
// Dashboard Routes
// =============================================================================

export const DASHBOARD_ROUTES: RouteDefinition[] = [
  {
    name: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    description: 'Main dashboard with overview metrics and recent activity',
    keywords: ['home', 'overview', 'metrics', 'summary'],
  },
  {
    name: 'contacts',
    label: 'Contacts',
    path: '/dashboard/contacts',
    description: 'Contact management - view, create, edit contacts',
    keywords: ['people', 'customers', 'leads', 'crm'],
  },
  {
    name: 'projects',
    label: 'Projects',
    path: '/dashboard/projects',
    description: 'Project list view - all projects',
    keywords: ['jobs', 'opportunities', 'work'],
  },
  {
    name: 'pipeline',
    label: 'Pipeline',
    path: '/dashboard/pipeline',
    description: 'Sales pipeline board - drag-and-drop kanban view',
    keywords: ['kanban', 'board', 'stages', 'sales'],
  },
  {
    name: 'calendar',
    label: 'Calendar',
    path: '/dashboard/calendar',
    description: 'Calendar view of appointments and scheduled tasks',
    keywords: ['schedule', 'appointments', 'events'],
  },
  {
    name: 'tasks',
    label: 'Tasks',
    path: '/dashboard/tasks',
    description: 'Task management - view and manage todos',
    keywords: ['todos', 'follow-ups', 'reminders'],
  },
]

// =============================================================================
// Campaign Routes
// =============================================================================

export const CAMPAIGN_ROUTES: RouteDefinition[] = [
  {
    name: 'campaigns',
    label: 'Campaigns',
    path: '/dashboard/campaigns',
    description: 'Campaign list - automated outreach campaigns',
    keywords: ['automation', 'drip', 'sequences', 'outreach'],
  },
  {
    name: 'campaign_new',
    label: 'New Campaign',
    path: '/dashboard/campaigns/new',
    description: 'Create a new campaign',
    keywords: ['create', 'new', 'automation'],
    parent: 'campaigns',
  },
]

// =============================================================================
// Estimate/Proposal Routes
// =============================================================================

export const ESTIMATE_ROUTES: RouteDefinition[] = [
  {
    name: 'estimates',
    label: 'Estimates',
    path: '/dashboard/estimates',
    description: 'Estimate and proposal management',
    keywords: ['quotes', 'proposals', 'pricing'],
  },
]

// =============================================================================
// Settings Routes
// =============================================================================

export const SETTINGS_ROUTES: RouteDefinition[] = [
  {
    name: 'settings',
    label: 'Settings',
    path: '/dashboard/settings',
    description: 'Account and company settings',
    keywords: ['preferences', 'configuration', 'account'],
  },
  {
    name: 'settings_profile',
    label: 'Profile Settings',
    path: '/dashboard/settings/profile',
    description: 'User profile settings',
    keywords: ['profile', 'account'],
    parent: 'settings',
  },
  {
    name: 'settings_company',
    label: 'Company Settings',
    path: '/dashboard/settings/company',
    description: 'Company information and branding',
    keywords: ['company', 'business', 'branding'],
    parent: 'settings',
  },
  {
    name: 'settings_team',
    label: 'Team Settings',
    path: '/dashboard/settings/team',
    description: 'Team member management',
    keywords: ['team', 'users', 'members', 'permissions'],
    parent: 'settings',
  },
  {
    name: 'settings_integrations',
    label: 'Integrations',
    path: '/dashboard/settings/integrations',
    description: 'Third-party integrations (QuickBooks, etc.)',
    keywords: ['integrations', 'quickbooks', 'connect'],
    parent: 'settings',
  },
]

// =============================================================================
// All Routes
// =============================================================================

export const ALL_ROUTES: RouteDefinition[] = [
  ...DASHBOARD_ROUTES,
  ...CAMPAIGN_ROUTES,
  ...ESTIMATE_ROUTES,
  ...SETTINGS_ROUTES,
]

/**
 * Find route by name
 */
export function getRouteByName(name: string): RouteDefinition | undefined {
  return ALL_ROUTES.find(r => r.name === name)
}

/**
 * Find route by path
 */
export function getRouteByPath(path: string): RouteDefinition | undefined {
  // Remove locale prefix if present
  const normalizedPath = path.replace(/^\/[a-z]{2}\//, '/')
  return ALL_ROUTES.find(r => r.path === normalizedPath || normalizedPath.startsWith(r.path + '/'))
}

/**
 * Search routes by keyword
 */
export function searchRoutes(query: string): RouteDefinition[] {
  const lowerQuery = query.toLowerCase()
  return ALL_ROUTES.filter(r =>
    r.name.toLowerCase().includes(lowerQuery) ||
    r.label.toLowerCase().includes(lowerQuery) ||
    r.description.toLowerCase().includes(lowerQuery) ||
    r.keywords.some(k => k.toLowerCase().includes(lowerQuery))
  )
}

/**
 * Get full URL for a route (with locale)
 */
export function getRouteUrl(name: string, locale: string = 'en'): string | undefined {
  const route = getRouteByName(name)
  if (!route) return undefined
  return `/${locale}${route.path}`
}

/**
 * Describe what a page does based on the URL
 */
export function describeCurrentPage(path: string): string {
  const route = getRouteByPath(path)
  if (route) {
    return route.description
  }

  // Try to infer from path
  if (path.includes('/contacts/')) return 'Viewing a contact details page'
  if (path.includes('/projects/')) return 'Viewing a project details page'
  if (path.includes('/campaigns/')) return 'Viewing a campaign details page'

  return 'Unknown page'
}

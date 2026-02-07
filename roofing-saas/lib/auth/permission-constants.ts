/**
 * Permission Constants & Types
 *
 * Pure data — safe for import in both client and server components.
 * Server-side functions live in permissions.ts (which re-exports these).
 */

// All available permission modules
export const PERMISSION_MODULES = [
  'contacts',
  'projects',
  'tasks',
  'activities',
  'calendar',
  'calls',
  'messages',
  'files',
  'reports',
  'analytics',
  'settings',
  'users',
  'team',
  'billing',
  'territories',
  'campaigns',
  'signatures',
  'voice_assistant',
] as const

export type PermissionModule = (typeof PERMISSION_MODULES)[number]

// All available permission actions
export const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete'] as const

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number]

// Permission structure for each module
export type ModulePermissions = Record<PermissionAction, boolean>

// Full permissions object
export type Permissions = Record<PermissionModule, ModulePermissions>

// Default permissions for new users
export const DEFAULT_USER_PERMISSIONS: Partial<Permissions> = {
  contacts: { view: true, create: true, edit: true, delete: false },
  projects: { view: true, create: true, edit: true, delete: false },
  tasks: { view: true, create: true, edit: true, delete: false },
  activities: { view: true, create: true, edit: true, delete: false },
  calendar: { view: true, create: true, edit: true, delete: false },
  calls: { view: true, create: true, edit: false, delete: false },
  messages: { view: true, create: true, edit: false, delete: false },
  files: { view: true, create: true, edit: true, delete: false },
  reports: { view: true, create: false, edit: false, delete: false },
  analytics: { view: true, create: false, edit: false, delete: false },
  settings: { view: false, create: false, edit: false, delete: false },
  users: { view: false, create: false, edit: false, delete: false },
  team: { view: false, create: false, edit: false, delete: false },
  billing: { view: false, create: false, edit: false, delete: false },
  territories: { view: true, create: false, edit: false, delete: false },
  campaigns: { view: true, create: false, edit: false, delete: false },
  signatures: { view: true, create: true, edit: false, delete: false },
  voice_assistant: { view: true, create: true, edit: false, delete: false },
}

// Admin permissions (full access except billing)
export const ADMIN_PERMISSIONS: Permissions = PERMISSION_MODULES.reduce(
  (acc, module) => {
    acc[module] = {
      view: true,
      create: true,
      edit: true,
      delete: module !== 'billing', // Only owner can delete billing-related items
    }
    return acc
  },
  {} as Permissions
)

// Owner permissions (full access to everything)
export const OWNER_PERMISSIONS: Permissions = PERMISSION_MODULES.reduce(
  (acc, module) => {
    acc[module] = { view: true, create: true, edit: true, delete: true }
    return acc
  },
  {} as Permissions
)

// Empty/no permissions
export const NO_PERMISSIONS: Permissions = PERMISSION_MODULES.reduce(
  (acc, module) => {
    acc[module] = { view: false, create: false, edit: false, delete: false }
    return acc
  },
  {} as Permissions
)

/**
 * Get human-readable permission label
 */
export function getPermissionLabel(
  module: PermissionModule,
  action: PermissionAction
): string {
  const moduleLabels: Record<PermissionModule, string> = {
    contacts: 'Contacts',
    projects: 'Projects',
    tasks: 'Tasks',
    activities: 'Activities',
    calendar: 'Calendar',
    calls: 'Calls',
    messages: 'Messages',
    files: 'Files',
    reports: 'Reports',
    analytics: 'Analytics',
    settings: 'Settings',
    users: 'Users',
    team: 'Team',
    billing: 'Billing',
    territories: 'Territories',
    campaigns: 'Campaigns',
    signatures: 'Signatures',
    voice_assistant: 'Voice Assistant',
  }

  const actionLabels: Record<PermissionAction, string> = {
    view: 'View',
    create: 'Create',
    edit: 'Edit',
    delete: 'Delete',
  }

  return `${actionLabels[action]} ${moduleLabels[module]}`
}

/**
 * Permission module groupings for UI display
 */
export const PERMISSION_GROUPS = [
  {
    name: 'CRM',
    modules: ['contacts', 'projects', 'tasks', 'activities'] as PermissionModule[],
  },
  {
    name: 'Communication',
    modules: ['calls', 'messages', 'campaigns'] as PermissionModule[],
  },
  {
    name: 'Documents',
    modules: ['files', 'signatures'] as PermissionModule[],
  },
  {
    name: 'Scheduling',
    modules: ['calendar', 'territories'] as PermissionModule[],
  },
  {
    name: 'Intelligence',
    modules: ['reports', 'analytics', 'voice_assistant'] as PermissionModule[],
  },
  {
    name: 'Administration',
    modules: ['settings', 'users', 'team', 'billing'] as PermissionModule[],
  },
]

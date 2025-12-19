/**
 * UI Preferences Types and Database Operations
 * 
 * Defines the types and database operations for user UI preferences
 * including navigation style, UI mode, and other interface settings.
 */

/**
 * Navigation styles for the UI
 */
export type NavStyle = 'traditional' | 'instagram'

/**
 * Available UI modes
 */
export type UIMode = 'field' | 'manager' | 'full'

/**
 * User interface preferences that persist in the database
 */
export interface UIPreferences {
  /** Navigation style preference */
  nav_style: NavStyle
  /** UI mode preference (may be overridden by auto-detection) */
  ui_mode?: UIMode
  /** Whether to auto-detect UI mode based on device/context */
  ui_mode_auto_detect: boolean
  /** Theme preference */
  theme: 'light' | 'dark' | 'system'
  /** Whether sidebar is collapsed by default */
  sidebar_collapsed: boolean
}

/**
 * Database row type for user_ui_preferences table
 */
export interface UIPreferencesRow extends UIPreferences {
  id: string
  tenant_id: string
  user_id: string
  created_at: string
  updated_at: string
}

/**
 * Input type for creating/updating UI preferences
 */
export interface UIPreferencesInput extends Partial<UIPreferences> {
  nav_style?: NavStyle
}

/**
 * Default UI preferences
 */
export const DEFAULT_UI_PREFERENCES: UIPreferences = {
  nav_style: 'traditional',
  ui_mode: undefined, // Will be auto-detected
  ui_mode_auto_detect: true,
  theme: 'system',
  sidebar_collapsed: false,
} as const

/**
 * Local storage key for UI preferences cache
 */
export const UI_PREFERENCES_STORAGE_KEY = 'ui_preferences_cache' as const

/**
 * Navigation style storage key for backward compatibility with existing localStorage
 */
export const NAV_STYLE_STORAGE_KEY = 'nav_style_preference' as const

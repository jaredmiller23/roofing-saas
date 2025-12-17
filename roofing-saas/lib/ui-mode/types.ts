/**
 * UI Mode Types
 *
 * Defines the adaptive UI system that allows the app to switch between
 * different interface modes optimized for different user types and contexts.
 */

/**
 * Available UI modes for the application
 * - field: Optimized for field workers (simplified, mobile-first)
 * - manager: Optimized for managers (dashboard-focused, analytics)
 * - full: Full desktop interface (all features, complex layouts)
 */
export type UIMode = 'field' | 'manager' | 'full'

/**
 * Configuration for each UI mode
 */
export interface UIModeConfig {
  /** Human-readable name for the mode */
  name: string
  /** Description of when to use this mode */
  description: string
  /** Whether this mode is mobile-optimized */
  isMobileOptimized: boolean
  /** Whether this mode shows simplified navigation */
  hasSimplifiedNav: boolean
  /** Whether this mode shows the full feature set */
  hasFullFeatures: boolean
  /** Whether this mode includes analytics/reporting features */
  hasAnalytics: boolean
  /** Whether this mode supports complex multi-panel layouts */
  supportsComplexLayouts: boolean
}

/**
 * Detection context for automatic mode selection
 */
export interface UIModeDetectionContext {
  /** User's role in the organization */
  userRole?: string
  /** Device type being used */
  deviceType: 'mobile' | 'tablet' | 'desktop'
  /** Screen size category */
  screenSize: 'small' | 'medium' | 'large'
  /** Whether user is likely in the field */
  isFieldContext?: boolean
  /** User's department or team */
  department?: string
}

/**
 * Complete UI mode configuration mapping
 */
export const UI_MODE_CONFIGS: Record<UIMode, UIModeConfig> = {
  field: {
    name: 'Field Mode',
    description: 'Optimized for field workers doing door-to-door sales',
    isMobileOptimized: true,
    hasSimplifiedNav: true,
    hasFullFeatures: false,
    hasAnalytics: false,
    supportsComplexLayouts: false,
  },
  manager: {
    name: 'Manager Mode',
    description: 'Dashboard-focused interface for team management',
    isMobileOptimized: false,
    hasSimplifiedNav: false,
    hasFullFeatures: true,
    hasAnalytics: true,
    supportsComplexLayouts: true,
  },
  full: {
    name: 'Full Desktop Mode',
    description: 'Complete feature set with advanced layouts',
    isMobileOptimized: false,
    hasSimplifiedNav: false,
    hasFullFeatures: true,
    hasAnalytics: true,
    supportsComplexLayouts: true,
  },
} as const

/**
 * Context value type for the UI Mode provider
 */
export interface UIModeContextValue {
  /** Current UI mode */
  mode: UIMode
  /** Configuration for the current mode */
  config: UIModeConfig
  /** Whether the mode is being automatically detected */
  isAutoDetected: boolean
  /** Whether the user has manually overridden the mode */
  hasUserOverride: boolean
  /** Detection context used for auto-detection */
  detectionContext: UIModeDetectionContext | null
  /** Function to manually set the UI mode */
  setMode: (mode: UIMode, isUserOverride?: boolean) => void
  /** Function to reset to auto-detected mode */
  resetToAutoDetected: () => void
  /** Function to refresh auto-detection */
  refreshDetection: () => void
}

/**
 * Storage key for persisting user's mode preference
 */
export const UI_MODE_STORAGE_KEY = 'ui_mode_preference' as const

/**
 * Default UI mode to use if detection fails
 */
export const DEFAULT_UI_MODE: UIMode = 'full' as const
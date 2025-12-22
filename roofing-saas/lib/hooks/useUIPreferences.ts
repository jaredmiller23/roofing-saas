'use client'

/**
 * UI Preferences Hook
 *
 * Provides access to user UI preferences including navigation style,
 * theme, and other interface settings.
 *
 * IMPORTANT: This hook now consumes from UIPreferencesContext to ensure
 * all components share the same state instance. When Settings updates
 * nav_style, AdaptiveLayout and all other consumers see the change immediately.
 *
 * Previously, this hook created local state per component, causing Settings
 * and AdaptiveLayout to have independent state - changes in one didn't
 * reflect in the other.
 */

import { useUIPreferencesContext } from '@/lib/ui-preferences/context'
import type { NavStyle, UIMode } from '@/lib/db/ui-preferences'

export interface UseUIPreferencesReturn {
  /** Current UI preferences */
  preferences: {
    nav_style: NavStyle
    ui_mode?: UIMode
    ui_mode_auto_detect: boolean
    theme: 'light' | 'dark' | 'system'
    sidebar_collapsed: boolean
  }
  /** Loading state during initial fetch */
  loading: boolean
  /** Whether the component is mounted (avoids hydration issues) */
  mounted: boolean
  /** Update navigation style */
  setNavStyle: (navStyle: NavStyle) => Promise<void>
  /** Update UI mode */
  setUIMode: (uiMode: UIMode | undefined, autoDetect?: boolean) => Promise<void>
  /** Update multiple preferences at once */
  updatePreferences: (preferences: Partial<{
    nav_style: NavStyle
    ui_mode?: UIMode
    ui_mode_auto_detect: boolean
    theme: 'light' | 'dark' | 'system'
    sidebar_collapsed: boolean
  }>) => Promise<void>
  /** Refresh preferences from database */
  refresh: () => Promise<void>
}

/**
 * Hook to access and manage user UI preferences
 *
 * This hook consumes from UIPreferencesContext to ensure shared state.
 * Must be used within a UIPreferencesProvider.
 */
export function useUIPreferences(): UseUIPreferencesReturn {
  return useUIPreferencesContext()
}

/**
 * Utility function to get navigation style display name
 */
export function getNavStyleDisplayName(navStyle: NavStyle): string {
  switch (navStyle) {
    case 'traditional':
      return 'Traditional'
    case 'instagram':
      return 'Instagram Style'
    default:
      return 'Unknown'
  }
}

/**
 * Utility function to get navigation style description
 */
export function getNavStyleDescription(navStyle: NavStyle): string {
  switch (navStyle) {
    case 'traditional':
      return 'Classic navigation with sidebar and top bar'
    case 'instagram':
      return 'Instagram-inspired layout with bottom navigation and stories'
    default:
      return 'Unknown navigation style'
  }
}
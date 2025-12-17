'use client'

/**
 * useUIMode Hook
 *
 * Convenient hook for components to access and control UI mode state.
 * Provides the current mode, configuration, and helper functions.
 */

import { useMemo } from 'react'
import { useUIModeContext } from '@/lib/ui-mode/context'
import type { UIMode, UIModeConfig } from '@/lib/ui-mode/types'

/**
 * Return type for the useUIMode hook
 */
export interface UseUIModeReturn {
  /** Current UI mode */
  mode: UIMode
  /** Configuration for the current mode */
  config: UIModeConfig
  /** Whether the mode is automatically detected */
  isAutoDetected: boolean
  /** Whether the user has manually overridden the mode */
  hasUserOverride: boolean
  /** Function to manually set the UI mode */
  setMode: (mode: UIMode, isUserOverride?: boolean) => void
  /** Function to reset to auto-detected mode */
  resetToAutoDetected: () => void
  /** Function to refresh auto-detection */
  refreshDetection: () => void
  /** Helper functions for checking current mode */
  isFieldMode: boolean
  isManagerMode: boolean
  isFullMode: boolean
  /** Helper functions for checking mode capabilities */
  isMobileOptimized: boolean
  hasSimplifiedNav: boolean
  hasFullFeatures: boolean
  hasAnalytics: boolean
  supportsComplexLayouts: boolean
}

/**
 * Hook to access UI mode state and helpers
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { mode, isFieldMode, hasAnalytics, setMode } = useUIMode()
 *
 *   if (isFieldMode) {
 *     return <SimplifiedView />
 *   }
 *
 *   return (
 *     <div>
 *       {hasAnalytics && <AnalyticsPanel />}
 *       <MainContent />
 *     </div>
 *   )
 * }
 * ```
 */
export function useUIMode(): UseUIModeReturn {
  const context = useUIModeContext()

  const helpers = useMemo(() => ({
    // Mode type checks
    isFieldMode: context.mode === 'field',
    isManagerMode: context.mode === 'manager',
    isFullMode: context.mode === 'full',

    // Capability checks (from current config)
    isMobileOptimized: context.config.isMobileOptimized,
    hasSimplifiedNav: context.config.hasSimplifiedNav,
    hasFullFeatures: context.config.hasFullFeatures,
    hasAnalytics: context.config.hasAnalytics,
    supportsComplexLayouts: context.config.supportsComplexLayouts,
  }), [context.mode, context.config])

  return {
    mode: context.mode,
    config: context.config,
    isAutoDetected: context.isAutoDetected,
    hasUserOverride: context.hasUserOverride,
    setMode: context.setMode,
    resetToAutoDetected: context.resetToAutoDetected,
    refreshDetection: context.refreshDetection,
    ...helpers,
  }
}

/**
 * Hook to check if current mode has a specific capability
 *
 * @param capability - The capability to check
 * @returns Whether the current mode supports the capability
 *
 * @example
 * ```tsx
 * function AnalyticsWidget() {
 *   const hasAnalytics = useUIModeCapability('hasAnalytics')
 *
 *   if (!hasAnalytics) {
 *     return null
 *   }
 *
 *   return <AnalyticsChart />
 * }
 * ```
 */
export function useUIModeCapability(
  capability: keyof Pick<
    UIModeConfig,
    | 'isMobileOptimized'
    | 'hasSimplifiedNav'
    | 'hasFullFeatures'
    | 'hasAnalytics'
    | 'supportsComplexLayouts'
  >
): boolean {
  const { config } = useUIModeContext()
  return config[capability]
}

/**
 * Hook to check if current mode matches any of the provided modes
 *
 * @param modes - Array of modes to check against
 * @returns Whether the current mode is one of the provided modes
 *
 * @example
 * ```tsx
 * function AdminPanel() {
 *   const isAdminMode = useUIModeMatch(['manager', 'full'])
 *
 *   if (!isAdminMode) {
 *     return <AccessDenied />
 *   }
 *
 *   return <AdminInterface />
 * }
 * ```
 */
export function useUIModeMatch(modes: UIMode[]): boolean {
  const { mode } = useUIModeContext()
  return modes.includes(mode)
}
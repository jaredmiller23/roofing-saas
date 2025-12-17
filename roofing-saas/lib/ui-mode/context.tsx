'use client'

/**
 * UI Mode Context
 *
 * Provides global state management for adaptive UI modes, allowing the app
 * to switch between field worker, manager, and full desktop layouts.
 */

import { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react'
import type {
  UIMode,
  UIModeConfig,
  UIModeContextValue,
  UIModeDetectionContext,
} from './types'
import {
  UI_MODE_CONFIGS,
  UI_MODE_STORAGE_KEY,
  DEFAULT_UI_MODE,
} from './types'
import { detectUIMode as detectUIModeFromDevice, getDeviceInfo, createDetectionContext } from './detection'

const UIModeContext = createContext<UIModeContextValue | undefined>(undefined)

/**
 * Detects appropriate UI mode based on context (including user role and device)
 */
function detectUIMode(context: UIModeDetectionContext): UIMode {
  // Priority 1: User role-based detection
  // Field mode for field workers regardless of device
  if (
    context.userRole === 'field_rep' ||
    context.userRole === 'canvasser' ||
    context.department === 'sales'
  ) {
    return 'field'
  }

  // Manager mode for management roles on desktop/tablet
  if (
    context.userRole === 'manager' ||
    context.userRole === 'supervisor' ||
    context.department === 'management'
  ) {
    return 'manager'
  }

  // Priority 2: Device-based detection when no user role is available
  // Use our comprehensive device detection as fallback
  return detectUIModeFromDevice()
}

/**
 * Gets current detection context from browser/device
 */
function getCurrentDetectionContext(): UIModeDetectionContext {
  // Use our comprehensive device detection
  const deviceInfo = getDeviceInfo()

  // Create detection context with enhanced device information
  return createDetectionContext(deviceInfo)
}

/**
 * UI Mode Provider
 *
 * Manages state for adaptive UI modes with automatic detection and user overrides
 */
export function UIModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<UIMode>(DEFAULT_UI_MODE)
  const [isAutoDetected, setIsAutoDetected] = useState(true)
  const [hasUserOverride, setHasUserOverride] = useState(false)
  const [detectionContext, setDetectionContext] = useState<UIModeDetectionContext | null>(null)

  // Initialize mode on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    const initializeMode = () => {
      try {
        // Get current detection context
        const context = getCurrentDetectionContext()
        setDetectionContext(context)

        // Check for user preference in localStorage
        const storedPreference = localStorage.getItem(UI_MODE_STORAGE_KEY)

        if (storedPreference && (storedPreference as UIMode) in UI_MODE_CONFIGS) {
          // User has a stored preference
          setModeState(storedPreference as UIMode)
          setIsAutoDetected(false)
          setHasUserOverride(true)
        } else {
          // Auto-detect based on context
          const detectedMode = detectUIMode(context)
          setModeState(detectedMode)
          setIsAutoDetected(true)
          setHasUserOverride(false)
        }
      } catch (error) {
        console.error('Failed to initialize UI mode:', error)
        // Fallback to default mode
        setModeState(DEFAULT_UI_MODE)
        setIsAutoDetected(true)
        setHasUserOverride(false)
      }
    }

    initializeMode()

    // Listen for window resize to update detection context
    const handleResize = () => {
      const context = getCurrentDetectionContext()
      setDetectionContext(context)

      // If in auto-detected mode, re-detect
      if (isAutoDetected && !hasUserOverride) {
        const newMode = detectUIMode(context)
        setModeState(newMode)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isAutoDetected, hasUserOverride])

  // Persist user preference when mode changes with user override
  useEffect(() => {
    if (typeof window === 'undefined' || !hasUserOverride) return

    try {
      localStorage.setItem(UI_MODE_STORAGE_KEY, mode)
    } catch (error) {
      console.error('Failed to persist UI mode preference:', error)
    }
  }, [mode, hasUserOverride])

  // Manual mode setter
  const setMode = useCallback((newMode: UIMode, isUserOverride = true) => {
    setModeState(newMode)
    setHasUserOverride(isUserOverride)
    setIsAutoDetected(!isUserOverride)
  }, [])

  // Reset to auto-detected mode
  const resetToAutoDetected = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(UI_MODE_STORAGE_KEY)
      } catch (error) {
        console.error('Failed to clear UI mode preference:', error)
      }
    }

    if (detectionContext) {
      const detectedMode = detectUIMode(detectionContext)
      setModeState(detectedMode)
    }

    setIsAutoDetected(true)
    setHasUserOverride(false)
  }, [detectionContext])

  // Refresh detection context and re-detect if in auto mode
  const refreshDetection = useCallback(() => {
    const context = getCurrentDetectionContext()
    setDetectionContext(context)

    if (isAutoDetected && !hasUserOverride) {
      const newMode = detectUIMode(context)
      setModeState(newMode)
    }
  }, [isAutoDetected, hasUserOverride])

  // Get current mode configuration
  const config: UIModeConfig = UI_MODE_CONFIGS[mode]

  const contextValue: UIModeContextValue = {
    mode,
    config,
    isAutoDetected,
    hasUserOverride,
    detectionContext,
    setMode,
    resetToAutoDetected,
    refreshDetection,
  }

  return (
    <UIModeContext.Provider value={contextValue}>
      {children}
    </UIModeContext.Provider>
  )
}

/**
 * Hook to access UI Mode context
 * Must be used within UIModeProvider
 */
export function useUIModeContext() {
  const context = useContext(UIModeContext)

  if (!context) {
    throw new Error('useUIModeContext must be used within UIModeProvider')
  }

  return context
}

/**
 * Export the context itself for advanced use cases
 */
export { UIModeContext }
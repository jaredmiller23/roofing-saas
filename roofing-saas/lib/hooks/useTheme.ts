'use client'

import { useTheme as useNextTheme } from 'next-themes'
import { useEffect, useState } from 'react'

/**
 * Custom useTheme hook
 * 
 * Wraps next-themes useTheme with additional functionality:
 * - Handles hydration mismatch
 * - Provides loading state
 * - Type-safe theme values
 */
export function useTheme() {
  const { theme, setTheme, resolvedTheme, themes, systemTheme } = useNextTheme()
  const [mounted, setMounted] = useState(false)

  // Ensure we're on the client side to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Return safe values during SSR
  if (!mounted) {
    return {
      theme: 'system' as const,
      setTheme,
      resolvedTheme: undefined,
      themes: themes || ['light', 'dark', 'system'],
      systemTheme: undefined,
      mounted: false,
    }
  }

  return {
    theme,
    setTheme,
    resolvedTheme,
    themes,
    systemTheme,
    mounted: true,
  }
}

// Theme-related utility functions
export const getThemeDisplayName = (theme: string) => {
  switch (theme) {
    case 'light':
      return 'Light'
    case 'dark':
      return 'Dark'
    case 'system':
      return 'System'
    default:
      return 'Unknown'
  }
}

export const getThemeIcon = (theme: string) => {
  switch (theme) {
    case 'light':
      return 'sun'
    case 'dark':
      return 'moon'
    case 'system':
      return 'monitor'
    default:
      return 'monitor'
  }
}

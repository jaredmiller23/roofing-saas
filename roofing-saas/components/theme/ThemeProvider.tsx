'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ThemeProviderProps } from 'next-themes'

/**
 * Theme Provider for the application
 *
 * Wraps the application with next-themes provider to enable:
 * - System preference detection (prefers-color-scheme)
 * - Manual theme toggling
 * - Persistent theme storage
 * - Smooth transitions between themes
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
      storageKey="clarity-theme"
      themes={['light', 'dark', 'system']}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

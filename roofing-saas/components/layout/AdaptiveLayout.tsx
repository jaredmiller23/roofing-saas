'use client'

/**
 * Adaptive Layout Component
 *
 * Conditionally renders different layouts based on the current UI mode.
 * This component will be expanded in Phase 2 to show different layouts
 * for field, manager, and desktop modes.
 */

import { ReactNode } from 'react'
import { useUIModeContext } from '@/lib/ui-mode/context'

interface AdaptiveLayoutProps {
  children: ReactNode
}

export function AdaptiveLayout({ children }: AdaptiveLayoutProps) {
  const { mode, config } = useUIModeContext()

  // Log current mode for verification (as requested in success criteria)
  console.log('AdaptiveLayout - Current UI Mode:', mode, 'Config:', config)

  // Phase 1: Just pass through children without any layout changes
  // Phase 2 will implement different layouts for each mode
  return (
    <>
      {children}
    </>
  )
}
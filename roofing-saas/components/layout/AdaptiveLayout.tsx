'use client'

/**
 * Adaptive Layout Component
 *
 * Conditionally renders different layouts based on the current UI mode.
 * - Field mode: Shows FieldWorkerNav + FieldWorkerHome on dashboard route
 * - Full/Manager modes: Pass through children (existing Sidebar handles nav)
 */

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useUIModeContext } from '@/lib/ui-mode/context'
import { FieldWorkerNav } from '@/components/layout/FieldWorkerNav'
import { FieldWorkerHome } from '@/components/layout/FieldWorkerHome'

interface AdaptiveLayoutProps {
  children: ReactNode
  userEmail: string
  userRole: string
}

export function AdaptiveLayout({ children, userEmail, userRole }: AdaptiveLayoutProps) {
  const { mode, config } = useUIModeContext()
  const pathname = usePathname()

  // Log current mode for verification (as requested in success criteria)
  console.log('AdaptiveLayout - Current UI Mode:', mode, 'Config:', config)

  // Check if we're on the dashboard route (handles locale prefixes)
  const isOnDashboard = pathname.endsWith('/dashboard')

  // Field mode: Show field-specific UI with full-screen layout
  if (mode === 'field') {
    return (
      <div className="lg:-ml-64 w-screen min-h-screen bg-background">
        <FieldWorkerNav userEmail={userEmail} userRole={userRole} />
        <div className="pt-14">
          {isOnDashboard ? <FieldWorkerHome /> : children}
        </div>
      </div>
    )
  }

  // Full/Manager modes: Pass through children (Sidebar handles navigation)
  return (
    <>
      {children}
    </>
  )
}
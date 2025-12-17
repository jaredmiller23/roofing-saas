'use client'

/**
 * Adaptive Layout Component
 *
 * Conditionally renders different layouts based on the current UI mode.
 * - Field mode: Shows FieldWorkerNav + FieldWorkerHome on dashboard route
 * - Manager mode: Shows ManagerLayout with collapsible sidebar
 * - Full mode: Pass through children (existing Sidebar handles nav)
 *
 * Note: The default Sidebar is rendered in layout.tsx. For field and manager modes,
 * we use CSS to hide/override it and render our own navigation.
 */

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useUIModeContext } from '@/lib/ui-mode/context'
import { FieldWorkerNav } from '@/components/layout/FieldWorkerNav'
import { FieldWorkerHome } from '@/components/layout/FieldWorkerHome'
import { ManagerLayout } from '@/components/layout/ManagerLayout'

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
  // Uses negative margin to hide the default sidebar
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

  // Manager mode: Show collapsible sidebar optimized for tablets
  // Uses negative margin to hide the default sidebar, then renders ManagerLayout
  if (mode === 'manager') {
    return (
      <div className="lg:-ml-64 w-screen min-h-screen">
        <ManagerLayout userEmail={userEmail} userRole={userRole}>
          {children}
        </ManagerLayout>
      </div>
    )
  }

  // Full mode: Pass through children (default Sidebar handles navigation)
  return (
    <>
      {children}
    </>
  )
}
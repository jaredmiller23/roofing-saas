'use client'

/**
 * Adaptive Layout Component
 *
 * Conditionally renders different layouts based on the current UI mode and navigation style.
 * - Field mode:
 *   - Traditional navStyle: Shows FieldWorkerNav + FieldWorkerHome on dashboard route
 *   - Instagram navStyle: Shows FieldWorkerLayoutIG with top bar, stories, and bottom nav
 * - Manager mode: Shows ManagerLayout with collapsible sidebar
 * - Full mode: Pass through children (existing Sidebar handles nav)
 *
 * Navigation style switching:
 * - Reads navStyle from UIPreferences to determine layout style
 * - Handles smooth transitions between traditional and Instagram layouts
 * - Maintains route state when switching navigation styles
 * - Provides loading state to avoid layout flash during preference loading
 *
 * Note: The default Sidebar is rendered in layout.tsx. For field and manager modes,
 * we use CSS to hide/override it and render our own navigation.
 */

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useUIModeContext } from '@/lib/ui-mode/context'
import { useUIPreferences } from '@/lib/hooks/useUIPreferences'
import { FieldWorkerNav } from '@/components/layout/FieldWorkerNav'
import { FieldWorkerHome } from '@/components/layout/FieldWorkerHome'
import { FieldWorkerLayoutIG } from '@/components/layout/FieldWorkerLayoutIG'
import { ManagerLayout } from '@/components/layout/ManagerLayout'

interface AdaptiveLayoutProps {
  children: ReactNode
  userEmail: string
  userRole: string
}

export function AdaptiveLayout({ children, userEmail, userRole }: AdaptiveLayoutProps) {
  const { mode, config } = useUIModeContext()
  const { preferences, mounted } = useUIPreferences()
  const pathname = usePathname()

  // Log current mode and navigation style for verification (as requested in success criteria)
  console.log('AdaptiveLayout - Current UI Mode:', mode, 'Config:', config, 'NavStyle:', preferences.nav_style)

  // Check if we're on the dashboard route (handles locale prefixes)
  const isOnDashboard = pathname.endsWith('/dashboard')

  // Field mode: Show field-specific UI with full-screen layout
  // Uses negative margin to hide the default sidebar
  if (mode === 'field') {
    // Wait for preferences to load to avoid flash
    if (!mounted) {
      return (
        <div className="lg:-ml-64 w-screen min-h-screen bg-background flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      )
    }

    // Smooth transition wrapper to prevent layout shift when switching navigation styles
    const layoutContent = preferences.nav_style === 'instagram' ? (
      <FieldWorkerLayoutIG
        topBarProps={{
          showNotificationBadge: true, // Show notification badge in IG mode
          notificationCount: 0, // Can be passed from parent or fetched from API
        }}
        showStories={true} // Enable stories in IG mode
        showBottomNav={true} // Enable bottom navigation
        className="transition-opacity duration-300 ease-in-out" // Smooth transition
      >
        {isOnDashboard ? <FieldWorkerHome /> : children}
      </FieldWorkerLayoutIG>
    ) : (
      // Traditional navigation layout (default)
      <div className="transition-opacity duration-300 ease-in-out">
        <FieldWorkerNav userEmail={userEmail} userRole={userRole} />
        <div className="pt-14">
          {isOnDashboard ? <FieldWorkerHome /> : children}
        </div>
      </div>
    )

    return (
      <div className="lg:-ml-64 w-screen min-h-screen bg-background">
        {layoutContent}
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
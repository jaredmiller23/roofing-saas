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

import { ReactNode, useEffect, useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
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
  const router = useRouter()

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Search state
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  // Determine if we're in Instagram navigation mode
  const isInstagramMode = mode === 'field' && preferences.nav_style === 'instagram'

  // Manage body classes for CSS-based layout control
  // This allows hiding the sidebar via CSS instead of negative margins
  useEffect(() => {
    // Clear all mode classes first
    document.body.classList.remove('ig-nav-active', 'field-mode-active', 'manager-mode-active')

    // Add appropriate class based on mode
    if (mode === 'field') {
      document.body.classList.add('field-mode-active')
      if (isInstagramMode) {
        document.body.classList.add('ig-nav-active')
      }
    } else if (mode === 'manager') {
      document.body.classList.add('manager-mode-active')
    }

    return () => {
      document.body.classList.remove('ig-nav-active', 'field-mode-active', 'manager-mode-active')
    }
  }, [mode, isInstagramMode])

  // Drawer handlers
  const handleDrawerOpen = useCallback(() => {
    setIsDrawerOpen(true)
  }, [])

  const handleDrawerClose = useCallback(() => {
    setIsDrawerOpen(false)
  }, [])

  // Search handlers
  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value)
  }, [])

  const handleSearchSubmit = useCallback((value: string) => {
    // Navigate to contacts page with search query
    // TODO: Implement dedicated search page or global search
    if (value.trim()) {
      router.push(`/contacts?search=${encodeURIComponent(value.trim())}`)
      setIsSearchExpanded(false)
      setSearchValue('')
    }
  }, [router])

  const handleSearchClear = useCallback(() => {
    setSearchValue('')
  }, [])

  const handleSearchToggle = useCallback((expanded: boolean) => {
    setIsSearchExpanded(expanded)
    if (!expanded) {
      setSearchValue('')
    }
  }, [])

  // Log current mode and navigation style for verification (as requested in success criteria)
  console.log('AdaptiveLayout - Current UI Mode:', mode, 'Config:', config, 'NavStyle:', preferences.nav_style)

  // Check if we're on the dashboard route (handles locale prefixes)
  const isOnDashboard = pathname.endsWith('/dashboard')

  // Field mode: Show field-specific UI with full-screen layout
  // Sidebar is hidden via CSS (field-mode-active class on body)
  if (mode === 'field') {
    // Wait for preferences to load to avoid flash
    if (!mounted) {
      return (
        <div className="w-full min-h-screen bg-background flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      )
    }

    // Smooth transition wrapper to prevent layout shift when switching navigation styles
    const layoutContent = preferences.nav_style === 'instagram' ? (
      <FieldWorkerLayoutIG
        // Drawer props
        isDrawerOpen={isDrawerOpen}
        onDrawerOpen={handleDrawerOpen}
        onDrawerClose={handleDrawerClose}
        // Search props
        isSearchExpanded={isSearchExpanded}
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        onSearchSubmit={handleSearchSubmit}
        onSearchClear={handleSearchClear}
        onSearchToggle={handleSearchToggle}
        // Other props
        showStories={false} // Disable stories (not requested)
        showBottomNav={true}
        className="transition-opacity duration-300 ease-in-out"
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
      <div className="w-full min-h-screen bg-background">
        {layoutContent}
      </div>
    )
  }

  // Manager mode: Show collapsible sidebar optimized for tablets
  // Sidebar is hidden via CSS (manager-mode-active class on body)
  if (mode === 'manager') {
    return (
      <div className="w-full min-h-screen">
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
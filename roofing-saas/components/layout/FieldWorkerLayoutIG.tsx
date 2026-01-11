'use client'

/**
 * FieldWorkerLayoutIG Component
 *
 * Instagram-style layout wrapper for field worker mode.
 * Combines all IG-style components into a cohesive layout.
 *
 * Structure:
 * - FieldWorkerTopBarIG (fixed top)
 * - StoriesRow (optional, below top bar)
 * - Main content area (scrollable)
 * - FieldWorkerBottomNav (fixed bottom)
 *
 * Features:
 * - Safe area handling for notched devices
 * - Proper scroll behavior with fixed elements
 * - Responsive design
 * - Accessibility support
 */

import { ReactNode } from 'react'
import { FieldWorkerTopBarIG } from './FieldWorkerTopBarIG'
import { FieldWorkerBottomNav } from './FieldWorkerBottomNav'
import { StoriesRow } from './StoriesRow'
import { NavigationDrawer } from './NavigationDrawer'
import { cn } from '@/lib/utils'
import type { FieldWorkerTopBarIGProps } from './types'
import type { EnhancedStory, QuickAction } from './StoriesRow'

export interface FieldWorkerLayoutIGProps {
  /** Main content to render in the scrollable area */
  children: ReactNode
  /** CSS class name for custom styling */
  className?: string
  /** CSS class name for the main content area */
  contentClassName?: string
  /** Props for the top bar component */
  topBarProps?: Omit<FieldWorkerTopBarIGProps, 'stories' | 'showStories' | 'onStoryClick'>
  /** Whether to show the stories row below the top bar */
  showStories?: boolean
  /** Array of team member stories for the stories row */
  stories?: EnhancedStory[]
  /** Array of quick actions for the stories row */
  quickActions?: QuickAction[]
  /** Whether to show quick actions in the stories row */
  showQuickActions?: boolean
  /** Callback when a story is clicked */
  onStoryClick?: (story: EnhancedStory) => void
  /** Callback when add story button is clicked */
  onAddStoryClick?: () => void
  /** Whether to show the add story button */
  showAddStoryButton?: boolean
  /** Whether to show the bottom navigation */
  showBottomNav?: boolean
  /** Whether the navigation drawer is open */
  isDrawerOpen?: boolean
  /** Callback when drawer should open */
  onDrawerOpen?: () => void
  /** Callback when drawer should close */
  onDrawerClose?: () => void
  /** Whether the search bar is expanded */
  isSearchExpanded?: boolean
  /** Current search value */
  searchValue?: string
  /** Callback when search value changes */
  onSearchChange?: (value: string) => void
  /** Callback when search is submitted */
  onSearchSubmit?: (value: string) => void
  /** Callback when search is cleared */
  onSearchClear?: () => void
  /** Callback when search expands/collapses */
  onSearchToggle?: (expanded: boolean) => void
}

export function FieldWorkerLayoutIG({
  children,
  className,
  contentClassName,
  topBarProps,
  showStories = false,
  stories = [],
  quickActions = [],
  showQuickActions = true,
  onStoryClick,
  onAddStoryClick,
  showAddStoryButton = true,
  showBottomNav = true,
  // Drawer props
  isDrawerOpen = false,
  onDrawerOpen,
  onDrawerClose,
  // Search props
  isSearchExpanded = false,
  searchValue = '',
  onSearchChange,
  onSearchSubmit,
  onSearchClear,
  onSearchToggle,
}: FieldWorkerLayoutIGProps) {
  return (
    <div
      className={cn(
        'flex flex-col h-screen bg-background',
        'supports-[padding:env(safe-area-inset-top)]:pt-[env(safe-area-inset-top)]',
        'supports-[padding:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)]',
        className
      )}
    >
      {/* Navigation Drawer */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={onDrawerClose || (() => {})}
      />

      {/* Fixed Top Bar */}
      <div className="flex-shrink-0 relative z-30">
        <FieldWorkerTopBarIG
          {...topBarProps}
          stories={stories}
          showStories={false} // Stories are rendered separately below
          onStoryClick={onStoryClick ? (story) => onStoryClick(story as EnhancedStory) : undefined}
          // Drawer props
          isMenuOpen={isDrawerOpen}
          onMenuClick={onDrawerOpen}
          // Search props
          isSearchExpanded={isSearchExpanded}
          searchValue={searchValue}
          onSearchQueryChange={onSearchChange}
          onSearch={onSearchSubmit}
          onSearchClear={onSearchClear}
          onSearchToggleExpanded={onSearchToggle}
        />
      </div>

      {/* Stories Row (if enabled) */}
      {showStories && (
        <div className="flex-shrink-0 relative z-20 border-b border-border/50">
          <StoriesRow
            stories={stories}
            quickActions={quickActions}
            showStories={showStories}
            showQuickActions={showQuickActions}
            onStoryClick={onStoryClick}
            onAddStoryClick={onAddStoryClick}
            showAddButton={showAddStoryButton}
            className="bg-background/95 backdrop-blur-sm"
          />
        </div>
      )}

      {/* Main Content Area - Scrollable */}
      <div
        className={cn(
          'flex-1 overflow-y-auto overscroll-behavior-y-contain',
          // Ensure proper spacing from fixed elements
          'relative z-10',
          // Handle safe areas and proper scroll behavior
          'min-h-0', // Allow flex shrinking
          contentClassName
        )}
        // Accessibility
        role="main"
        aria-label="Main content"
      >
        <div className="min-h-full">
          {children}
        </div>
      </div>

      {/* Fixed Bottom Navigation */}
      {/* Note: z-50 to ensure bottom nav appears above AIAssistantBar (z-40) */}
      {showBottomNav && (
        <div className="flex-shrink-0 relative z-50">
          <FieldWorkerBottomNav className="border-t border-border/50 bg-background/95 backdrop-blur-sm" />
        </div>
      )}
    </div>
  )
}
/**
 * Type definitions for layout components
 */

// Story interface for Instagram-style story row
export interface Story {
  /** Unique identifier for the story */
  id: string
  /** Username of the story owner */
  userName: string
  /** Avatar image URL */
  userAvatar: string
  /** Whether the current user has viewed this story */
  isViewed: boolean
  /** Whether this is the current user's own story */
  isOwn?: boolean
}

// Props for FieldWorkerTopBarIG component
export interface FieldWorkerTopBarIGProps {
  /** CSS class name for custom styling */
  className?: string
  /** Number of unread notifications to show in badge */
  notificationCount?: number
  /** Whether to show the notification badge even when count is 0 */
  showNotificationBadge?: boolean
  /** Array of stories to display in the story row */
  stories?: Story[]
  /** Whether to show the story row below the top bar */
  showStories?: boolean
  /** Whether to show the hamburger menu button */
  showHamburgerMenu?: boolean
  /** Whether the hamburger menu is currently open */
  isMenuOpen?: boolean
  /** Whether to show search instead of notification/settings icons */
  showSearch?: boolean
  /** Whether the search input is currently expanded */
  isSearchExpanded?: boolean
  /** Current search query value */
  searchValue?: string
  /** Placeholder text for search input */
  searchPlaceholder?: string
  /** Callback when notification bell is clicked */
  onNotificationClick?: () => void
  /** Callback when settings is clicked */
  onSettingsClick?: () => void
  /** Callback when a story is clicked */
  onStoryClick?: (story: Story) => void
  /** Callback when hamburger menu is clicked */
  onMenuClick?: () => void
  /** Callback when search query changes */
  onSearchQueryChange?: (query: string) => void
  /** Callback when search is submitted */
  onSearch?: (query: string) => void
  /** Callback when search is cleared */
  onSearchClear?: () => void
  /** Callback when search input is expanded/collapsed */
  onSearchToggleExpanded?: (expanded: boolean) => void
}
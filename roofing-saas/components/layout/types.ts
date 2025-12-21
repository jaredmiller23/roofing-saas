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
  /** Callback when notification bell is clicked */
  onNotificationClick?: () => void
  /** Callback when settings is clicked */
  onSettingsClick?: () => void
  /** Callback when a story is clicked */
  onStoryClick?: (story: Story) => void
  /** Callback when hamburger menu is clicked */
  onMenuClick?: () => void
}
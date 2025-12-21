'use client'

/**
 * FieldWorkerTopBarIG Component
 *
 * Instagram-style top bar for field worker mode.
 * Features:
 * - Clean, minimal header
 * - Optional hamburger menu on left for navigation drawer
 * - Logo/brand in center or left
 * - Notification bell + settings on right
 * - Support for story row below (optional)
 * - Follows Instagram app design patterns
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Bell, Settings } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { HamburgerMenu } from './HamburgerMenu'
import { MobileSearchBar } from './MobileSearchBar'
import type { FieldWorkerTopBarIGProps } from './types'

export function FieldWorkerTopBarIG({
  className,
  notificationCount = 0,
  showNotificationBadge = false,
  stories = [],
  showStories = false,
  showHamburgerMenu = false,
  isMenuOpen = false,
  showSearch = false,
  isSearchExpanded = false,
  searchValue = '',
  searchPlaceholder = 'Search...',
  onNotificationClick,
  onSettingsClick,
  onStoryClick,
  onMenuClick,
  onSearchQueryChange,
  onSearch,
  onSearchClear,
  onSearchToggleExpanded,
}: FieldWorkerTopBarIGProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)

    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // Determine if we should show the notification badge
  const shouldShowBadge = showNotificationBadge || notificationCount > 0

  // Handle haptic feedback for mobile interactions
  const handleHapticFeedback = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10) // Short, subtle vibration
    }
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Top Bar */}
      <header className={cn(
        // Positioning and layout
        "sticky top-0 z-50 w-full",
        // Instagram-style background with backdrop blur
        "bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80",
        // Border for definition
        "border-b border-border/40",
        // Safe area padding for mobile devices
        "pt-safe-top"
      )}>
        <div className="flex h-16 items-center justify-between px-4">
          {/* Left Section - Hamburger Menu + Brand/Logo */}
          <div className="flex items-center gap-3">
            {/* Hamburger Menu Button */}
            {showHamburgerMenu && (
              <HamburgerMenu
                isOpen={isMenuOpen}
                onClick={onMenuClick}
                ariaLabel={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                size="md"
                variant="ghost"
              />
            )}

            {/* Brand/Logo */}
            <Link
              href="/dashboard"
              className={cn(
                "flex items-center group",
                "transition-transform duration-200",
                !prefersReducedMotion && "hover:scale-105 active:scale-95"
              )}
              onClick={handleHapticFeedback}
            >
              <h1 className={cn(
                "text-2xl font-bold text-foreground transition-colors",
                "group-hover:text-primary"
              )} style={{ fontFamily: "'Pacifico', cursive" }}>
                Job Clarity
              </h1>
            </Link>
          </div>

          {/* Actions - Search or Notification Bell & Settings */}
          <div className="flex items-center gap-2">
            {showSearch ? (
              /* Mobile Search Bar */
              <MobileSearchBar
                placeholder={searchPlaceholder}
                isExpanded={isSearchExpanded}
                value={searchValue}
                onQueryChange={onSearchQueryChange}
                onSearch={onSearch}
                onClear={onSearchClear}
                onToggleExpanded={onSearchToggleExpanded}
                className="transition-all duration-200"
              />
            ) : (
              /* Default Icons - Notification Bell & Settings */
              <>
                {/* Notification Bell */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    handleHapticFeedback()
                    onNotificationClick?.()
                  }}
                  className={cn(
                    "relative transition-all duration-200",
                    "hover:bg-accent/50 focus-visible:bg-accent/50",
                    !prefersReducedMotion && "hover:scale-105 active:scale-95"
                  )}
                  aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ''}`}
                >
                  <Bell className="h-6 w-6" />

                  {/* Notification Badge */}
                  {shouldShowBadge && (
                    <Badge
                      variant="destructive"
                      className={cn(
                        "absolute -top-1 -right-1 min-w-5 h-5 px-1.5 text-xs",
                        "flex items-center justify-center",
                        // Animation for new notifications
                        !prefersReducedMotion && notificationCount > 0 && "animate-pulse"
                      )}
                      aria-hidden="true"
                    >
                      {notificationCount > 99 ? '99+' : notificationCount > 0 ? notificationCount : ''}
                    </Badge>
                  )}
                </Button>

                {/* Settings */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    handleHapticFeedback()
                    onSettingsClick?.()
                  }}
                  className={cn(
                    "transition-all duration-200",
                    "hover:bg-accent/50 focus-visible:bg-accent/50",
                    !prefersReducedMotion && "hover:scale-105 active:scale-95"
                  )}
                  aria-label="Settings"
                >
                  <Settings className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Story Row (Optional) */}
      {showStories && stories.length > 0 && (
        <div className={cn(
          "border-b border-border/40 bg-background/50",
          "px-4 py-3"
        )}>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {stories.map((story, index) => (
              <button
                key={story.id}
                onClick={() => {
                  handleHapticFeedback()
                  onStoryClick?.(story)
                }}
                className={cn(
                  "flex flex-col items-center gap-1.5 min-w-16",
                  "transition-all duration-200",
                  !prefersReducedMotion && "hover:scale-105 active:scale-95"
                )}
                style={{
                  animationDelay: prefersReducedMotion ? '0ms' : `${index * 50}ms`,
                }}
                aria-label={`View ${story.isOwn ? 'your' : story.userName + "'s"} story`}
              >
                {/* Story Avatar with Ring */}
                <div className={cn(
                  "relative w-14 h-14 rounded-full p-0.5",
                  // Story ring - different colors for viewed/unviewed
                  story.isViewed
                    ? "bg-gradient-to-tr from-gray-300 to-gray-400"
                    : "bg-gradient-to-tr from-orange-400 via-red-500 to-pink-500",
                  // Own story styling
                  story.isOwn && "bg-gradient-to-tr from-blue-400 to-blue-600"
                )}>
                  <div className="w-full h-full rounded-full bg-background p-0.5">
                    <Image
                      src={story.userAvatar}
                      alt={story.userName}
                      width={48}
                      height={48}
                      className="w-full h-full rounded-full object-cover"
                    />

                    {/* Add story button for own story */}
                    {story.isOwn && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary border-2 border-background flex items-center justify-center">
                        <span className="text-primary-foreground text-xs font-bold">+</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Story Username */}
                <span className="text-xs text-center text-muted-foreground font-medium truncate max-w-16">
                  {story.isOwn ? 'Your story' : story.userName}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
'use client'

/**
 * ThumbZoneLayout Component
 *
 * Mobile-first layout that places primary actions in the thumb zone (bottom 40%).
 * Use for field worker screens where one-handed operation is common.
 *
 * Layout zones:
 * - Header (top): Non-interactive or secondary actions
 * - Content (middle): Scrollable main content
 * - Actions (bottom): Primary actions, always visible, in thumb reach
 */

import { cn } from '@/lib/utils'

interface ThumbZoneLayoutProps {
  /** Header content - typically title, back button, secondary actions */
  header: React.ReactNode
  /** Main scrollable content */
  content: React.ReactNode
  /** Primary actions - rendered at bottom in thumb zone */
  actions?: React.ReactNode
  /** Additional className for the container */
  className?: string
}

export function ThumbZoneLayout({
  header,
  content,
  actions,
  className
}: ThumbZoneLayoutProps) {
  return (
    <div className={cn('min-h-screen flex flex-col', className)}>
      {/* Header - non-interactive or secondary */}
      <div className="flex-none">
        {header}
      </div>

      {/* Scrollable content - middle */}
      <div className="flex-1 overflow-y-auto">
        {content}
      </div>

      {/* Primary actions - bottom, always visible */}
      {actions && (
        <div className="flex-none p-4 bg-card border-t border-border safe-area-inset-bottom">
          {actions}
        </div>
      )}
    </div>
  )
}

/**
 * Utility CSS class for safe area inset on iOS
 * Add to tailwind.config.js if not already present:
 *
 * theme: {
 *   extend: {
 *     padding: {
 *       'safe-area-inset-bottom': 'env(safe-area-inset-bottom)',
 *     },
 *   },
 * }
 */

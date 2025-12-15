"use client"

import * as React from "react"
import {
  UserPlus,
  UserMinus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Info,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export type RealtimeToastType =
  | "user-joined"
  | "user-left"
  | "data-updated"
  | "conflict"
  | "success"
  | "info"
  | "warning"

export interface RealtimeToastProps {
  /**
   * Type of notification
   */
  type: RealtimeToastType

  /**
   * Title of the notification
   */
  title: string

  /**
   * Optional description
   */
  description?: string

  /**
   * User information (for user-joined/user-left types)
   */
  user?: {
    name?: string
    email?: string
    avatar?: string
  }

  /**
   * Auto-dismiss duration in milliseconds
   * @default 4000
   */
  duration?: number

  /**
   * Callback when toast is dismissed
   */
  onDismiss?: () => void

  /**
   * Whether to show the close button
   * @default true
   */
  showClose?: boolean

  /**
   * Additional CSS classes
   */
  className?: string
}

const typeConfig: Record<
  RealtimeToastType,
  {
    icon: React.ComponentType<{ className?: string }>
    iconClassName: string
    bgClassName: string
  }
> = {
  "user-joined": {
    icon: UserPlus,
    iconClassName: "text-green-600 dark:text-green-500",
    bgClassName: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900",
  },
  "user-left": {
    icon: UserMinus,
    iconClassName: "text-orange-600 dark:text-orange-500",
    bgClassName: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900",
  },
  "data-updated": {
    icon: RefreshCw,
    iconClassName: "text-blue-600 dark:text-blue-500",
    bgClassName: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900",
  },
  "conflict": {
    icon: AlertTriangle,
    iconClassName: "text-destructive",
    bgClassName: "bg-destructive/10 dark:bg-destructive/20 border-destructive/30",
  },
  "success": {
    icon: CheckCircle2,
    iconClassName: "text-green-600 dark:text-green-500",
    bgClassName: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900",
  },
  "info": {
    icon: Info,
    iconClassName: "text-blue-600 dark:text-blue-500",
    bgClassName: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900",
  },
  "warning": {
    icon: AlertTriangle,
    iconClassName: "text-yellow-600 dark:text-yellow-500",
    bgClassName: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900",
  },
}

/**
 * RealtimeToast component for showing real-time notifications
 *
 * This component is typically rendered within a toast/notification system.
 * It supports auto-dismissal and different notification types.
 *
 * @example
 * ```tsx
 * // User joined notification
 * <RealtimeToast
 *   type="user-joined"
 *   title="John Doe joined"
 *   description="Now viewing this contact"
 *   user={{ name: "John Doe", avatar: "..." }}
 *   duration={3000}
 * />
 *
 * // Data updated notification
 * <RealtimeToast
 *   type="data-updated"
 *   title="Contact updated"
 *   description="Status changed to 'Active'"
 * />
 *
 * // Conflict notification
 * <RealtimeToast
 *   type="conflict"
 *   title="Edit conflict"
 *   description="Another user is editing the same field"
 *   duration={0} // Don't auto-dismiss
 * />
 * ```
 */
export function RealtimeToast({
  type,
  title,
  description,
  user,
  duration = 4000,
  onDismiss,
  showClose = true,
  className,
}: RealtimeToastProps) {
  const [isVisible, setIsVisible] = React.useState(true)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const config = typeConfig[type]
  const Icon = config.icon

  const showAvatar = (type === "user-joined" || type === "user-left") && user

  // Auto-dismiss after duration
  React.useEffect(() => {
    if (duration > 0) {
      timeoutRef.current = setTimeout(() => {
        handleDismiss()
      }, duration)

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      }
    }
  }, [duration, handleDismiss])

  const handleDismiss = React.useCallback(() => {
    setIsVisible(false)
    setTimeout(() => {
      onDismiss?.()
    }, 200) // Wait for exit animation
  }, [onDismiss])

  if (!isVisible) {
    return null
  }

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full max-w-sm gap-3 rounded-lg border p-4 shadow-lg transition-all",
        "animate-in slide-in-from-top-5 fade-in",
        "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top-5 data-[state=closed]:fade-out",
        config.bgClassName,
        className
      )}
      role="alert"
      aria-live={type === "conflict" ? "assertive" : "polite"}
    >
      {/* Icon or Avatar */}
      <div className="shrink-0">
        {showAvatar ? (
          <Avatar className="size-10">
            {user.avatar && <AvatarImage src={user.avatar} alt={user.name || user.email} />}
            <AvatarFallback className={cn("text-sm", config.iconClassName)}>
              {getUserInitials(user.name || user.email || "?")}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-full",
              config.bgClassName
            )}
          >
            <Icon className={cn("size-5", config.iconClassName)} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-semibold leading-none">{title}</p>
        {description && (
          <p className="text-muted-foreground text-xs leading-snug">
            {description}
          </p>
        )}
      </div>

      {/* Close Button */}
      {showClose && (
        <button
          onClick={handleDismiss}
          className={cn(
            "text-muted-foreground hover:text-foreground shrink-0 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden",
            "ring-offset-background"
          )}
          aria-label="Dismiss notification"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}

/**
 * Helper component for programmatically showing realtime toasts
 * Works with toast libraries like sonner or react-hot-toast
 */
export function showRealtimeToast(
  props: Omit<RealtimeToastProps, "onDismiss">
): React.ReactElement {
  return <RealtimeToast {...props} />
}

/**
 * Get user initials from name or email
 */
function getUserInitials(nameOrEmail: string): string {
  if (!nameOrEmail) return "?"

  // If it's an email, use first two chars before @
  if (nameOrEmail.includes("@")) {
    return nameOrEmail.substring(0, 2).toUpperCase()
  }

  // Get first letter of first two words
  const parts = nameOrEmail.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }

  return (parts[0][0] + parts[1][0]).toUpperCase()
}

/**
 * Preset toast configurations for common scenarios
 */
export const realtimeToastPresets = {
  userJoined: (userName: string, userAvatar?: string): RealtimeToastProps => ({
    type: "user-joined",
    title: `${userName} joined`,
    description: "Now viewing this page",
    user: { name: userName, avatar: userAvatar },
    duration: 3000,
  }),

  userLeft: (userName: string, userAvatar?: string): RealtimeToastProps => ({
    type: "user-left",
    title: `${userName} left`,
    description: "No longer viewing this page",
    user: { name: userName, avatar: userAvatar },
    duration: 3000,
  }),

  dataUpdated: (fieldName: string, updatedBy?: string): RealtimeToastProps => ({
    type: "data-updated",
    title: "Changes detected",
    description: updatedBy
      ? `${fieldName} updated by ${updatedBy}`
      : `${fieldName} was updated`,
    duration: 4000,
  }),

  conflict: (fieldName: string, editedBy: string): RealtimeToastProps => ({
    type: "conflict",
    title: "Edit conflict",
    description: `${fieldName} is being edited by ${editedBy}`,
    duration: 0, // Don't auto-dismiss conflicts
  }),

  syncSuccess: (): RealtimeToastProps => ({
    type: "success",
    title: "Changes saved",
    description: "Your changes have been synced",
    duration: 2000,
  }),

  syncError: (): RealtimeToastProps => ({
    type: "warning",
    title: "Sync failed",
    description: "Could not save changes. Retrying...",
    duration: 5000,
  }),
}

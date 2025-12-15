"use client"

import * as React from "react"
import { User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { usePresence, type PresenceUser } from "@/lib/hooks/usePresence"

export interface PresenceIndicatorProps {
  /**
   * Entity type (e.g., 'contact', 'project', 'estimate')
   */
  entityType: string

  /**
   * Entity ID
   */
  entityId: string

  /**
   * Current user information
   */
  user: {
    id: string
    name?: string
    email?: string
    avatar?: string
  }

  /**
   * Maximum number of avatars to display before showing "+X more"
   * @default 3
   */
  maxDisplay?: number

  /**
   * Size of the avatars
   * @default "sm"
   */
  size?: "xs" | "sm" | "md" | "lg"

  /**
   * Additional CSS classes
   */
  className?: string

  /**
   * Show count badge
   * @default false
   */
  showCount?: boolean

  /**
   * Callback when presence changes
   */
  onPresenceChange?: (users: PresenceUser[]) => void
}

const sizeClasses = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
}

const ringClasses = {
  xs: "ring-1",
  sm: "ring-2",
  md: "ring-2",
  lg: "ring-2",
}

/**
 * PresenceIndicator component displays user avatars of people currently viewing the same entity
 *
 * @example
 * ```tsx
 * <PresenceIndicator
 *   entityType="contact"
 *   entityId={contactId}
 *   user={currentUser}
 *   maxDisplay={3}
 *   size="sm"
 * />
 * ```
 */
export function PresenceIndicator({
  entityType,
  entityId,
  user,
  maxDisplay = 3,
  size = "sm",
  className,
  showCount = false,
  onPresenceChange,
}: PresenceIndicatorProps) {
  const { presentUsers, count } = usePresence({
    entityType,
    entityId,
    user,
    onPresenceChange,
  })

  // Don't render if no users are present
  if (count === 0) {
    return null
  }

  const displayedUsers = presentUsers.slice(0, maxDisplay)
  const remainingCount = count - maxDisplay

  return (
    <div
      className={cn(
        "flex items-center gap-1",
        className
      )}
    >
      {showCount && (
        <span className="text-muted-foreground text-sm mr-1">
          {count} viewing
        </span>
      )}

      <div className="flex items-center -space-x-2">
        {displayedUsers.map((presenceUser) => (
          <PresenceAvatar
            key={presenceUser.userId}
            user={presenceUser}
            size={size}
          />
        ))}

        {remainingCount > 0 && (
          <div
            className={cn(
              "bg-muted text-muted-foreground flex items-center justify-center rounded-full font-medium ring-background",
              sizeClasses[size],
              ringClasses[size]
            )}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    </div>
  )
}

interface PresenceAvatarProps {
  user: PresenceUser
  size: "xs" | "sm" | "md" | "lg"
}

function PresenceAvatar({ user, size }: PresenceAvatarProps) {
  const displayName = user.userName || user.userEmail || "Unknown User"
  const initials = getInitials(displayName)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("ring-background relative", ringClasses[size])}>
          <Avatar className={sizeClasses[size]}>
            {user.userAvatar && (
              <AvatarImage src={user.userAvatar} alt={displayName} />
            )}
            <AvatarFallback className="bg-primary/10 text-primary">
              {user.userAvatar ? (
                initials
              ) : (
                <User className={cn(
                  size === "xs" && "size-3",
                  size === "sm" && "size-4",
                  size === "md" && "size-5",
                  size === "lg" && "size-6"
                )} />
              )}
            </AvatarFallback>
          </Avatar>

          {/* Online indicator dot */}
          <span
            className={cn(
              "bg-green-500 absolute bottom-0 right-0 block rounded-full ring-2 ring-background",
              size === "xs" && "size-1.5",
              size === "sm" && "size-2",
              size === "md" && "size-2.5",
              size === "lg" && "size-3"
            )}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{displayName}</span>
          {user.userEmail && user.userName && (
            <span className="text-muted-foreground text-xs">{user.userEmail}</span>
          )}
          <span className="text-muted-foreground text-xs">
            Viewing now
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Get initials from a name or email
 */
function getInitials(name: string): string {
  if (!name) return "?"

  // If it's an email, use the first two characters of the username
  if (name.includes("@")) {
    return name.substring(0, 2).toUpperCase()
  }

  // Otherwise, get first letter of first two words
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }

  return (parts[0][0] + parts[1][0]).toUpperCase()
}

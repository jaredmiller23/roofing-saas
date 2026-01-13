/**
 * StoriesRow Component
 *
 * Instagram-style stories row for quick actions and team status
 * Features:
 * - Team member avatars with status rings
 * - Quick action circles (New Lead, Check In, etc.)
 * - Horizontal scroll
 * - Add button at end
 */

"use client"

import * as React from "react"
import { Plus, UserPlus, CheckCircle, Phone, MessageSquare, MapPin, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// Enhanced Story interface that extends the base Story type
export interface EnhancedStory {
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
  /** Online/offline status */
  status: 'online' | 'offline' | 'busy' | 'away'
  /** Last active time (for offline users) */
  lastActive?: string
  /** Role or title */
  role?: string
  /** Number of unread messages or notifications */
  unreadCount?: number
}

// Quick action interface for action circles
export interface QuickAction {
  /** Unique identifier for the action */
  id: string
  /** Display label */
  label: string
  /** Icon component */
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  /** Background color class */
  bgColor: string
  /** Text color class */
  textColor: string
  /** Click handler */
  onClick: () => void
}

export interface StoriesRowProps {
  /** CSS class name for custom styling */
  className?: string
  /** Array of team member stories */
  stories?: EnhancedStory[]
  /** Array of quick actions */
  quickActions?: QuickAction[]
  /** Whether to show the stories section */
  showStories?: boolean
  /** Whether to show the quick actions section */
  showQuickActions?: boolean
  /** Callback when a story is clicked */
  onStoryClick?: (story: EnhancedStory) => void
  /** Callback when add story button is clicked */
  onAddStoryClick?: () => void
  /** Whether to show the add button */
  showAddButton?: boolean
}

// Status ring colors based on user status
const getStatusRingColor = (status: EnhancedStory['status']) => {
  switch (status) {
    case 'online':
      return 'ring-green-500'
    case 'busy':
      return 'ring-red-500'
    case 'away':
      return 'ring-yellow-500'
    case 'offline':
    default:
      return 'ring-gray-300'
  }
}

// Default quick actions
const defaultQuickActions: QuickAction[] = [
  {
    id: 'new-lead',
    label: 'New Lead',
    icon: UserPlus,
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-300',
    onClick: () => {},
  },
  {
    id: 'check-in',
    label: 'Check In',
    icon: CheckCircle,
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-300',
    onClick: () => {},
  },
  {
    id: 'make-call',
    label: 'Call',
    icon: Phone,
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-700 dark:text-purple-300',
    onClick: () => {},
  },
  {
    id: 'send-message',
    label: 'Message',
    icon: MessageSquare,
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-300',
    onClick: () => {},
  },
  {
    id: 'territory',
    label: 'Territory',
    icon: MapPin,
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    textColor: 'text-indigo-700 dark:text-indigo-300',
    onClick: () => {},
  },
  {
    id: 'targeting',
    label: 'Target',
    icon: Target,
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    textColor: 'text-pink-700 dark:text-pink-300',
    onClick: () => {},
  },
]

export function StoriesRow({
  className,
  stories = [],
  quickActions = defaultQuickActions,
  showStories = true,
  showQuickActions = true,
  onStoryClick,
  onAddStoryClick,
  showAddButton = true,
}: StoriesRowProps) {
  const hasContent = (showStories && stories.length > 0) || (showQuickActions && quickActions.length > 0) || showAddButton

  if (!hasContent) {
    return null
  }

  return (
    <div className={cn(
      "w-full border-b border-border/40 bg-background/60 backdrop-blur-sm",
      className
    )}>
      <div className="px-4 py-3">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
          {/* Quick Actions Section */}
          {showQuickActions && quickActions.length > 0 && (
            <>
              {quickActions.map((action) => {
                const IconComponent = action.icon
                return (
                  <div
                    key={action.id}
                    className="flex flex-col items-center gap-2 min-w-[60px]"
                  >
                    <Button
                      onClick={action.onClick}
                      className={cn(
                        "size-12 rounded-full p-0 border-2 border-transparent hover:scale-105 transition-all duration-200",
                        action.bgColor,
                        action.textColor,
                        "hover:shadow-md"
                      )}
                      variant="ghost"
                      aria-label={action.label}
                    >
                      <IconComponent className="size-5" />
                    </Button>
                    <span className="text-xs font-medium text-muted-foreground text-center leading-tight">
                      {action.label}
                    </span>
                  </div>
                )
              })}
              {/* Divider */}
              {showStories && stories.length > 0 && (
                <div className="flex items-center">
                  <div className="w-px h-8 bg-border/60" />
                </div>
              )}
            </>
          )}

          {/* Stories Section */}
          {showStories && stories.length > 0 && (
            <>
              {stories.map((story) => (
                <div
                  key={story.id}
                  className="flex flex-col items-center gap-2 min-w-[60px] cursor-pointer group"
                  onClick={() => onStoryClick?.(story)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onStoryClick?.(story)
                    }
                  }}
                >
                  <div className="relative">
                    <Avatar className={cn(
                      "size-12 ring-2 ring-offset-2 ring-offset-background transition-all duration-200",
                      getStatusRingColor(story.status),
                      story.isViewed ? "ring-2" : "ring-4",
                      "group-hover:scale-105"
                    )}>
                      <AvatarImage
                        src={story.userAvatar}
                        alt={`${story.userName}'s avatar`}
                      />
                      <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                        {story.userName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Status indicator */}
                    <div className={cn(
                      "absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-background",
                      story.status === 'online' && "bg-green-500",
                      story.status === 'busy' && "bg-red-500",
                      story.status === 'away' && "bg-yellow-500",
                      story.status === 'offline' && "bg-gray-400"
                    )} />

                    {/* Unread badge */}
                    {story.unreadCount && story.unreadCount > 0 && (
                      <Badge
                        className="absolute -top-1 -right-1 size-5 p-0 text-[10px] bg-destructive text-destructive-foreground min-w-[20px] h-5"
                        variant="destructive"
                      >
                        {story.unreadCount > 99 ? '99+' : story.unreadCount}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-xs font-medium text-foreground text-center leading-tight max-w-[60px] truncate">
                      {story.userName}
                    </span>
                    {story.role && (
                      <span className="text-[10px] text-muted-foreground text-center leading-tight max-w-[60px] truncate">
                        {story.role}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Add Button */}
          {showAddButton && (
            <div className="flex flex-col items-center gap-2 min-w-[60px]">
              <Button
                onClick={onAddStoryClick}
                className="size-12 rounded-full p-0 border-2 border-dashed border-muted-foreground/40 hover:border-muted-foreground hover:scale-105 transition-all duration-200 bg-muted/30 hover:bg-muted/50"
                variant="ghost"
                aria-label="Add story"
              >
                <Plus className="size-5 text-muted-foreground" />
              </Button>
              <span className="text-xs font-medium text-muted-foreground text-center leading-tight">
                Add
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StoriesRow
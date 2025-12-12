'use client'

import { Conversation } from './types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'

interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
}

export function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const timestamp = new Date(conversation.last_message_at)
  const initials = conversation.contact_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)

  const isInbound = conversation.last_message_direction === 'inbound'
  const hasUnread = conversation.unread_count > 0

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-start gap-3 p-4 hover:bg-accent transition-colors text-left
        ${isActive ? 'bg-accent' : ''}
        ${hasUnread ? 'bg-blue-50/50' : ''}
        border-b border-border
      `}
    >
      <Avatar className="mt-1">
        <AvatarFallback className={hasUnread ? 'bg-blue-600 text-white' : ''}>
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className={`font-semibold text-sm truncate ${hasUnread ? 'font-bold' : ''}`}>
            {conversation.contact_name}
          </h3>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(timestamp, { addSuffix: true })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm text-muted-foreground truncate ${
                hasUnread ? 'font-semibold text-foreground' : ''
              }`}
            >
              {isInbound ? (
                <ArrowDownLeft className="inline h-3 w-3 mr-1" />
              ) : (
                <ArrowUpRight className="inline h-3 w-3 mr-1" />
              )}
              {conversation.last_message}
            </p>
          </div>

          {hasUnread && (
            <Badge variant="default" className="bg-primary text-white shrink-0">
              {conversation.unread_count}
            </Badge>
          )}
        </div>
      </div>
    </button>
  )
}

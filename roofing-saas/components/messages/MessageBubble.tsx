'use client'

import { Message } from './types'
import { formatDistanceToNow } from 'date-fns'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound'
  const timestamp = new Date(message.created_at)

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[70%] px-4 py-2 rounded-2xl
          ${
            isOutbound
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-muted text-foreground rounded-bl-sm'
          }
        `}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <p
          className={`
            text-xs mt-1
            ${isOutbound ? 'text-blue-100' : 'text-muted-foreground'}
          `}
        >
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </p>
      </div>
    </div>
  )
}

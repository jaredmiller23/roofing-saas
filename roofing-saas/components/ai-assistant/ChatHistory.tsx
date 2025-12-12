'use client'

/**
 * ChatHistory Component
 * Displays scrollable list of chat messages with auto-scroll
 */

import { useEffect, useRef } from 'react'
import { MessageSquare, Loader2 } from 'lucide-react'
import { ChatMessage } from './ChatMessage'
import { useAIAssistant } from '@/lib/ai-assistant/context'

interface ChatHistoryProps {
  className?: string
}

export function ChatHistory({ className = '' }: ChatHistoryProps) {
  const { messages, isLoadingMessages, isSending } = useAIAssistant()
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastMessageRef = useRef<string | null>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length === 0) return

    const lastMessage = messages[messages.length - 1]

    // Only scroll if it's a new message (not on initial load)
    if (lastMessage.id !== lastMessageRef.current) {
      lastMessageRef.current = lastMessage.id

      if (scrollRef.current) {
        // Smooth scroll to bottom
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth'
        })
      }
    }
  }, [messages])

  // Empty state
  if (!isLoadingMessages && messages.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full text-center p-8 ${className}`}>
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <MessageSquare className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Start a conversation
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Ask me anything! I can help you manage contacts, create projects, log door knocks, and more.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-2 text-left max-w-md">
          <div className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
            <p className="text-sm text-foreground">&quot;Create a new contact named John Smith&quot;</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
            <p className="text-sm text-foreground">&quot;Search for contacts in Nashville&quot;</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
            <p className="text-sm text-foreground">&quot;Log a door knock at 123 Main St&quot;</p>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoadingMessages) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    )
  }

  // Messages list
  return (
    <div
      ref={scrollRef}
      className={`flex-1 overflow-y-auto px-4 py-4 ${className}`}
      style={{ scrollBehavior: 'smooth' }}
    >
      {/* Messages */}
      <div className="space-y-1">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            showTimestamp={true}
          />
        ))}

        {/* Typing indicator */}
        {isSending && (
          <div className="flex justify-start mb-3">
            <div className="px-4 py-3 bg-muted rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scroll anchor */}
      <div className="h-px" />
    </div>
  )
}

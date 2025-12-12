'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Message } from './types'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { logger } from '@/lib/logger'

interface MessageThreadProps {
  contactId: string
  contactName: string
  contactPhone: string
  onMessageSent?: () => void
}

export function MessageThread({
  contactId,
  contactName,
  contactPhone,
  onMessageSent,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Load messages when contactId changes
  useEffect(() => {
    loadMessages()
  }, [contactId])

  // Real-time subscription for new messages in this thread
  useEffect(() => {
    const channel = supabase
      .channel(`sms-thread-${contactId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities',
          filter: `type=eq.sms,contact_id=eq.${contactId}`,
        },
        (payload) => {
          logger.info('New message received via Realtime', { payload })
          // Add new message to the thread
          const newMessage = payload.new as Message
          setMessages((prev) => [...prev, newMessage])
          scrollToBottom()
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      channel.unsubscribe()
    }
  }, [contactId])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function loadMessages() {
    setLoading(true)
    try {
      const response = await fetch(`/api/messages/${contactId}`)
      const data = await response.json()

      if (!response.ok) {
        logger.error('Failed to load messages', { error: data.error })
        return
      }

      setMessages(data.messages || [])
    } catch (error) {
      logger.error('Failed to load messages', { error })
    } finally {
      setLoading(false)
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }, 100)
  }

  function handleMessageSent() {
    // Reload messages to get the sent message
    loadMessages()
    // Notify parent to refresh conversation list
    onMessageSent?.()
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="border-b border-border p-4 bg-background">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={i % 2 === 0 ? 'flex justify-end' : 'flex justify-start'}>
              <Skeleton className="h-16 w-64 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Thread Header */}
      <div className="border-b border-border p-4 bg-background">
        <h2 className="font-semibold text-lg">{contactName}</h2>
        {contactPhone && <p className="text-sm text-muted-foreground">{contactPhone}</p>}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <p>No messages yet. Send a message to start the conversation.</p>
          </div>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
      </div>

      {/* Message Input */}
      <MessageInput
        contactId={contactId}
        contactPhone={contactPhone}
        onSent={handleMessageSent}
      />
    </div>
  )
}

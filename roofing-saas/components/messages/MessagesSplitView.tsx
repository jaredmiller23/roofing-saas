'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Conversation } from './types'
import { ConversationList } from './ConversationList'
import { MessageThread } from './MessageThread'
import { logger } from '@/lib/logger'

export function MessagesSplitView() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/messages/conversations')
      const data = await response.json()

      if (!response.ok) {
        logger.error('Failed to load conversations', { error: data.error })
        return
      }

      setConversations(data.conversations || [])
    } catch (error) {
      logger.error('Failed to load conversations', { error })
    } finally {
      setLoading(false)
    }
  }, [])

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Real-time subscription for new SMS messages (updates conversation list)
  useEffect(() => {
    const channel = supabase
      .channel('sms-global-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities',
          filter: 'type=eq.sms',
        },
        (payload) => {
          logger.info('New SMS detected, refreshing conversation list', { payload })
          // Refresh the entire conversation list to update order and unread counts
          loadConversations()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'activities',
          filter: 'type=eq.sms',
        },
        (payload) => {
          logger.info('SMS updated, refreshing conversation list', { payload })
          // Refresh on updates (e.g., read_at changes)
          loadConversations()
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      channel.unsubscribe()
    }
  }, [supabase, loadConversations])

  // Get selected conversation details
  const selectedConversation = conversations.find(
    (conv) => conv.contact_id === selectedContactId
  )

  return (
    <div className="flex h-full bg-background">
      {/* Left: Conversation List (30%) */}
      <div className="w-1/3 border-r border-border flex flex-col overflow-hidden">
        <ConversationList
          conversations={conversations}
          selectedContactId={selectedContactId}
          onSelectContact={setSelectedContactId}
          loading={loading}
        />
      </div>

      {/* Right: Message Thread (70%) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedContactId && selectedConversation ? (
          <MessageThread
            contactId={selectedContactId}
            contactName={selectedConversation.contact_name}
            contactPhone={selectedConversation.contact_phone || ''}
            onMessageSent={loadConversations}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg mb-2">Select a conversation</p>
              <p className="text-sm">Choose a conversation from the list to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

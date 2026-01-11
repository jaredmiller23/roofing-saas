'use client'

import { useState, useMemo } from 'react'
import { Conversation } from './types'
import { ConversationItem } from './ConversationItem'
import { Input } from '@/components/ui/input'
import { Search, MessageSquare, Plus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

interface ConversationListProps {
  conversations: Conversation[]
  selectedContactId: string | null
  onSelectContact: (contactId: string) => void
  loading?: boolean
}

export function ConversationList({
  conversations,
  selectedContactId,
  onSelectContact,
  loading = false,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Filter conversations by search query (name or phone)
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations

    const query = searchQuery.toLowerCase()
    return conversations.filter(
      (conv) =>
        conv.contact_name.toLowerCase().includes(query) ||
        conv.contact_phone?.toLowerCase().includes(query)
    )
  }, [conversations, searchQuery])

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Header */}
      <div className="p-4 border-b border-border bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2 md:text-xl">
            <MessageSquare className="h-5 w-5 md:h-6 md:w-6" />
            Messages
          </h2>
          {/* New conversation button - mobile only */}
          <Link
            href="/contacts"
            className="md:hidden flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 active:bg-primary/80 font-medium text-sm transition-colors touch-manipulation"
          >
            <Plus className="h-4 w-4" />
            New
          </Link>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 touch-manipulation"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchQuery ? (
              <>
                <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No conversations found matching &quot;{searchQuery}&quot;</p>
              </>
            ) : (
              <>
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No SMS conversations yet</p>
                <p className="text-sm mt-1">
                  Send a message to a contact to start a conversation
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.contact_id}
                conversation={conversation}
                isActive={conversation.contact_id === selectedContactId}
                onClick={() => onSelectContact(conversation.contact_id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

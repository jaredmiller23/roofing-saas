'use client'

/**
 * AIConversationList Component
 * Shows list of AI assistant conversations with search and management options
 */

import { useState } from 'react'
import {
  MessageSquare,
  Search,
  Plus,
  Trash2,
  Archive,
  Loader2,
  X,
} from 'lucide-react'
import { useAIAssistant } from '@/lib/ai-assistant/context'
import { formatDistanceToNow } from 'date-fns'

interface AIConversationListProps {
  className?: string
  onClose?: () => void
}

export function AIConversationList({ className = '', onClose }: AIConversationListProps) {
  const {
    conversations,
    activeConversationId,
    loadConversation,
    startNewConversation,
    deleteConversation,
    archiveConversation,
    searchConversations,
    loadConversations,
    isLoadingConversations,
  } = useAIAssistant()

  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      await searchConversations(query)
    } else {
      await loadConversations()
    }
  }

  const handleNewConversation = async () => {
    await startNewConversation()
    if (onClose) onClose()
  }

  const handleSelectConversation = async (id: string) => {
    await loadConversation(id)
    if (onClose) onClose()
  }

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm('Are you sure you want to delete this conversation?')) {
      return
    }

    setDeletingId(id)
    try {
      await deleteConversation(id)
    } finally {
      setDeletingId(null)
    }
  }

  const handleArchiveConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await archiveConversation(id)
  }

  return (
    <div className={`flex flex-col h-full bg-card ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Conversations</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-muted-foreground hover:text-muted-foreground rounded"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* New conversation button */}
        <button
          onClick={handleNewConversation}
          className="w-full mt-3 px-3 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Conversation
        </button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingConversations ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {searchQuery ? 'Try a different search' : 'Start a new conversation to get started'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {conversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId
              const isDeleting = deletingId === conversation.id

              return (
                <button
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation.id)}
                  disabled={isDeleting}
                  className={`w-full px-4 py-3 text-left hover:bg-accent transition-colors group relative ${
                    isActive ? 'bg-primary/10' : ''
                  } ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                  )}

                  {/* Content */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <h4
                          className={`text-sm font-medium truncate ${
                            isActive ? 'text-primary' : 'text-foreground'
                          }`}
                        >
                          {conversation.title || 'Untitled conversation'}
                        </h4>
                      </div>

                      {/* Timestamp */}
                      <p className="text-xs text-muted-foreground mt-0.5 ml-5">
                        {formatDistanceToNow(new Date(conversation.updated_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Archive */}
                      <button
                        onClick={(e) => handleArchiveConversation(conversation.id, e)}
                        className="p-1.5 text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 rounded transition-colors"
                        title="Archive conversation"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={(e) => handleDeleteConversation(conversation.id, e)}
                        className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete conversation"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          {conversations.length} conversation{conversations.length === 1 ? '' : 's'}
        </p>
      </div>
    </div>
  )
}

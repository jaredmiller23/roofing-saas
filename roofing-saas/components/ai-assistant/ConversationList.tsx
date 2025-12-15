'use client'

/**
 * AI Assistant ConversationList Component
 * Shows list of AI conversation history
 */

import { X, MessageSquare, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAIAssistant } from '@/lib/ai-assistant/context'

interface ConversationListProps {
  onClose: () => void
}

export function ConversationList({ onClose }: ConversationListProps) {
  const {
    conversations,
    loadConversation,
    deleteConversation,
    activeConversationId,
    isLoadingConversations
  } = useAIAssistant()

  const handleSelectConversation = async (id: string) => {
    await loadConversation(id)
    onClose()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Conversation History</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {isLoadingConversations ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading conversations...
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No conversation history yet</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-accent group ${
                  activeConversationId === conv.id ? 'bg-accent' : ''
                }`}
                onClick={() => handleSelectConversation(conv.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {conv.title || 'New Conversation'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(conv.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteConversation(conv.id)
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

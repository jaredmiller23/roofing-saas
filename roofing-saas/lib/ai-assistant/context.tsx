'use client'

/**
 * AI Assistant Context
 * Global state management for persistent AI chat interface
 */

import { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import type {
  AIAssistantContextType,
  AIAssistantState,
  ChatMessage,
  PageContext,
  SendMessageRequest,
  SendMessageResponse,
  CreateConversationResponse,
  ListConversationsResponse,
  ListMessagesResponse,
} from './types'
import { VoiceProviderType } from '@/lib/voice/providers'

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined)

// Storage keys
const STORAGE_KEYS = {
  IS_EXPANDED: 'ai_assistant_expanded',
  ACTIVE_CONVERSATION_ID: 'ai_assistant_active_conversation',
  VOICE_PROVIDER: 'ai_assistant_voice_provider',
} as const

/**
 * AI Assistant Provider
 * Manages state for the persistent AI assistant chat interface
 */
export function AIAssistantProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // Initialize state
  const [state, setState] = useState<AIAssistantState>({
    // UI State
    isExpanded: false,
    isMinimized: false,

    // Conversation State
    activeConversationId: null,
    conversations: [],
    messages: [],

    // Voice Session State
    voiceSessionActive: false,
    voiceProvider: 'openai',

    // Input State
    inputMode: 'text',
    isTyping: false,
    isListening: false,
    isSending: false,

    // Context
    currentContext: null,

    // Loading State
    isLoadingConversations: false,
    isLoadingMessages: false,
    error: null,
  })

  // Load persisted state from storage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const isExpanded = sessionStorage.getItem(STORAGE_KEYS.IS_EXPANDED) === 'true'
      const activeConversationId = localStorage.getItem(STORAGE_KEYS.ACTIVE_CONVERSATION_ID)
      const voiceProvider = (localStorage.getItem(STORAGE_KEYS.VOICE_PROVIDER) as VoiceProviderType) || 'openai'

      setState(prev => ({
        ...prev,
        isExpanded,
        activeConversationId,
        voiceProvider,
      }))
    } catch (error) {
      console.error('Failed to load AI assistant state from storage:', error)
    }
  }, [])

  // Persist state changes to storage
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      sessionStorage.setItem(STORAGE_KEYS.IS_EXPANDED, String(state.isExpanded))
      if (state.activeConversationId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_CONVERSATION_ID, state.activeConversationId)
      }
      localStorage.setItem(STORAGE_KEYS.VOICE_PROVIDER, state.voiceProvider)
    } catch (error) {
      console.error('Failed to persist AI assistant state:', error)
    }
  }, [state.isExpanded, state.activeConversationId, state.voiceProvider])

  // Detect page context changes
  useEffect(() => {
    const context = detectPageContext(pathname)
    setState(prev => ({ ...prev, currentContext: context }))
  }, [pathname])

  // Load conversations on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    const loadInitialData = async () => {
      try {
        // Load conversations list
        const response = await fetch('/api/ai/conversations')
        if (response.ok) {
          const data: ListConversationsResponse = await response.json()
          setState(prev => ({
            ...prev,
            conversations: data.conversations,
          }))
        }

        // If we have an active conversation ID from localStorage, load its messages
        const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_CONVERSATION_ID)
        if (activeId) {
          const messagesResponse = await fetch(`/api/ai/conversations/${activeId}/messages`)
          if (messagesResponse.ok) {
            const messagesData: ListMessagesResponse = await messagesResponse.json()
            setState(prev => ({
              ...prev,
              messages: messagesData.messages,
            }))
          }
        }
      } catch (error) {
        console.error('Failed to load initial AI assistant data:', error)
      }
    }

    loadInitialData()
  }, [])

  // UI Actions
  const toggleExpanded = useCallback(() => {
    setState(prev => ({ ...prev, isExpanded: !prev.isExpanded, isMinimized: false }))
  }, [])

  const setExpanded = useCallback((expanded: boolean) => {
    setState(prev => ({ ...prev, isExpanded: expanded, isMinimized: false }))
  }, [])

  const minimize = useCallback(() => {
    setState(prev => ({ ...prev, isMinimized: !prev.isMinimized, isExpanded: false }))
  }, [])

  // Message Actions
  const sendMessage = useCallback(async (content: string, metadata?: ChatMessage['metadata']) => {
    setState(prev => ({ ...prev, isSending: true, error: null }))

    try {
      // Create conversation if needed
      let conversationId = state.activeConversationId
      if (!conversationId) {
        conversationId = await startNewConversation()
      }

      // Optimistically add user message
      const tempUserMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        role: 'user',
        content,
        metadata: {
          context: state.currentContext || undefined,
          ...metadata,
        },
        created_at: new Date().toISOString(),
      }

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, tempUserMessage],
      }))

      // Send to API
      const request: SendMessageRequest = {
        conversation_id: conversationId,
        content,
        role: 'user',
        metadata: {
          context: state.currentContext || undefined,
          ...metadata,
        },
        context: state.currentContext || undefined,
      }

      const response = await fetch('/api/ai/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`)
      }

      const data: SendMessageResponse = await response.json()

      // Replace temp message with real message and add assistant response
      setState(prev => ({
        ...prev,
        messages: [
          ...prev.messages.filter(m => m.id !== tempUserMessage.id),
          data.message,
          ...(data.assistant_message ? [data.assistant_message] : []),
        ],
        isSending: false,
      }))
    } catch (error) {
      console.error('Failed to send message:', error)
      setState(prev => ({
        ...prev,
        error: (error as Error).message,
        isSending: false,
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.activeConversationId, state.currentContext])

  const streamMessage = useCallback(async (content: string) => {
    setState(prev => ({ ...prev, isSending: true, error: null }))

    try {
      // Optimistically add user message with temp ID
      const tempUserMessageId = `temp-user-${Date.now()}`
      const tempAssistantMessageId = `temp-assistant-${Date.now()}`

      const tempUserMessage: ChatMessage = {
        id: tempUserMessageId,
        conversation_id: state.activeConversationId || '',
        role: 'user',
        content,
        metadata: {
          context: state.currentContext || undefined,
        },
        created_at: new Date().toISOString(),
      }

      // Add streaming assistant message placeholder
      const tempAssistantMessage: ChatMessage = {
        id: tempAssistantMessageId,
        conversation_id: state.activeConversationId || '',
        role: 'assistant',
        content: '',
        metadata: {},
        created_at: new Date().toISOString(),
        isStreaming: true,
      }

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, tempUserMessage, tempAssistantMessage],
      }))

      // Call streaming endpoint
      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: state.activeConversationId,
          content,
          context: state.currentContext,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error('No response body for streaming')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let streamedContent = ''
      let finalConversationId = state.activeConversationId
      let finalUserMessage: ChatMessage | null = null
      let finalAssistantMessage: ChatMessage | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'conversation_id') {
                finalConversationId = data.conversation_id
                finalUserMessage = data.user_message

                // Update conversation ID if it was created
                if (!state.activeConversationId && finalConversationId) {
                  setState(prev => ({
                    ...prev,
                    activeConversationId: finalConversationId,
                  }))
                }
              } else if (data.type === 'content') {
                streamedContent += data.content

                // Update the streaming message content
                setState(prev => ({
                  ...prev,
                  messages: prev.messages.map(m =>
                    m.id === tempAssistantMessageId
                      ? { ...m, content: streamedContent }
                      : m
                  ),
                }))
              } else if (data.type === 'done') {
                finalAssistantMessage = data.assistant_message
              } else if (data.type === 'error') {
                throw new Error(data.error)
              }
            } catch (parseError) {
              // Ignore JSON parse errors for incomplete chunks
              if (!(parseError instanceof SyntaxError)) {
                throw parseError
              }
            }
          }
        }
      }

      // Replace temp messages with final messages
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(m => {
          if (m.id === tempUserMessageId && finalUserMessage) {
            return finalUserMessage
          }
          if (m.id === tempAssistantMessageId && finalAssistantMessage) {
            return { ...finalAssistantMessage, isStreaming: false }
          }
          return m
        }),
        isSending: false,
      }))

      // If a new conversation was created, reload conversations list
      if (!state.activeConversationId && finalConversationId) {
        // Reload conversations list to include the new conversation
        try {
          const convResponse = await fetch('/api/ai/conversations')
          if (convResponse.ok) {
            const convData = await convResponse.json()
            setState(prev => ({
              ...prev,
              conversations: convData.conversations,
            }))
          }
        } catch {
          // Non-critical, don't fail the whole operation
          console.warn('Failed to reload conversations after new conversation created')
        }
      }
    } catch (error) {
      console.error('Failed to stream message:', error)
      setState(prev => ({
        ...prev,
        error: (error as Error).message,
        isSending: false,
        // Remove the streaming message on error
        messages: prev.messages.filter(m => !m.isStreaming),
      }))
    }
  }, [state.activeConversationId, state.currentContext])

  // Voice Actions
  const startVoiceSession = useCallback(async () => {
    setState(prev => ({ ...prev, voiceSessionActive: true, inputMode: 'voice', isListening: true }))
  }, [])

  const endVoiceSession = useCallback(() => {
    setState(prev => ({ ...prev, voiceSessionActive: false, inputMode: 'text', isListening: false }))
  }, [])

  const setInputMode = useCallback((mode: 'text' | 'voice') => {
    setState(prev => ({ ...prev, inputMode: mode }))
  }, [])

  // Conversation Actions
  const loadConversations = useCallback(async () => {
    setState(prev => ({ ...prev, isLoadingConversations: true, error: null }))

    try {
      const response = await fetch('/api/ai/conversations')

      if (!response.ok) {
        throw new Error(`Failed to load conversations: ${response.statusText}`)
      }

      const data: ListConversationsResponse = await response.json()

      setState(prev => ({
        ...prev,
        conversations: data.conversations,
        isLoadingConversations: false,
      }))
    } catch (error) {
      console.error('Failed to load conversations:', error)
      setState(prev => ({
        ...prev,
        error: (error as Error).message,
        isLoadingConversations: false,
      }))
    }
  }, [])

  const loadConversation = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, isLoadingMessages: true, error: null, activeConversationId: id }))

    try {
      const response = await fetch(`/api/ai/conversations/${id}/messages`)

      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.statusText}`)
      }

      const data: ListMessagesResponse = await response.json()

      setState(prev => ({
        ...prev,
        messages: data.messages,
        isLoadingMessages: false,
      }))
    } catch (error) {
      console.error('Failed to load conversation:', error)
      setState(prev => ({
        ...prev,
        error: (error as Error).message,
        isLoadingMessages: false,
      }))
    }
  }, [])

  const startNewConversation = useCallback(async (title?: string): Promise<string> => {
    try {
      const response = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })

      if (!response.ok) {
        throw new Error(`Failed to create conversation: ${response.statusText}`)
      }

      const data: CreateConversationResponse = await response.json()

      setState(prev => ({
        ...prev,
        conversations: [data.conversation, ...prev.conversations],
        activeConversationId: data.conversation.id,
        messages: [],
      }))

      return data.conversation.id
    } catch (error) {
      console.error('Failed to create conversation:', error)
      setState(prev => ({ ...prev, error: (error as Error).message }))
      throw error
    }
  }, [])

  const deleteConversation = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/ai/conversations/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`Failed to delete conversation: ${response.statusText}`)
      }

      setState(prev => ({
        ...prev,
        conversations: prev.conversations.filter(c => c.id !== id),
        ...(prev.activeConversationId === id ? { activeConversationId: null, messages: [] } : {}),
      }))
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      setState(prev => ({ ...prev, error: (error as Error).message }))
    }
  }, [])

  const archiveConversation = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/ai/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      })

      if (!response.ok) {
        throw new Error(`Failed to archive conversation: ${response.statusText}`)
      }

      setState(prev => ({
        ...prev,
        conversations: prev.conversations.map(c =>
          c.id === id ? { ...c, is_active: false } : c
        ),
      }))
    } catch (error) {
      console.error('Failed to archive conversation:', error)
      setState(prev => ({ ...prev, error: (error as Error).message }))
    }
  }, [])

  const searchConversations = useCallback(async (query: string) => {
    setState(prev => ({ ...prev, isLoadingConversations: true, error: null }))

    try {
      const response = await fetch(`/api/ai/conversations?search=${encodeURIComponent(query)}`)

      if (!response.ok) {
        throw new Error(`Failed to search conversations: ${response.statusText}`)
      }

      const data: ListConversationsResponse = await response.json()

      setState(prev => ({
        ...prev,
        conversations: data.conversations,
        isLoadingConversations: false,
      }))
    } catch (error) {
      console.error('Failed to search conversations:', error)
      setState(prev => ({
        ...prev,
        error: (error as Error).message,
        isLoadingConversations: false,
      }))
    }
  }, [])

  // Context Actions
  const setCurrentContext = useCallback((context: PageContext | null) => {
    setState(prev => ({ ...prev, currentContext: context }))
  }, [])

  // Quick Actions
  const executeQuickAction = useCallback(async (actionId: string) => {
    console.log('Executing quick action:', actionId)

    // Generate prompt based on action type and send as message
    const actionPrompts: Record<string, string> = {
      create_contact: 'I want to create a new contact. Please help me with the details.',
      search_crm: 'Search the CRM for recent activity and give me a summary.',
      add_note: state.currentContext?.entity_id
        ? `Add a note to the current ${state.currentContext.entity_type || 'record'}.`
        : 'I want to add a note. Which contact or project should I add it to?',
      log_knock: 'Log a door knock at my current location.',
      check_pipeline: 'Show me the current pipeline status and any deals that need attention.',
      make_call: state.currentContext?.entity_type === 'contact'
        ? `Help me prepare for a call with this contact.`
        : 'I want to make a call. Which contact should I call?',
      send_sms: state.currentContext?.entity_type === 'contact'
        ? `Help me send an SMS to this contact.`
        : 'I want to send an SMS. Which contact should I message?',
      get_weather: 'What\'s the current weather? Is it a good day for door knocking?',
    }

    const prompt = actionPrompts[actionId]
    if (prompt) {
      // Open the assistant if not expanded
      if (!state.isExpanded) {
        setState(prev => ({ ...prev, isExpanded: true, isMinimized: false }))
      }

      // Send the message using streaming
      await streamMessage(prompt)
    } else {
      console.warn('Unknown quick action:', actionId)
    }
  }, [state.currentContext, state.isExpanded, streamMessage])

  // Error Handling
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const contextValue: AIAssistantContextType = {
    ...state,
    toggleExpanded,
    setExpanded,
    minimize,
    sendMessage,
    streamMessage,
    startVoiceSession,
    endVoiceSession,
    setInputMode,
    loadConversations,
    loadConversation,
    startNewConversation,
    deleteConversation,
    archiveConversation,
    searchConversations,
    setCurrentContext,
    executeQuickAction,
    clearError,
  }

  return (
    <AIAssistantContext.Provider value={contextValue}>
      {children}
    </AIAssistantContext.Provider>
  )
}

/**
 * Hook to access AI Assistant context
 */
export function useAIAssistant() {
  const context = useContext(AIAssistantContext)

  if (!context) {
    throw new Error('useAIAssistant must be used within AIAssistantProvider')
  }

  return context
}

/**
 * Detect page context from pathname
 */
function detectPageContext(pathname: string): PageContext | null {
  // Match patterns like /contacts/[id], /projects/[id], etc.
  const patterns = [
    { regex: /^\/contacts\/([a-f0-9-]+)$/, type: 'contact' as const },
    { regex: /^\/projects\/([a-f0-9-]+)$/, type: 'project' as const },
    { regex: /^\/jobs\/([a-f0-9-]+)$/, type: 'job' as const },
    { regex: /^\/territories\/([a-f0-9-]+)$/, type: 'territory' as const },
    { regex: /^\/knocks\/([a-f0-9-]+)$/, type: 'knock' as const },
  ]

  for (const pattern of patterns) {
    const match = pathname.match(pattern.regex)
    if (match) {
      return {
        page: pathname,
        entity_type: pattern.type,
        entity_id: match[1],
      }
    }
  }

  // Just return page context without entity info
  return {
    page: pathname,
  }
}

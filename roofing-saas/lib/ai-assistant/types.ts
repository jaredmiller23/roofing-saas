/**
 * AI Assistant Types
 * Type definitions for persistent AI chat interface
 */

import { VoiceProviderType } from '@/lib/voice/providers'

// Database Types
export interface AIConversation {
  id: string
  tenant_id: string
  user_id: string
  title: string | null
  created_at: string
  updated_at: string
  is_active: boolean
  metadata: {
    last_context?: PageContext
    message_count?: number
    [key: string]: unknown
  }
}

export interface AIMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system' | 'function'
  content: string
  function_call?: {
    name: string
    parameters: Record<string, unknown>
    result?: unknown
  }
  metadata: {
    voice?: boolean
    provider?: VoiceProviderType
    context?: PageContext
    [key: string]: unknown
  }
  created_at: string
}

// UI Types
export interface ChatMessage extends AIMessage {
  // Client-side extensions
  isStreaming?: boolean
  error?: string
}

export interface PageContext {
  page: string
  entity_type?: 'contact' | 'project' | 'job' | 'territory' | 'knock'
  entity_id?: string
  entity_data?: Record<string, unknown>
}

export interface QuickAction {
  id: string
  label: string
  icon: string
  description: string
  action: () => void | Promise<void>
}

// State Types
export interface AIAssistantState {
  // UI State
  isExpanded: boolean
  isMinimized: boolean

  // Conversation State
  activeConversationId: string | null
  conversations: AIConversation[]
  messages: ChatMessage[]

  // Voice Session State
  voiceSessionActive: boolean
  voiceProvider: VoiceProviderType

  // Input State
  inputMode: 'text' | 'voice'
  isTyping: boolean
  isListening: boolean
  isSending: boolean

  // Context
  currentContext: PageContext | null

  // Loading State
  isLoadingConversations: boolean
  isLoadingMessages: boolean
  error: string | null
}

export interface AIAssistantActions {
  // UI Actions
  toggleExpanded: () => void
  setExpanded: (expanded: boolean) => void
  minimize: () => void

  // Message Actions
  sendMessage: (content: string, metadata?: Partial<AIMessage['metadata']>) => Promise<void>
  streamMessage: (content: string) => Promise<void>

  // Voice Actions
  startVoiceSession: () => Promise<void>
  endVoiceSession: () => void
  setInputMode: (mode: 'text' | 'voice') => void

  // Conversation Actions
  loadConversations: () => Promise<void>
  loadConversation: (id: string) => Promise<void>
  searchConversations: (query: string) => Promise<void>
  startNewConversation: (title?: string) => Promise<string>
  deleteConversation: (id: string) => Promise<void>
  archiveConversation: (id: string) => Promise<void>
  searchConversations: (query: string) => Promise<void>

  // Context Actions
  setCurrentContext: (context: PageContext | null) => void

  // Quick Actions
  executeQuickAction: (actionId: string) => Promise<void>

  // Error Handling
  clearError: () => void
}

export type AIAssistantContextType = AIAssistantState & AIAssistantActions

// API Types
export interface SendMessageRequest {
  conversation_id?: string
  content: string
  role: 'user'
  metadata?: Partial<AIMessage['metadata']>
  context?: PageContext
}

export interface SendMessageResponse {
  message: AIMessage
  assistant_message?: AIMessage
  conversation_id: string
}

export interface CreateConversationRequest {
  title?: string
  metadata?: AIConversation['metadata']
}

export interface CreateConversationResponse {
  conversation: AIConversation
}

export interface ListConversationsResponse {
  conversations: AIConversation[]
  total: number
}

export interface ListMessagesResponse {
  messages: AIMessage[]
  total: number
  has_more: boolean
}

// Function Call Types
export interface AIFunctionCall {
  name: string
  description: string
  parameters: Record<string, unknown>
  execute: (params: Record<string, unknown>) => Promise<unknown>
}

// Quick Action Types
export type QuickActionType =
  | 'create_contact'
  | 'search_crm'
  | 'add_note'
  | 'log_knock'
  | 'check_pipeline'
  | 'make_call'
  | 'send_sms'
  | 'get_weather'

export interface QuickActionConfig {
  id: QuickActionType
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  requiresContext?: boolean
  showInContexts?: PageContext['entity_type'][]
}

/**
 * TypeScript types for Messages tab
 * Used across conversation list, message threads, and API responses
 */

export interface Conversation {
  contact_id: string
  contact_name: string
  contact_phone: string | null
  last_message: string
  last_message_at: string
  last_message_direction: 'inbound' | 'outbound'
  unread_count: number
}

export interface Message {
  id: string
  content: string
  direction: 'inbound' | 'outbound'
  created_at: string
  from_address: string | null
  to_address: string | null
  metadata: Record<string, unknown> | null
  read_at: string | null
}

export interface SendMessageRequest {
  contactId: string
  contactPhone: string
  body: string
}

export interface SendMessageResponse {
  success: boolean
  message?: Message
  error?: string
}

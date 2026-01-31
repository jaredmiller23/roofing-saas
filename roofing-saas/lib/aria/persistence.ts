/**
 * ARIA Chat Persistence
 *
 * Utility functions for persisting chat conversations and messages
 * to the ai_conversations / ai_messages tables.
 *
 * Uses createAdminClient() (service role) since the streaming handler
 * cannot reliably use user session cookies.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { Json } from '@/lib/types/database.types'

// =============================================================================
// Conversation Management
// =============================================================================

/**
 * Create a new conversation record
 */
export async function createConversation(
  tenantId: string,
  userId: string,
  title?: string
): Promise<string | null> {
  try {
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        title: title || null,
        is_active: true,
        metadata: {},
      })
      .select('id')
      .single()

    if (error) {
      logger.error('Failed to create conversation', { error, tenantId, userId })
      return null
    }

    return data.id
  } catch (error) {
    logger.error('Error creating conversation', { error })
    return null
  }
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  try {
    const supabase = await createAdminClient()

    const { error } = await supabase
      .from('ai_conversations')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    if (error) {
      logger.error('Failed to update conversation title', { error, conversationId })
    }
  } catch (error) {
    logger.error('Error updating conversation title', { error })
  }
}

// =============================================================================
// Message Persistence
// =============================================================================

/**
 * Save a message to the ai_messages table
 */
export async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system' | 'function',
  content: string,
  functionCall?: {
    name: string
    parameters?: Record<string, unknown>
    result?: unknown
  },
  metadata?: Record<string, unknown>
): Promise<string | null> {
  try {
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        function_call: (functionCall || null) as unknown as Json | null,
        metadata: (metadata || {}) as unknown as Json,
      })
      .select('id')
      .single()

    if (error) {
      logger.error('Failed to save message', { error, conversationId, role })
      return null
    }

    // Touch conversation updated_at
    await supabase
      .from('ai_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    return data.id
  } catch (error) {
    logger.error('Error saving message', { error })
    return null
  }
}

// =============================================================================
// Title Generation
// =============================================================================

/**
 * Generate a conversation title from the first user message.
 * Truncates to ~60 chars at a word boundary.
 */
export function generateTitle(message: string): string {
  const cleaned = message.trim().replace(/\s+/g, ' ')

  if (cleaned.length <= 60) {
    return cleaned
  }

  // Truncate at word boundary
  const truncated = cleaned.slice(0, 60)
  const lastSpace = truncated.lastIndexOf(' ')

  if (lastSpace > 20) {
    return truncated.slice(0, lastSpace) + '...'
  }

  return truncated + '...'
}

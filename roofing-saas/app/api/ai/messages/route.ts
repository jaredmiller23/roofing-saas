import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import type { AIMessage, SendMessageRequest, SendMessageResponse } from '@/lib/ai-assistant/types'

/**
 * POST /api/ai/messages
 * Send a message and get AI response
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
    }

    const body: SendMessageRequest = await request.json()
    const { conversation_id, content, role, metadata = {}, context } = body

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify or create conversation
    let conversationId = conversation_id

    if (conversationId) {
      // Verify ownership
      const { data: conversation } = await supabase
        .from('ai_conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)
        .eq('user_id', user.id)
        .single()

      if (!conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        )
      }
    } else {
      // Create new conversation with auto-generated title from first message
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '')

      const { data: newConversation, error: createError } = await supabase
        .from('ai_conversations')
        .insert({
          tenant_id: tenantId,
          user_id: user.id,
          title,
          metadata: { last_context: context },
        })
        .select()
        .single()

      if (createError || !newConversation) {
        console.error('Error creating conversation:', createError)
        return NextResponse.json(
          { error: 'Failed to create conversation' },
          { status: 500 }
        )
      }

      conversationId = newConversation.id
    }

    // Save user message
    const { data: userMessage, error: userMsgError } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        metadata: {
          ...metadata,
          context,
        },
      })
      .select()
      .single()

    if (userMsgError || !userMessage) {
      console.error('Error saving user message:', userMsgError)
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: 500 }
      )
    }

    // Generate AI response (simplified - using a basic response for now)
    // TODO: Integrate with OpenAI API for actual AI responses
    const assistantContent = generateSimpleResponse(content, context)

    const { data: assistantMessage, error: assistantMsgError } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantContent,
        metadata: {
          context,
        },
      })
      .select()
      .single()

    if (assistantMsgError || !assistantMessage) {
      console.error('Error saving assistant message:', assistantMsgError)
      return NextResponse.json(
        { error: 'Failed to save assistant response' },
        { status: 500 }
      )
    }

    // Safety check (should never happen due to logic above)
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID not set' },
        { status: 500 }
      )
    }

    const response: SendMessageResponse = {
      message: userMessage as AIMessage,
      assistant_message: assistantMessage as AIMessage,
      conversation_id: conversationId,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in POST /api/ai/messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Generate a simple response (placeholder for OpenAI integration)
 * TODO: Replace with actual OpenAI API call
 */
function generateSimpleResponse(userMessage: string, context?: { page?: string; entity_type?: string; entity_id?: string }): string {
  const lowerMessage = userMessage.toLowerCase()

  // Context-aware responses
  if (context?.entity_type === 'contact' && context.entity_id) {
    if (lowerMessage.includes('add note') || lowerMessage.includes('note')) {
      return `I can help you add a note to this contact. What would you like the note to say?`
    }
    if (lowerMessage.includes('call') || lowerMessage.includes('phone')) {
      return `I can help you make a call to this contact. Would you like me to initiate the call?`
    }
  }

  // General CRM actions
  if (lowerMessage.includes('create contact') || lowerMessage.includes('new contact')) {
    return `I'll help you create a new contact. What's the person's name and contact information?`
  }

  if (lowerMessage.includes('search') || lowerMessage.includes('find')) {
    return `I can help you search the CRM. What are you looking for?`
  }

  if (lowerMessage.includes('door knock') || lowerMessage.includes('log knock')) {
    return `I'll help you log a door knock. What's the address and what was the outcome?`
  }

  if (lowerMessage.includes('pipeline') || lowerMessage.includes('deals')) {
    return `I can show you pipeline information. Are you looking for a specific stage or overall metrics?`
  }

  if (lowerMessage.includes('weather')) {
    return `I can check the weather for you. What location and timeframe are you interested in?`
  }

  // Generic helpful response
  return `I understand you're asking about: "${userMessage}". I'm here to help with your CRM tasks like creating contacts, searching records, logging door knocks, checking the pipeline, and more. Could you provide more details about what you'd like to do?`
}

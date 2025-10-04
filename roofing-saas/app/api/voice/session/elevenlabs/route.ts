import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError,
  mapSupabaseError,
  InternalError
} from '@/lib/api/errors'
import { createdResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * POST /api/voice/session/elevenlabs
 * Create a new voice assistant session using ElevenLabs Conversational AI
 *
 * This endpoint:
 * 1. Generates an ElevenLabs conversation token
 * 2. Creates a voice_sessions record in database with provider='elevenlabs'
 * 3. Returns session_id and conversation_token for WebRTC connection
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    logger.apiRequest('POST', '/api/voice/session/elevenlabs', { tenantId, userId: user.id })

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const { contact_id, project_id, context } = body

    // Get agent ID from environment or request
    const agentId = body.agent_id || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID
    if (!agentId) {
      throw InternalError('ElevenLabs Agent ID not configured')
    }

    // Get ElevenLabs API key
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY
    if (!elevenLabsApiKey) {
      throw InternalError('ElevenLabs API key not configured')
    }

    // Call ElevenLabs to get conversation token
    const tokenResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': elevenLabsApiKey,
        },
      }
    )

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      logger.error('ElevenLabs token generation failed', {
        status: tokenResponse.status,
        error: errorText
      })
      throw InternalError('Failed to generate ElevenLabs conversation token')
    }

    const tokenData = await tokenResponse.json()
    logger.info('ElevenLabs token response structure', {
      hasSignedUrl: !!tokenData.signed_url,
      hasConversationId: !!tokenData.conversation_id,
    })

    const { signed_url, conversation_id } = tokenData

    if (!signed_url) {
      logger.error('Invalid ElevenLabs token response', { tokenData })
      throw InternalError('Invalid response from ElevenLabs')
    }

    // Create voice_sessions record
    const supabase = await createClient()

    const { data: session, error } = await supabase
      .from('voice_sessions')
      .insert({
        tenant_id: tenantId,
        user_id: user.id,
        provider: 'elevenlabs',
        session_id: conversation_id || `el_${Date.now()}`,
        status: 'active',
        contact_id: contact_id || null,
        project_id: project_id || null,
        context: context || {},
        connection_info: {
          agent_id: agentId,
          provider: 'elevenlabs',
        },
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create voice session record', { error })
      throw mapSupabaseError(error)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/voice/session/elevenlabs', 201, duration)
    logger.info('ElevenLabs voice session created', {
      sessionId: session.id,
      conversationId: conversation_id,
      agentId,
      tenantId
    })

    return createdResponse({
      session_id: session.id,
      database_session_id: session.id,
      signed_url,
      agent_id: agentId,
      provider: 'elevenlabs',
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('ElevenLabs session creation error', { error, duration })
    return errorResponse(error as Error)
  }
}

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
 * POST /api/voice/session
 * Create a new voice assistant session using OpenAI Realtime API
 *
 * This endpoint:
 * 1. Generates an ephemeral OpenAI token (30 min TTL)
 * 2. Creates a voice_sessions record in database
 * 3. Returns session_id and ephemeral_token for WebRTC connection
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

    logger.apiRequest('POST', '/api/voice/session', { tenantId, userId: user.id })

    // Parse optional request body (contact context, project context)
    const body = await request.json().catch(() => ({}))
    const { contact_id, project_id, context } = body

    // Generate ephemeral OpenAI token
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      throw InternalError('OpenAI API key not configured')
    }

    // Call OpenAI to generate ephemeral token
    const tokenResponse = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'alloy',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      logger.error('OpenAI ephemeral token generation failed', {
        status: tokenResponse.status,
        error: errorText
      })
      throw InternalError('Failed to generate voice session token')
    }

    const tokenData = await tokenResponse.json()
    const { id: openai_session_id, client_secret } = tokenData

    if (!openai_session_id || !client_secret) {
      logger.error('Invalid OpenAI token response', { tokenData })
      throw InternalError('Invalid response from OpenAI')
    }

    // Create voice_sessions record
    const supabase = await createClient()

    const { data: session, error } = await supabase
      .from('voice_sessions')
      .insert({
        tenant_id: tenantId,
        user_id: user.id,
        session_id: openai_session_id,
        status: 'active',
        contact_id: contact_id || null,
        project_id: project_id || null,
        context: context || {},
        connection_info: {
          model: 'gpt-4o-realtime-preview-2024-12-17',
          voice: 'alloy',
        },
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create voice session record', { error })
      throw mapSupabaseError(error)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/voice/session', 201, duration)
    logger.info('Voice session created', {
      sessionId: session.id,
      openaiSessionId: openai_session_id,
      tenantId
    })

    return createdResponse({
      session_id: openai_session_id,
      ephemeral_token: client_secret.value,
      database_session_id: session.id,
      expires_at: client_secret.expires_at,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Voice session creation error', { error, duration })
    return errorResponse(error as Error)
  }
}

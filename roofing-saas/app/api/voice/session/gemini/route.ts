import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import {
  mapSupabaseError,
  InternalError
} from '@/lib/api/errors'
import { createdResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * POST /api/voice/session/gemini
 * Create a new voice assistant session using Google Gemini Live API
 *
 * This endpoint:
 * 1. Validates Google Gemini API key
 * 2. Creates a voice_sessions record in database
 * 3. Returns session_id and API key for WebSocket connection
 *
 * Cost: $0.05/minute (83% cheaper than OpenAI)
 */
export const POST = withAuth(async (request, { userId, tenantId }) => {
  const startTime = Date.now()

  try {
    logger.apiRequest('POST', '/api/voice/session/gemini', { tenantId, userId })

    // Parse optional request body (contact context, project context)
    const body = await request.json().catch(() => ({}))
    const { contact_id, project_id, language, context } = body

    // Validate Gemini API key
    const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY
    if (!geminiApiKey) {
      throw InternalError('Google Gemini API key not configured. Please set GOOGLE_GEMINI_API_KEY in environment variables.')
    }

    // Generate unique session ID
    const geminiSessionId = `gemini_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // Model configuration
    const model = 'gemini-2.5-flash-native-audio-preview-09-2025'

    // Create voice_sessions record
    const supabase = await createClient()

    const { data: session, error } = await supabase
      .from('voice_sessions')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        session_id: geminiSessionId,
        provider: 'gemini',
        status: 'active',
        contact_id: contact_id || null,
        project_id: project_id || null,
        context: context || {},
        connection_info: {
          model,
          provider: 'gemini',
          cost_per_minute: 0.05,
          language: language || 'en',
        },
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create Gemini voice session record', { error })
      throw mapSupabaseError(error)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/voice/session/gemini', 201, duration)
    logger.info('Gemini voice session created', {
      sessionId: session.id,
      geminiSessionId,
      tenantId,
      model
    })

    return createdResponse({
      session_id: geminiSessionId,
      ephemeral_token: geminiApiKey, // API key acts as the token for WebSocket connection
      database_session_id: session.id,
      model,
      provider: 'gemini',
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Gemini voice session creation error', { error, duration })
    return errorResponse(error as Error)
  }
})

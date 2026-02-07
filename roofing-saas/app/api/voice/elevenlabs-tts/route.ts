import { withAuth } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'

/**
 * POST /api/voice/elevenlabs-tts
 * Convert text to speech using ElevenLabs premium voices
 *
 * Body: { text: string, voice_id?: string }
 * Returns: Audio stream (mp3)
 */
export const POST = withAuth(async (request) => {
  const startTime = Date.now()

  try {
    const body = await request.json().catch(() => ({}))
    const { text, voice_id = 'EXAVITQu4vr4xnSDxMaL' } = body // Default: Bella voice

    if (!text) {
      return new Response(JSON.stringify({ error: 'Text is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      logger.warn('ElevenLabs API key not configured')
      return new Response(JSON.stringify({ error: 'ElevenLabs not configured' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    logger.apiRequest('POST', '/api/voice/elevenlabs-tts', {
      textLength: text.length,
      voiceId: voice_id
    })

    // Call ElevenLabs TTS API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}/stream`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5', // Fast, high-quality model
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true
          }
        })
      }
    )

    if (!response.ok) {
      const error = await response.text()
      logger.error('ElevenLabs TTS error', { status: response.status, error })
      return new Response(JSON.stringify({ error: 'TTS generation failed' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/voice/elevenlabs-tts', 200, duration)

    // Stream the audio back
    return new Response(response.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked'
      }
    })

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('ElevenLabs TTS error', { error, duration })
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

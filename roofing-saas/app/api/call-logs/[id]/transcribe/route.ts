import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { transcribeAndSummarize } from '@/lib/transcription/whisper'
import { NotFoundError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * POST /api/call-logs/[id]/transcribe
 * Manually trigger transcription for a call recording
 *
 * Useful for:
 * - Recordings where auto-transcription failed
 * - Re-transcribing with updated AI model
 * - Older recordings imported without transcription
 */
export const POST = withAuthParams(async (request: NextRequest, { userId, tenantId }, { params }) => {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get the call log with recording URL
    const { data: call, error: fetchError } = await supabase
      .from('call_logs')
      .select('id, recording_url, twilio_call_sid, transcription')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (fetchError || !call) {
      logger.error('Call log not found', { id, tenantId, error: fetchError })
      throw NotFoundError('Call log')
    }

    if (!call.recording_url) {
      throw ValidationError('No recording available for this call')
    }

    // Check if transcription already exists (optional - allow re-transcription)
    const { force } = await request.json().catch(() => ({ force: false }))
    if (call.transcription && !force) {
      throw ValidationError('Transcription already exists. Use force=true to re-transcribe.')
    }

    logger.info('Starting manual transcription', { callId: id, userId })

    // Remove .mp3 extension if present (Whisper service adds it)
    const recordingUrl = call.recording_url.replace(/\.mp3$/, '')

    // Transcribe and generate summary
    const { transcription, summary } = await transcribeAndSummarize(recordingUrl)

    // Update call log with transcription
    const { error: updateError } = await supabase
      .from('call_logs')
      .update({
        transcription: transcription.text,
        transcription_confidence: transcription.confidence,
        transcription_provider: transcription.provider,
        summary: summary.summary,
        sentiment: summary.sentiment,
        key_points: summary.key_points,
      })
      .eq('id', id)

    if (updateError) {
      logger.error('Failed to update call log with transcription', {
        error: updateError,
        callId: id,
      })
      throw InternalError('Failed to save transcription')
    }

    logger.info('Manual transcription complete', {
      callId: id,
      textLength: transcription.text.length,
      sentiment: summary.sentiment,
    })

    return successResponse({
      transcription: transcription.text,
      summary: summary.summary,
      sentiment: summary.sentiment,
      key_points: summary.key_points,
      confidence: transcription.confidence,
      provider: transcription.provider,
    })
  } catch (error) {
    logger.error('Manual transcription error', { error })
    return errorResponse(error instanceof Error ? error : InternalError('Transcription failed'))
  }
})

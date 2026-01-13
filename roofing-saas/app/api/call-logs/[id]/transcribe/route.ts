import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { transcribeAndSummarize } from '@/lib/transcription/whisper'

/**
 * POST /api/call-logs/[id]/transcribe
 * Manually trigger transcription for a call recording
 *
 * Useful for:
 * - Recordings where auto-transcription failed
 * - Re-transcribing with updated AI model
 * - Older recordings imported without transcription
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No tenant found' },
        { status: 403 }
      )
    }

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
      return NextResponse.json(
        { success: false, error: 'Call log not found' },
        { status: 404 }
      )
    }

    if (!call.recording_url) {
      return NextResponse.json(
        { success: false, error: 'No recording available for this call' },
        { status: 400 }
      )
    }

    // Check if transcription already exists (optional - allow re-transcription)
    const { force } = await request.json().catch(() => ({ force: false }))
    if (call.transcription && !force) {
      return NextResponse.json(
        { success: false, error: 'Transcription already exists. Use force=true to re-transcribe.' },
        { status: 400 }
      )
    }

    logger.info('Starting manual transcription', { callId: id, userId: user.id })

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
      return NextResponse.json(
        { success: false, error: 'Failed to save transcription' },
        { status: 500 }
      )
    }

    logger.info('Manual transcription complete', {
      callId: id,
      textLength: transcription.text.length,
      sentiment: summary.sentiment,
    })

    return NextResponse.json({
      success: true,
      data: {
        transcription: transcription.text,
        summary: summary.summary,
        sentiment: summary.sentiment,
        key_points: summary.key_points,
        confidence: transcription.confidence,
        provider: transcription.provider,
      },
    })
  } catch (error) {
    logger.error('Manual transcription error', { error })
    return NextResponse.json(
      { success: false, error: 'Transcription failed' },
      { status: 500 }
    )
  }
}

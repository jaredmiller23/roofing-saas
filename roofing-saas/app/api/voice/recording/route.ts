import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { verifyTwilioSignature, parseTwilioFormData } from '@/lib/webhooks/security'
import { transcribeAndSummarize } from '@/lib/transcription/whisper'

/**
 * Trigger Whisper transcription in background
 *
 * Updates both activities and call_logs tables with transcription results.
 * This runs async after the webhook responds to Twilio.
 */
async function triggerWhisperTranscription(
  activityId: string,
  recordingUrl: string,
  tenantId: string,
  callSid: string
): Promise<void> {
  logger.info('Starting Whisper transcription', { activityId, recordingUrl })

  try {
    // Get transcription and summary
    const { transcription, summary } = await transcribeAndSummarize(recordingUrl)

    const supabase = await createAdminClient()

    // Update activity with transcription data
    const { error: activityError } = await supabase
      .from('activities')
      .update({
        transcript: transcription.text,
        outcome: summary.sentiment || 'completed',
        content: summary.summary || undefined,
      })
      .eq('id', activityId)

    if (activityError) {
      logger.error('Failed to update activity with transcription', {
        error: activityError,
        activityId,
      })
    } else {
      logger.info('Activity updated with Whisper transcription', { activityId })
    }

    // Also update call_logs if it exists
    const { error: callLogError } = await supabase
      .from('call_logs')
      .update({
        transcription: transcription.text,
        transcription_confidence: transcription.confidence,
        transcription_provider: transcription.provider,
        summary: summary.summary,
        sentiment: summary.sentiment,
        key_points: summary.key_points,
      })
      .eq('tenant_id', tenantId)
      .eq('twilio_call_sid', callSid)

    if (callLogError) {
      logger.warn('Failed to update call_logs with transcription (may not exist)', {
        error: callLogError,
        callSid,
      })
    } else {
      logger.info('Call log updated with Whisper transcription', { callSid })
    }

    logger.info('Whisper transcription complete', {
      activityId,
      textLength: transcription.text.length,
      sentiment: summary.sentiment,
    })
  } catch (error) {
    logger.error('Whisper transcription failed', {
      error,
      activityId,
      recordingUrl,
    })
    throw error
  }
}

/**
 * POST /api/voice/recording
 * Twilio webhook for recording status callbacks
 *
 * Twilio will call this endpoint when call recording is complete
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    logger.info('Received recording webhook from Twilio')

    // Get form data from Twilio
    const formData = await request.formData()
    const recordingSid = formData.get('RecordingSid') as string
    const callSid = formData.get('CallSid') as string
    const recordingUrl = formData.get('RecordingUrl') as string
    const recordingStatus = formData.get('RecordingStatus') as string
    const recordingDuration = formData.get('RecordingDuration') as string

    logger.info('Recording status update', {
      recordingSid,
      callSid,
      status: recordingStatus,
      duration: recordingDuration ? parseInt(recordingDuration) : null,
      url: recordingUrl,
    })

    // Verify Twilio webhook signature
    const params = parseTwilioFormData(formData)
    const verification = await verifyTwilioSignature(request, params)

    if (!verification.valid) {
      logger.error('Invalid Twilio signature', { error: verification.error })
      return new NextResponse('Unauthorized', { status: 403 })
    }

    logger.info('Twilio signature verified successfully')

    const supabase = await createAdminClient()

    // Find the activity for this call
    const { data: activity } = await supabase
      .from('activities')
      .select('id, tenant_id')
      .eq('type', 'call')
      .eq('external_id', callSid)
      .limit(1)
      .single()

    if (!activity) {
      logger.warn('Call activity not found for recording webhook', { callSid })
      return new NextResponse('OK', { status: 200 })
    }

    // Update activity with recording information
    const { error: updateError } = await supabase
      .from('activities')
      .update({
        recording_url: recordingUrl ? `${recordingUrl}.mp3` : null,
        duration_seconds: recordingDuration ? parseInt(recordingDuration) : null,
      })
      .eq('id', activity.id)

    if (updateError) {
      logger.error('Failed to update activity with recording info', {
        error: updateError,
        activityId: activity.id,
      })
    } else {
      logger.info('Activity updated with recording info', {
        activityId: activity.id,
        recordingSid,
        duration: recordingDuration ? parseInt(recordingDuration) : null,
      })
    }

    // Trigger Whisper transcription in background (fire-and-forget)
    // This runs async and updates the database when complete
    if (recordingStatus === 'completed' && recordingUrl) {
      triggerWhisperTranscription(activity.id, recordingUrl, activity.tenant_id, callSid)
        .catch(err => logger.error('Background transcription failed', { error: err, activityId: activity.id }))
    }

    const duration = Date.now() - startTime
    logger.info('Recording webhook processed', { duration })

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Recording webhook error', { error, duration })

    // Still return 200 to Twilio to avoid retries
    return new NextResponse('Error processing webhook', { status: 200 })
  }
}

/**
 * GET /api/voice/recording
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Recording webhook endpoint is active',
  })
}

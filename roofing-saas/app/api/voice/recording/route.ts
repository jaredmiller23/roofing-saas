import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { verifyTwilioSignature, parseTwilioFormData } from '@/lib/webhooks/security'

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

    const supabase = await createClient()

    // Find the activity for this call
    const { data: activity } = await supabase
      .from('activities')
      .select('id, tenant_id, metadata')
      .eq('type', 'call')
      .eq('metadata->>call_sid', callSid)
      .limit(1)
      .single()

    if (!activity) {
      logger.warn('Call activity not found for recording webhook', { callSid })
      return new NextResponse('OK', { status: 200 })
    }

    // Update activity with recording information
    const updatedMetadata = {
      ...(activity.metadata as Record<string, unknown> || {}),
      recording_sid: recordingSid,
      recording_url: recordingUrl ? `${recordingUrl}.mp3` : null,
      recording_status: recordingStatus,
      recording_duration: recordingDuration ? parseInt(recordingDuration) : null,
      recording_received_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('activities')
      .update({ metadata: updatedMetadata })
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

    // TODO: Optionally download and store recording in Supabase Storage
    // TODO: Optionally trigger transcription service

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

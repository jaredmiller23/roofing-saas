import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { verifyTwilioSignature, parseTwilioFormData } from '@/lib/webhooks/security'

/**
 * POST /api/voice/transcribe
 * Twilio webhook for native transcription callbacks
 *
 * Twilio calls this endpoint when a voicemail transcription is complete.
 * This provides a fast (but lower quality) transcription.
 * The Whisper transcription triggered by the recording webhook will
 * replace this with a higher quality version later.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    logger.info('Received transcription webhook from Twilio')

    // Get form data from Twilio
    const formData = await request.formData()
    const transcriptionSid = formData.get('TranscriptionSid') as string
    const transcriptionText = formData.get('TranscriptionText') as string
    const transcriptionStatus = formData.get('TranscriptionStatus') as string
    const recordingSid = formData.get('RecordingSid') as string
    const callSid = formData.get('CallSid') as string

    logger.info('Twilio transcription received', {
      transcriptionSid,
      status: transcriptionStatus,
      callSid,
      recordingSid,
      textLength: transcriptionText?.length || 0,
    })

    // Skip if transcription failed
    if (transcriptionStatus !== 'completed') {
      logger.warn('Transcription not completed', { status: transcriptionStatus })
      return new NextResponse('OK', { status: 200 })
    }

    // Verify Twilio webhook signature
    const params = parseTwilioFormData(formData)
    const verification = await verifyTwilioSignature(request, params)

    if (!verification.valid) {
      logger.error('Invalid Twilio signature', { error: verification.error })
      return new NextResponse('Unauthorized', { status: 403 })
    }

    logger.info('Twilio signature verified successfully')

    const supabase = await createAdminClient()

    // Try to find voicemail message by call_sid
    const { data: voicemail } = await supabase
      .from('voicemail_messages')
      .select('id, tenant_id, transcription_provider')
      .eq('call_sid', callSid)
      .limit(1)
      .single()

    if (voicemail) {
      // Only update if we don't already have a Whisper transcription
      if (voicemail.transcription_provider !== 'openai_whisper') {
        const { error: updateError } = await supabase
          .from('voicemail_messages')
          .update({
            transcription: transcriptionText,
            transcription_confidence: 0.80, // Twilio native is ~80% accurate
            transcription_provider: 'twilio',
          })
          .eq('id', voicemail.id)

        if (updateError) {
          logger.error('Failed to update voicemail with Twilio transcription', {
            error: updateError,
            voicemailId: voicemail.id,
          })
        } else {
          logger.info('Voicemail updated with Twilio transcription', {
            voicemailId: voicemail.id,
          })
        }
      } else {
        logger.info('Skipping Twilio transcription - Whisper transcription already present', {
          voicemailId: voicemail.id,
        })
      }
    } else {
      logger.warn('Voicemail not found for transcription webhook', { callSid })
    }

    // Also try to update call_logs if it exists
    const { data: callLog } = await supabase
      .from('call_logs')
      .select('id, transcription_provider')
      .eq('twilio_call_sid', callSid)
      .limit(1)
      .single()

    if (callLog && callLog.transcription_provider !== 'openai_whisper') {
      const { error: callLogError } = await supabase
        .from('call_logs')
        .update({
          transcription: transcriptionText,
          transcription_confidence: 0.80,
          transcription_provider: 'twilio',
        })
        .eq('id', callLog.id)

      if (callLogError) {
        logger.error('Failed to update call_log with Twilio transcription', {
          error: callLogError,
          callLogId: callLog.id,
        })
      } else {
        logger.info('Call log updated with Twilio transcription', {
          callLogId: callLog.id,
        })
      }
    }

    const duration = Date.now() - startTime
    logger.info('Transcription webhook processed', { duration })

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Transcription webhook error', { error, duration })

    // Still return 200 to Twilio to avoid retries
    return new NextResponse('Error processing webhook', { status: 200 })
  }
}

/**
 * GET /api/voice/transcribe
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Transcription webhook endpoint is active',
  })
}

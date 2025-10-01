import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  mapZodError,
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { makeCall, formatPhoneNumber, isValidPhoneNumber } from '@/lib/twilio/voice'
import { z } from 'zod'

const makeCallSchema = z.object({
  to: z.string().min(10, 'Phone number must be at least 10 digits'),
  contactId: z.string().uuid().optional(),
  record: z.boolean().optional().default(true),
  message: z.string().optional(),
})

/**
 * POST /api/voice/call
 * Initiate an outbound call
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

    logger.apiRequest('POST', '/api/voice/call', { tenantId, userId: user.id })

    const body = await request.json()

    // Validate input
    const validatedData = makeCallSchema.safeParse(body)
    if (!validatedData.success) {
      throw mapZodError(validatedData.error)
    }

    const { to, contactId, record, message } = validatedData.data

    // Format and validate phone number
    const formattedPhone = formatPhoneNumber(to)
    if (!isValidPhoneNumber(formattedPhone)) {
      throw ValidationError('Invalid phone number format', { to })
    }

    const supabase = await createClient()

    // Build callback URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const statusCallback = `${baseUrl}/api/voice/webhook`
    const recordingCallback = record ? `${baseUrl}/api/voice/recording` : undefined

    // Initiate call
    const callResponse = await makeCall({
      to: formattedPhone,
      record,
      statusCallback,
      recordingStatusCallback: recordingCallback,
      url: message
        ? `${baseUrl}/api/voice/twiml?message=${encodeURIComponent(message)}`
        : undefined,
    })

    // Log activity
    const { error: activityError } = await supabase.from('activities').insert({
      tenant_id: tenantId,
      contact_id: contactId || null,
      user_id: user.id,
      type: 'call',
      direction: 'outbound',
      content: message || 'Outbound call',
      metadata: {
        call_sid: callResponse.sid,
        to: callResponse.to,
        from: callResponse.from,
        status: callResponse.status,
        record: record,
      },
    })

    if (activityError) {
      logger.error('Failed to log call activity', { error: activityError })
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/voice/call', 200, duration)

    return successResponse({
      message: 'Call initiated successfully',
      call: {
        sid: callResponse.sid,
        to: callResponse.to,
        status: callResponse.status,
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Call initiation error', { error, duration })
    return errorResponse(error as Error)
  }
}

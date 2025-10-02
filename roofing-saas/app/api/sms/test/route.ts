import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { sendSMS } from '@/lib/twilio/sms'
import { z } from 'zod'

/**
 * TEST ENDPOINT - NO AUTHENTICATION
 * POST /api/sms/test
 *
 * Simple SMS test endpoint without authentication or compliance checks
 * Use this for testing during development
 *
 * IMPORTANT: Remove or disable this endpoint in production!
 */

const testSMSSchema = z.object({
  to: z.string().min(10, 'Phone number must be at least 10 digits'),
  body: z.string().min(1, 'Message body is required').max(1600, 'SMS body too long'),
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return errorResponse(new Error('Test endpoint disabled in production'))
    }

    logger.apiRequest('POST', '/api/sms/test', { environment: 'development' })

    const body = await request.json()

    // Validate input
    const validatedData = testSMSSchema.safeParse(body)
    if (!validatedData.success) {
      const errors = validatedData.error.issues.map(e => e.message).join(', ')
      throw new Error(errors)
    }

    const { to, body: messageBody } = validatedData.data

    // Send SMS directly via Twilio (no compliance checks)
    logger.info('Sending test SMS', { to, bodyLength: messageBody.length })

    const smsResponse = await sendSMS({
      to,
      body: messageBody,
    })

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/sms/test', 200, duration)
    logger.info('Test SMS sent successfully', {
      sid: smsResponse.sid,
      to: smsResponse.to,
      status: smsResponse.status
    })

    return successResponse({
      message: 'Test SMS sent successfully',
      sms: {
        sid: smsResponse.sid,
        to: smsResponse.to,
        from: smsResponse.from,
        status: smsResponse.status,
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Test SMS send error', { error, duration })
    return errorResponse(error as Error)
  }
}

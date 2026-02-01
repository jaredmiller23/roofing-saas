import { getCurrentUser } from '@/lib/auth/session'
import { AuthenticationError, ValidationError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { sendSMS } from '@/lib/twilio/sms'
import { z } from 'zod'

const testSmsSchema = z.object({
  to: z.string().min(10, 'Phone number must be at least 10 digits'),
})

/**
 * POST /api/admin/communications/test-sms
 * Send a test SMS message (development mode only)
 */
export async function POST(request: Request) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      throw ValidationError('Test endpoints are only available in development mode')
    }

    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const body = await request.json()
    const { to } = testSmsSchema.parse(body)

    const result = await sendSMS({
      to,
      body: `Test message from Job Clarity admin panel. Sent by ${user.email} at ${new Date().toISOString()}.`,
    })

    return successResponse({
      message: 'Test SMS sent successfully',
      sid: result.sid,
    })
  } catch (error) {
    return errorResponse(error as Error)
  }
}

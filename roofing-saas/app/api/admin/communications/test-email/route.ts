import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { ValidationError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { sendEmail, isValidEmail } from '@/lib/resend/email'
import { z } from 'zod'

const testEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
})

/**
 * POST /api/admin/communications/test-email
 * Send a test email message (development mode only)
 */
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      throw ValidationError('Test endpoints are only available in development mode')
    }

    const body = await request.json()
    const { to } = testEmailSchema.parse(body)

    if (!isValidEmail(to)) {
      throw ValidationError('Invalid email address')
    }

    const result = await sendEmail({
      to,
      subject: 'Test Email from Job Clarity',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">Test Email</h1>
          <p>This is a test email from the Job Clarity admin panel.</p>
          <p><strong>Sent by:</strong> ${user.email}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #666; font-size: 12px;">
            This email was sent from the development environment.
          </p>
        </div>
      `,
      text: `Test Email from Job Clarity\n\nThis is a test email from the admin panel.\nSent by: ${user.email}\nTime: ${new Date().toISOString()}`,
    })

    return successResponse({
      message: 'Test email sent successfully',
      id: result.id,
    })
  } catch (error) {
    return errorResponse(error as Error)
  }
})

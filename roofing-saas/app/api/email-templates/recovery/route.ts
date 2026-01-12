import { NextResponse } from 'next/server'

/**
 * Email template for password recovery
 *
 * GoTrue fetches this template via HTTP and uses it for password reset emails.
 * The {{ .SiteURL }} and {{ .TokenHash }} are Go template variables that GoTrue
 * replaces with actual values when sending the email.
 *
 * This approach bypasses PKCE by using token_hash + verifyOtp instead of code exchange,
 * enabling cross-device password reset (click reset link on any device, not just
 * the one that initiated the request).
 */
export async function GET() {
  const template = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #FF8243; margin-bottom: 20px;">Reset Your Password</h2>
  <p>We received a request to reset your password. Click the button below to set a new password:</p>
  <p style="margin: 30px 0;">
    <a href="{{ .SiteURL }}/en/auth/confirm?token_hash={{ .TokenHash }}&type=recovery"
       style="display: inline-block; background-color: #FF8243; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
      Reset Password
    </a>
  </p>
  <p style="color: #666; font-size: 14px;">This link expires in 1 hour.</p>
  <p style="color: #666; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #999; font-size: 12px;">Roofing SaaS - CRM for Roofing Contractors</p>
</body>
</html>`

  return new NextResponse(template, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  })
}

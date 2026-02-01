import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { AuthenticationError, AuthorizationError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { getComplianceStats } from '@/lib/twilio/compliance'

/**
 * GET /api/admin/communications/status
 * Returns communications configuration status, activity stats, and compliance overview
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    const supabase = await createClient()

    // Check Twilio configuration
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER
    const twilioConfigured = !!(twilioAccountSid && twilioAuthToken && twilioPhoneNumber)

    // Check Resend configuration
    const resendApiKey = process.env.RESEND_API_KEY
    const resendConfigured = !!resendApiKey

    // Get activity counts (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Calls
    const { count: totalCalls } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('type', 'call')
      .gte('created_at', thirtyDaysAgo.toISOString())

    const { count: inboundCalls } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('type', 'call')
      .eq('direction', 'inbound')
      .gte('created_at', thirtyDaysAgo.toISOString())

    const { count: outboundCalls } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('type', 'call')
      .eq('direction', 'outbound')
      .gte('created_at', thirtyDaysAgo.toISOString())

    // SMS
    const { count: totalSms } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('type', 'sms')
      .gte('created_at', thirtyDaysAgo.toISOString())

    const { count: inboundSms } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('type', 'sms')
      .eq('direction', 'inbound')
      .gte('created_at', thirtyDaysAgo.toISOString())

    const { count: outboundSms } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('type', 'sms')
      .eq('direction', 'outbound')
      .gte('created_at', thirtyDaysAgo.toISOString())

    // Emails
    const { count: totalEmails } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('type', 'email')
      .gte('created_at', thirtyDaysAgo.toISOString())

    const { count: sentEmails } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('type', 'email')
      .eq('direction', 'outbound')
      .gte('created_at', thirtyDaysAgo.toISOString())

    // Get compliance stats
    const complianceStats = await getComplianceStats(tenantId)

    // Get invalid email count
    const { count: invalidEmails } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('email_invalid', true)
      .eq('is_deleted', false)

    return successResponse({
      config: {
        twilio: {
          configured: twilioConfigured,
          accountSid: twilioConfigured ? twilioAccountSid?.slice(0, 8) + '...' : undefined,
          phoneNumber: twilioConfigured ? twilioPhoneNumber : undefined,
        },
        resend: {
          configured: resendConfigured,
        },
      },
      activities: {
        calls: {
          total: totalCalls || 0,
          inbound: inboundCalls || 0,
          outbound: outboundCalls || 0,
        },
        sms: {
          total: totalSms || 0,
          inbound: inboundSms || 0,
          outbound: outboundSms || 0,
        },
        emails: {
          total: totalEmails || 0,
          sent: sentEmails || 0,
        },
      },
      compliance: {
        ...complianceStats,
        invalidEmails: invalidEmails || 0,
      },
    })
  } catch (error) {
    return errorResponse(error as Error)
  }
}

'use client'

/**
 * Communications Admin Dashboard
 *
 * Admin page showing communications configuration and status:
 * - Twilio/Resend configuration status
 * - Recent activities by type (email, sms, call)
 * - Compliance stats (opt-outs, bounces, invalid emails)
 * - Test buttons for dev mode
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  MessageSquare,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Send,
  Loader2,
  ShieldCheck,
  UserX,
  Users,
  Activity,
} from 'lucide-react'
import { toast } from 'sonner'

interface ConfigStatus {
  twilio: {
    configured: boolean
    accountSid?: string
    phoneNumber?: string
  }
  resend: {
    configured: boolean
  }
}

interface ActivityStats {
  calls: { total: number; inbound: number; outbound: number }
  sms: { total: number; inbound: number; outbound: number }
  emails: { total: number; sent: number }
}

interface ComplianceStats {
  totalContacts: number
  optedIn: number
  optedOut: number
  noConsent: number
  invalidEmails: number
}

export default function CommunicationsAdminPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<ConfigStatus | null>(null)
  const [activities, setActivities] = useState<ActivityStats | null>(null)
  const [compliance, setCompliance] = useState<ComplianceStats | null>(null)

  // Test message state
  const [testPhone, setTestPhone] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [sendingSms, setSendingSms] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  const isDev = process.env.NODE_ENV === 'development'

  // Fetch all data
  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/communications/status')
      if (!response.ok) {
        throw new Error('Failed to fetch communications status')
      }
      const data = await response.json()

      setConfig(data.config)
      setActivities(data.activities)
      setCompliance(data.compliance)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Send test SMS
  const handleTestSms = async () => {
    if (!testPhone.trim()) {
      toast.error('Please enter a phone number')
      return
    }

    setSendingSms(true)
    try {
      const response = await fetch('/api/admin/communications/test-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testPhone }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || 'Failed to send test SMS')
      }

      toast.success('Test SMS sent successfully')
      setTestPhone('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send test SMS')
    } finally {
      setSendingSms(false)
    }
  }

  // Send test email
  const handleTestEmail = async () => {
    if (!testEmail.trim()) {
      toast.error('Please enter an email address')
      return
    }

    setSendingEmail(true)
    try {
      const response = await fetch('/api/admin/communications/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || 'Failed to send test email')
      }

      toast.success('Test email sent successfully')
      setTestEmail('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send test email')
    } finally {
      setSendingEmail(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            Communications
          </h1>
          <p className="text-muted-foreground">
            Configuration status, activity metrics, and compliance overview
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Configuration Status */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Twilio Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Twilio (SMS & Voice)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              {config?.twilio.configured ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Connected
                  </Badge>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    Not Configured
                  </Badge>
                </>
              )}
            </div>
            {config?.twilio.configured && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Account: {config.twilio.accountSid}</p>
                <p>Phone: {config.twilio.phoneNumber}</p>
              </div>
            )}
            {!config?.twilio.configured && (
              <p className="text-sm text-muted-foreground">
                Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env.local
              </p>
            )}
          </CardContent>
        </Card>

        {/* Resend Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Resend (Email)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              {config?.resend.configured ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Connected
                  </Badge>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    Not Configured
                  </Badge>
                </>
              )}
            </div>
            {!config?.resend.configured && (
              <p className="text-sm text-muted-foreground">
                Set RESEND_API_KEY in .env.local
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Stats (Last 30 Days) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity (Last 30 Days)
          </CardTitle>
          <CardDescription>
            Communication activity breakdown by type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Calls */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="h-4 w-4 text-primary" />
                <span className="font-medium">Calls</span>
              </div>
              <p className="text-2xl font-bold">{activities?.calls.total ?? 0}</p>
              <p className="text-sm text-muted-foreground">
                {activities?.calls.inbound ?? 0} in / {activities?.calls.outbound ?? 0} out
              </p>
            </div>

            {/* SMS */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="font-medium">SMS</span>
              </div>
              <p className="text-2xl font-bold">{activities?.sms.total ?? 0}</p>
              <p className="text-sm text-muted-foreground">
                {activities?.sms.inbound ?? 0} in / {activities?.sms.outbound ?? 0} out
              </p>
            </div>

            {/* Emails */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4 text-primary" />
                <span className="font-medium">Emails</span>
              </div>
              <p className="text-2xl font-bold">{activities?.emails.total ?? 0}</p>
              <p className="text-sm text-muted-foreground">
                {activities?.emails.sent ?? 0} sent
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Compliance Overview
          </CardTitle>
          <CardDescription>
            Contact consent status and compliance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {/* Total Contacts */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4" />
                <span className="font-medium">Total Contacts</span>
              </div>
              <p className="text-2xl font-bold">{compliance?.totalContacts ?? 0}</p>
            </div>

            {/* Opted In */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">Opted In</span>
              </div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                {compliance?.optedIn ?? 0}
              </p>
              <p className="text-sm text-green-600">
                {compliance?.totalContacts ? Math.round((compliance.optedIn / compliance.totalContacts) * 100) : 0}%
              </p>
            </div>

            {/* Opted Out */}
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <UserX className="h-4 w-4 text-red-600" />
                <span className="font-medium">Opted Out</span>
              </div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                {compliance?.optedOut ?? 0}
              </p>
              <p className="text-sm text-red-600">
                {compliance?.totalContacts ? Math.round((compliance.optedOut / compliance.totalContacts) * 100) : 0}%
              </p>
            </div>

            {/* No Consent */}
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="font-medium">No Consent</span>
              </div>
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                {compliance?.noConsent ?? 0}
              </p>
              <p className="text-sm text-yellow-600">
                {compliance?.totalContacts ? Math.round((compliance.noConsent / compliance.totalContacts) * 100) : 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Communications (Dev Mode Only) */}
      {isDev && (
        <Card className="border-dashed border-yellow-400">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <Send className="h-5 w-5" />
              Test Communications
              <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800 border-yellow-300">
                Dev Only
              </Badge>
            </CardTitle>
            <CardDescription>
              Send test messages to verify configuration (development mode only)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Test SMS */}
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label htmlFor="test-phone">Test SMS</Label>
                <Input
                  id="test-phone"
                  type="tel"
                  placeholder="+1 (423) 555-1234"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  disabled={!config?.twilio.configured}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleTestSms}
                disabled={!config?.twilio.configured || sendingSms}
              >
                {sendingSms ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Test
              </Button>
            </div>

            {/* Test Email */}
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label htmlFor="test-email">Test Email</Label>
                <Input
                  id="test-email"
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  disabled={!config?.resend.configured}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleTestEmail}
                disabled={!config?.resend.configured || sendingEmail}
              >
                {sendingEmail ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Test
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

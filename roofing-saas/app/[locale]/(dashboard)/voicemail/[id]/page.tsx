import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Voicemail, Phone, Clock, ArrowLeft, User, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { AudioPlayer } from '@/components/call-logs/audio-player'
import { CallTranscription } from '@/components/call-logs/call-transcription'
import { Button } from '@/components/ui/button'

/**
 * Voicemail detail page
 * Shows voicemail with audio player and transcription
 */
export default async function VoicemailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const tenantId = await getUserTenantId(user.id)
  if (!tenantId) {
    redirect('/dashboard')
  }

  const { id } = await params
  const supabase = await createClient()

  const { data: voicemail, error } = await supabase
    .from('voicemail_messages')
    .select(`
      *,
      contacts:contact_id (
        id,
        first_name,
        last_name,
        phone,
        email
      )
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !voicemail) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Voicemail Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The voicemail you are trying to view does not exist or you don&apos;t have access.
            </p>
            <Link href="/voicemail">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Voicemails
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Mark as reviewed if still pending
  if (voicemail.status === 'pending') {
    await supabase
      .from('voicemail_messages')
      .update({ status: 'reviewed' })
      .eq('id', id)
  }

  // Supabase join returns single object for many-to-one, but TypeScript infers array
  const contact = voicemail.contacts as unknown as {
    id: string
    first_name: string
    last_name: string
    phone: string
    email: string
  } | null

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getUrgencyBadge = (urgency: string | null) => {
    switch (urgency) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>
      case 'high':
        return <Badge className="bg-orange-500 hover:bg-orange-600">High</Badge>
      case 'normal':
        return <Badge variant="secondary">Normal</Badge>
      case 'low':
        return <Badge variant="outline">Low</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/voicemail"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Voicemails
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Voicemail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Voicemail from {contact ? `${contact.first_name} ${contact.last_name}`.trim() : voicemail.from_phone || 'Unknown'}
                </h1>
                <p className="text-muted-foreground">
                  {voicemail.created_at ? new Date(voicemail.created_at).toLocaleString() : 'Unknown date'}
                </p>
              </div>
            </div>
            {getUrgencyBadge(voicemail.urgency)}
          </div>
        </div>

        {/* Caller Info Card */}
        <div className="bg-card rounded-lg border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            Caller Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Phone Number
              </label>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{voicemail.from_phone || 'Unknown'}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Duration
              </label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{formatDuration(voicemail.duration_seconds)}</span>
              </div>
            </div>
            {contact && (
              <>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Contact
                  </label>
                  <Link
                    href={`/contacts/${contact.id}`}
                    className="text-primary hover:underline"
                  >
                    {contact.first_name} {contact.last_name}
                  </Link>
                </div>
                {contact.email && (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Email
                    </label>
                    <span className="text-foreground">{contact.email}</span>
                  </div>
                )}
              </>
            )}
            {voicemail.detected_intent && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Detected Intent
                </label>
                <span className="text-foreground">{voicemail.detected_intent}</span>
              </div>
            )}
          </div>
        </div>

        {/* Audio Player */}
        {voicemail.recording_url && (
          <div className="bg-card rounded-lg border border-border p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Voicemail className="h-5 w-5 text-muted-foreground" />
              Recording
            </h2>
            <AudioPlayer
              recordingUrl={voicemail.recording_url}
              duration={voicemail.duration_seconds}
            />
          </div>
        )}

        {/* Transcription - Reusing CallTranscription component */}
        <div className="mb-6">
          <CallTranscription
            transcription={voicemail.transcription}
            summary={voicemail.summary}
            sentiment={voicemail.sentiment as 'positive' | 'neutral' | 'negative' | null}
            keyPoints={null}
            confidence={voicemail.transcription_confidence}
            provider={voicemail.transcription_provider}
            isProcessing={!!voicemail.recording_url && !voicemail.transcription}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <Link href="/voicemail">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Voicemails
            </Button>
          </Link>

          {contact && (
            <div className="flex gap-3">
              <Link href={`/contacts/${contact.id}`}>
                <Button variant="outline">View Contact</Button>
              </Link>
              <Link href={`/voice/call?phone=${encodeURIComponent(voicemail.from_phone || '')}`}>
                <Button>
                  <Phone className="h-4 w-4 mr-2" />
                  Call Back
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

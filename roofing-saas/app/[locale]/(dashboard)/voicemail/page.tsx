import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Link } from '@/lib/i18n/navigation'
import { Voicemail, Phone, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

/**
 * Voicemail list page
 * Shows all voicemails with transcription status and urgency
 */
export default async function VoicemailPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const tenantId = await getUserTenantId(user.id)
  if (!tenantId) {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  const { data: voicemails, error } = await supabase
    .from('voicemail_messages')
    .select(`
      id,
      from_phone,
      duration_seconds,
      transcription,
      summary,
      urgency,
      status,
      created_at,
      contact_id,
      contacts:contact_id (
        first_name,
        last_name
      )
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching voicemails:', error)
  }

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
        return null
    }
  }

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'reviewed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return null
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Voicemail className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Voicemails</h1>
              <p className="text-muted-foreground">
                {voicemails?.length || 0} voicemail{voicemails?.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {!voicemails || voicemails.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <Voicemail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No voicemails yet</h3>
            <p className="text-muted-foreground">
              Voicemails from missed calls will appear here with transcriptions.
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">From</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Summary</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Duration</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Urgency</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {voicemails.map((vm) => {
                    // Supabase join returns single object for many-to-one, but TypeScript infers array
                    const contact = vm.contacts as unknown as { first_name: string; last_name: string } | null
                    const displayName = contact
                      ? `${contact.first_name} ${contact.last_name}`.trim()
                      : vm.from_phone || 'Unknown'

                    return (
                      <tr
                        key={vm.id}
                        className="border-b border-border hover:bg-muted/20 transition-colors"
                      >
                        <td className="p-4">
                          {getStatusIcon(vm.status)}
                        </td>
                        <td className="p-4">
                          <Link
                            href={`/voicemail/${vm.id}`}
                            className="text-foreground hover:text-primary font-medium"
                          >
                            {displayName}
                          </Link>
                          {contact && vm.from_phone && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <Phone className="h-3 w-3" />
                              {vm.from_phone}
                            </p>
                          )}
                        </td>
                        <td className="p-4 max-w-md">
                          {vm.summary ? (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {vm.summary}
                            </p>
                          ) : vm.transcription ? (
                            <p className="text-sm text-muted-foreground line-clamp-2 italic">
                              {vm.transcription.substring(0, 100)}...
                            </p>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">
                              Transcription pending...
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {formatDuration(vm.duration_seconds)}
                          </div>
                        </td>
                        <td className="p-4">
                          {getUrgencyBadge(vm.urgency)}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">
                          {vm.created_at ? new Date(vm.created_at).toLocaleDateString() : 'N/A'}
                          <br />
                          <span className="text-xs">
                            {vm.created_at ? new Date(vm.created_at).toLocaleTimeString() : ''}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

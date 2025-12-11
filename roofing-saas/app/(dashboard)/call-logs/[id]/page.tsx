import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Phone, PhoneIncoming, PhoneOutgoing, Clock, FileText, Mic } from 'lucide-react'
import { AudioPlayer } from '@/components/call-logs/audio-player'

/**
 * View call log details page
 */
export default async function CallLogDetailPage({
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

  const { data: call, error } = await supabase
    .from('call_logs')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)
    .single()

  if (error || !call) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Call Log Not Found</h2>
            <p className="text-red-700 mb-4">The call log you are trying to view does not exist.</p>
            <Link href="/call-logs" className="text-red-600 hover:text-red-900 underline">
              Back to Call Logs
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Call Log Details</h1>
              <p className="text-gray-600 mt-1">
                {call.started_at ? new Date(call.started_at).toLocaleString() : 'Not started'}
              </p>
            </div>
            <Link
              href={`/call-logs/${call.id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Edit
            </Link>
          </div>
        </div>

        {/* Call Details Card */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Phone className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-foreground">Call Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Direction</label>
              <div className="flex items-center gap-2">
                {call.direction === 'inbound' ? (
                  <PhoneIncoming className="h-5 w-5 text-blue-600" />
                ) : (
                  <PhoneOutgoing className="h-5 w-5 text-green-600" />
                )}
                <span className="text-foreground capitalize">{call.direction}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Phone Number</label>
              <p className="text-foreground">{call.phone_number}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Duration</label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-foreground">{formatDuration(call.duration)}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Outcome</label>
              <p className="text-foreground capitalize">{call.outcome || 'N/A'}</p>
            </div>

            {call.disposition && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Disposition</label>
                <p className="text-foreground">{call.disposition}</p>
              </div>
            )}
          </div>
        </div>

        {/* Call Recording Card */}
        {call.recording_url && (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Mic className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-foreground">Call Recording</h2>
            </div>
            <AudioPlayer
              recordingUrl={call.recording_url}
              duration={call.recording_duration}
            />
          </div>
        )}

        {/* Notes Card */}
        {call.notes && (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-foreground">Notes</h2>
            </div>
            <p className="text-foreground whitespace-pre-wrap">{call.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <Link
            href="/call-logs"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-background"
          >
            Back to Call Logs
          </Link>
        </div>
      </div>
    </div>
  )
}

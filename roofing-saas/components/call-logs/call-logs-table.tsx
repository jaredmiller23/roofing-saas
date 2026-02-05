'use client'

import { useEffect, useState } from 'react'
import { Link, useRouter } from '@/lib/i18n/navigation'
import { Phone, PhoneIncoming, PhoneOutgoing, ExternalLink, Mic } from 'lucide-react'
import { apiFetch, apiFetchPaginated } from '@/lib/api/client'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface CallLog {
  id: string
  direction: string
  phone_number: string
  duration: number | null
  outcome: string | null
  disposition: string | null
  started_at: string | null
  notes: string | null
  recording_url: string | null
  created_at: string
}

interface CallLogsTableProps {
  params: { [key: string]: string | string[] | undefined }
}

export function CallLogsTable({ params }: CallLogsTableProps) {
  const router = useRouter()
  const [calls, setCalls] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(parseInt((params.page as string) || '1'))

  useEffect(() => {
    async function fetchCalls() {
      setLoading(true)
      setError(null)

      try {
        const queryParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value && typeof value === 'string') {
            queryParams.set(key, value)
          }
        })

        const { data: callsList, pagination } = await apiFetchPaginated<CallLog[]>(
          `/api/call-logs?${queryParams.toString()}`
        )
        setCalls(callsList)
        setTotal(pagination.total)
        setPage(pagination.page)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchCalls()
  }, [params])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this call log?')) {
      return
    }

    try {
      await apiFetch<void>(`/api/call-logs/${id}`, { method: 'DELETE' })
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete call log')
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (calls.length === 0) {
    return (
      <div className="text-center py-12">
        <Phone className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-medium text-foreground">No call logs</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Get started by logging a call.
        </p>
        <div className="mt-6">
          <Link
            href="/call-logs/new"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90"
          >
            + Log Call
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card shadow-sm rounded-lg border border-border">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/30">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Call
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Outcome
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Recording
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {calls.map((call) => (
              <tr key={call.id} className="hover:bg-accent">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                      {call.direction === 'inbound' ? (
                        <PhoneIncoming className="h-5 w-5 text-primary" />
                      ) : (
                        <PhoneOutgoing className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-foreground capitalize">{call.direction}</div>
                      <div className="text-sm text-muted-foreground">
                        {call.started_at ? new Date(call.started_at).toLocaleString() : 'Not started'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {call.phone_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {formatDuration(call.duration)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {call.outcome || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {call.recording_url ? (
                    <span title="Recording available">
                      <Mic className="h-4 w-4 text-primary inline" />
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    href={`/call-logs/${call.id}`}
                    className="text-primary hover:text-primary/80 mr-4"
                  >
                    <ExternalLink className="h-4 w-4 inline" />
                  </Link>
                  <button
                    onClick={() => handleDelete(call.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 10 && (
        <div className="bg-card px-4 py-3 flex items-center justify-between border-t border-border sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => router.push(`/call-logs?page=${page - 1}`)}
              disabled={page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-muted-foreground bg-card hover:bg-accent disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => router.push(`/call-logs?page=${page + 1}`)}
              disabled={page * 10 >= total}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-muted-foreground bg-card hover:bg-accent disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{(page - 1) * 10 + 1}</span> to{' '}
                <span className="font-medium">{Math.min(page * 10, total)}</span> of{' '}
                <span className="font-medium">{total}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => router.push(`/call-logs?page=${page - 1}`)}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => router.push(`/call-logs?page=${page + 1}`)}
                  disabled={page * 10 >= total}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

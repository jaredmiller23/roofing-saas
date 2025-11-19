'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Phone, PhoneIncoming, PhoneOutgoing, ExternalLink, Mic } from 'lucide-react'

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

        const response = await fetch(`/api/call-logs?${queryParams.toString()}`)

        if (!response.ok) {
          throw new Error('Failed to fetch call logs')
        }

        const result = await response.json()
        const data = result.data || result
        setCalls(data.calls || data)
        setTotal(data.total || 0)
        setPage(data.page || 1)
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
      const response = await fetch(`/api/call-logs/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete call log')
      }

      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete call log')
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    )
  }

  if (calls.length === 0) {
    return (
      <div className="text-center py-12">
        <Phone className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No call logs</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by logging a call.
        </p>
        <div className="mt-6">
          <Link
            href="/call-logs/new"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            + Log Call
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Call
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Outcome
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Recording
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {calls.map((call) => (
              <tr key={call.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      {call.direction === 'inbound' ? (
                        <PhoneIncoming className="h-5 w-5 text-blue-600" />
                      ) : (
                        <PhoneOutgoing className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 capitalize">{call.direction}</div>
                      <div className="text-sm text-gray-500">
                        {call.started_at ? new Date(call.started_at).toLocaleString() : 'Not started'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {call.phone_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDuration(call.duration)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {call.outcome || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {call.recording_url ? (
                    <span title="Recording available">
                      <Mic className="h-4 w-4 text-blue-600 inline" />
                    </span>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    href={`/call-logs/${call.id}`}
                    className="text-blue-600 hover:text-blue-900 mr-4"
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
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => router.push(`/call-logs?page=${page - 1}`)}
              disabled={page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => router.push(`/call-logs?page=${page + 1}`)}
              disabled={page * 10 >= total}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
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
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => router.push(`/call-logs?page=${page + 1}`)}
                  disabled={page * 10 >= total}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
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

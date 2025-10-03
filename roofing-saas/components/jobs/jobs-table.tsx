'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Briefcase, Calendar, ExternalLink } from 'lucide-react'

interface Job {
  id: string
  job_number: string
  job_type: string
  status: string
  scheduled_date: string | null
  scheduled_start_time: string | null
  completion_percentage: number
  total_cost: number | null
  scope_of_work: string | null
  created_at: string
}

interface JobsTableProps {
  params: { [key: string]: string | string[] | undefined }
}

export function JobsTable({ params }: JobsTableProps) {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(parseInt((params.page as string) || '1'))

  useEffect(() => {
    async function fetchJobs() {
      setLoading(true)
      setError(null)

      try {
        const queryParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value && typeof value === 'string') {
            queryParams.set(key, value)
          }
        })

        const response = await fetch(`/api/jobs?${queryParams.toString()}`)

        if (!response.ok) {
          throw new Error('Failed to fetch jobs')
        }

        const result = await response.json()
        const data = result.data || result
        setJobs(data.jobs || data)
        setTotal(data.total || 0)
        setPage(data.page || 1)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [params])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job?')) {
      return
    }

    try {
      const response = await fetch(`/api/jobs/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete job')
      }

      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete job')
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      scheduled: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      on_hold: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'
  }

  const getJobTypeBadge = (type: string) => {
    const badges = {
      roof_replacement: 'bg-purple-100 text-purple-800',
      roof_repair: 'bg-blue-100 text-blue-800',
      inspection: 'bg-gray-100 text-gray-800',
      maintenance: 'bg-green-100 text-green-800',
      emergency: 'bg-red-100 text-red-800',
      other: 'bg-gray-100 text-gray-800',
    }
    return badges[type as keyof typeof badges] || 'bg-gray-100 text-gray-800'
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
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

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by scheduling a job.
        </p>
        <div className="mt-6">
          <Link
            href="/jobs/new"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            + Schedule Job
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
                Job
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Scheduled
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{job.job_number}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {job.scope_of_work || 'No scope defined'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getJobTypeBadge(job.job_type)}`}>
                    {job.job_type?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : 'Not scheduled'}
                  </div>
                  {job.scheduled_start_time && (
                    <div className="text-sm text-gray-500">
                      {job.scheduled_start_time}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(job.status)}`}>
                    {job.status?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${job.completion_percentage}%` }}
                      ></div>
                    </div>
                    {job.completion_percentage}%
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(job.total_cost)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    <ExternalLink className="h-4 w-4 inline" />
                  </Link>
                  <button
                    onClick={() => handleDelete(job.id)}
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
              onClick={() => router.push(`/jobs?page=${page - 1}`)}
              disabled={page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => router.push(`/jobs?page=${page + 1}`)}
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
                  onClick={() => router.push(`/jobs?page=${page - 1}`)}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => router.push(`/jobs?page=${page + 1}`)}
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

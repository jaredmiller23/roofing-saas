'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Briefcase, Calendar, ExternalLink } from 'lucide-react'
import { apiFetch, apiFetchPaginated } from '@/lib/api/client'
import { Alert, AlertDescription } from '@/components/ui/alert'

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

        const { data: jobsList, pagination } = await apiFetchPaginated<Job[]>(
          `/api/jobs?${queryParams.toString()}`
        )
        setJobs(jobsList)
        setTotal(pagination.total)
        setPage(pagination.page)
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
      await apiFetch<void>(`/api/jobs/${id}`, { method: 'DELETE' })

      // Remove deleted job from local state immediately (optimistic update)
      setJobs(prev => prev.filter(job => job.id !== id))
      setTotal(prev => prev - 1)
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete job')
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      scheduled: 'bg-blue-500/10 text-blue-500',
      in_progress: 'bg-yellow-500/10 text-yellow-500',
      on_hold: 'bg-orange-500/10 text-orange-500',
      completed: 'bg-green-500/10 text-green-500',
      cancelled: 'bg-red-500/10 text-red-500',
    }
    return badges[status as keyof typeof badges] || 'bg-muted text-muted-foreground'
  }

  const getJobTypeBadge = (type: string) => {
    const badges = {
      roof_replacement: 'bg-purple-500/10 text-purple-500',
      roof_repair: 'bg-blue-500/10 text-blue-500',
      inspection: 'bg-muted text-muted-foreground',
      maintenance: 'bg-green-500/10 text-green-500',
      emergency: 'bg-red-500/10 text-red-500',
      other: 'bg-muted text-muted-foreground',
    }
    return badges[type as keyof typeof badges] || 'bg-muted text-muted-foreground'
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatTime = (time: string | null) => {
    if (!time) return null
    // Convert "14:30:00" to "2:30 PM"
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
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

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-medium text-foreground">No jobs</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Get started by scheduling a job.
        </p>
        <div className="mt-6">
          <Link
            href="/jobs/new"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90"
          >
            + Schedule Job
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
                Job
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Scheduled
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Cost
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-accent">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-foreground">{job.job_number}</div>
                      <div className="text-sm text-muted-foreground truncate max-w-xs">
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
                  <div className="flex items-center text-sm text-foreground">
                    <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                    {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : 'Not scheduled'}
                  </div>
                  {job.scheduled_start_time && (
                    <div className="text-sm text-muted-foreground">
                      {formatTime(job.scheduled_start_time)}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(job.status)}`}>
                    {job.status?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <div className="w-16 bg-muted rounded-full h-2 mr-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${job.completion_percentage}%` }}
                      ></div>
                    </div>
                    {job.completion_percentage}%
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {formatCurrency(job.total_cost)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="text-primary hover:text-primary/80 mr-4"
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
        <div className="bg-card px-4 py-3 flex items-center justify-between border-t border-border sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => router.push(`/jobs?page=${page - 1}`)}
              disabled={page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-muted-foreground bg-card hover:bg-accent disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => router.push(`/jobs?page=${page + 1}`)}
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
                  onClick={() => router.push(`/jobs?page=${page - 1}`)}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => router.push(`/jobs?page=${page + 1}`)}
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

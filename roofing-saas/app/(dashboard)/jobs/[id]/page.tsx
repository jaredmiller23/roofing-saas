import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Briefcase, Calendar, DollarSign, FileText } from 'lucide-react'

/**
 * View job details page
 */
export default async function JobDetailPage({
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

  const { data: job, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)
    .single()

  if (error || !job) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Job Not Found</h2>
            <p className="text-red-700 mb-4">The job you are trying to view does not exist.</p>
            <Link href="/jobs" className="text-red-600 hover:text-red-900 underline">
              Back to Jobs
            </Link>
          </div>
        </div>
      </div>
    )
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

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Job Details</h1>
              <p className="text-gray-600 mt-1">
                Job #{job.job_number}
              </p>
            </div>
            <Link
              href={`/jobs/${job.id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Edit
            </Link>
          </div>
        </div>

        {/* Job Information Card */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Briefcase className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Job Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Job Number</label>
              <p className="text-gray-900">{job.job_number}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Job Type</label>
              <p className="text-gray-900 capitalize">{job.job_type?.replace('_', ' ')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(job.status)}`}>
                {job.status?.replace('_', ' ')}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Completion</label>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${job.completion_percentage}%` }}
                  ></div>
                </div>
                <span className="text-gray-900">{job.completion_percentage}%</span>
              </div>
            </div>

            {job.scope_of_work && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">Scope of Work</label>
                <p className="text-gray-900 whitespace-pre-wrap">{job.scope_of_work}</p>
              </div>
            )}
          </div>
        </div>

        {/* Schedule Card */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Schedule</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Scheduled Date</label>
              <p className="text-gray-900">
                {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : 'Not scheduled'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Time</label>
              <p className="text-gray-900">
                {job.scheduled_start_time && job.scheduled_end_time
                  ? `${job.scheduled_start_time} - ${job.scheduled_end_time}`
                  : 'Not set'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Estimated Duration</label>
              <p className="text-gray-900">
                {job.estimated_duration_hours ? `${job.estimated_duration_hours} hours` : 'N/A'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Actual Duration</label>
              <p className="text-gray-900">
                {job.actual_duration_hours ? `${job.actual_duration_hours} hours` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Cost Tracking Card */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <DollarSign className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Cost Tracking</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Labor Cost</label>
              <p className="text-gray-900">{formatCurrency(job.labor_cost)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Material Cost</label>
              <p className="text-gray-900">{formatCurrency(job.material_cost)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Equipment Cost</label>
              <p className="text-gray-900">{formatCurrency(job.equipment_cost)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Other Costs</label>
              <p className="text-gray-900">{formatCurrency(job.other_costs)}</p>
            </div>

            <div className="md:col-span-2 pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-500 mb-1">Total Cost</label>
              <p className="text-xl font-semibold text-gray-900">{formatCurrency(job.total_cost)}</p>
            </div>
          </div>
        </div>

        {/* Notes Card */}
        {(job.notes || job.internal_notes) && (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
            </div>

            {job.notes && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-500 mb-1">Notes</label>
                <p className="text-gray-900 whitespace-pre-wrap">{job.notes}</p>
              </div>
            )}

            {job.internal_notes && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Internal Notes</label>
                <p className="text-gray-900 whitespace-pre-wrap">{job.internal_notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <Link
            href="/jobs"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Back to Jobs
          </Link>
        </div>
      </div>
    </div>
  )
}

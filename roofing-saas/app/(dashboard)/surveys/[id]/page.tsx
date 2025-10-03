import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { MessageSquare, Star, CheckCircle, AlertCircle } from 'lucide-react'

/**
 * View survey details page
 */
export default async function SurveyDetailPage({
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

  const { data: survey, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)
    .single()

  if (error || !survey) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Survey Not Found</h2>
            <p className="text-red-700 mb-4">The survey you are trying to view does not exist.</p>
            <Link href="/surveys" className="text-red-600 hover:text-red-900 underline">
              Back to Surveys
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const getDeliveryStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    }
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'
  }

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-gray-400">Not rated</span>
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-5 w-5 ${
              i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-lg font-semibold text-gray-900">{rating}/5</span>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Survey Details</h1>
              <p className="text-gray-600 mt-1 capitalize">
                {survey.survey_type?.replace('_', ' ')} via {survey.delivery_method}
              </p>
            </div>
            <Link
              href={`/surveys/${survey.id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Edit
            </Link>
          </div>
        </div>

        {/* Survey Information Card */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Survey Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Survey Type</label>
              <p className="text-gray-900 capitalize">{survey.survey_type?.replace('_', ' ')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Delivery Method</label>
              <p className="text-gray-900 capitalize">{survey.delivery_method}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Delivery Status</label>
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getDeliveryStatusBadge(survey.delivery_status)}`}>
                {survey.delivery_status}
              </span>
            </div>

            {survey.sent_at && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Sent At</label>
                <p className="text-gray-900">{new Date(survey.sent_at).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>

        {/* Response Card */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Star className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Customer Response</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Rating</label>
              {renderStars(survey.rating)}
            </div>

            {survey.feedback && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Feedback</label>
                <p className="text-gray-900 whitespace-pre-wrap">{survey.feedback}</p>
              </div>
            )}

            {survey.completed_at && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Completed At</label>
                <p className="text-gray-900">{new Date(survey.completed_at).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>

        {/* Review Gating Card */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Review Gating</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Review Threshold</label>
              <p className="text-gray-900">{survey.review_threshold || 4} stars</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Review Requested</label>
              <p className="text-gray-900">{survey.review_requested ? 'Yes' : 'No'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Review Posted</label>
              <p className="text-gray-900">{survey.review_posted ? 'Yes' : 'No'}</p>
            </div>

            {survey.review_platform && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Platform</label>
                <p className="text-gray-900 capitalize">{survey.review_platform}</p>
              </div>
            )}
          </div>
        </div>

        {/* Negative Feedback Card */}
        {survey.is_negative_feedback && (
          <div className="bg-red-50 shadow-sm rounded-lg border border-red-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <h2 className="text-lg font-semibold text-red-900">Negative Feedback</h2>
            </div>

            <div className="space-y-4">
              {survey.manager_response && (
                <div>
                  <label className="block text-sm font-medium text-red-700 mb-1">Manager Response</label>
                  <p className="text-red-900 whitespace-pre-wrap">{survey.manager_response}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-red-700 mb-1">Issue Resolved</label>
                <p className="text-red-900">{survey.issue_resolved ? 'Yes' : 'No'}</p>
              </div>

              {survey.resolution_notes && (
                <div>
                  <label className="block text-sm font-medium text-red-700 mb-1">Resolution Notes</label>
                  <p className="text-red-900 whitespace-pre-wrap">{survey.resolution_notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <Link
            href="/surveys"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Back to Surveys
          </Link>
        </div>
      </div>
    </div>
  )
}

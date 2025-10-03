'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Star } from 'lucide-react'

interface SurveyFormProps {
  survey?: {
    id: string
    survey_type: string
    delivery_method: string
    rating: number | null
    feedback: string | null
    delivery_status: string
    review_threshold: number
    review_requested: boolean
    review_posted: boolean
    review_platform: string | null
    is_negative_feedback: boolean
    manager_response: string | null
    issue_resolved: boolean
    resolution_notes: string | null
  }
}

export function SurveyForm({ survey }: SurveyFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    survey_type: survey?.survey_type || 'post_job',
    delivery_method: survey?.delivery_method || 'sms',
    rating: survey?.rating?.toString() || '',
    feedback: survey?.feedback || '',
    delivery_status: survey?.delivery_status || 'pending',
    review_threshold: survey?.review_threshold?.toString() || '4',
    review_requested: survey?.review_requested || false,
    review_posted: survey?.review_posted || false,
    review_platform: survey?.review_platform || '',
    is_negative_feedback: survey?.is_negative_feedback || false,
    manager_response: survey?.manager_response || '',
    issue_resolved: survey?.issue_resolved || false,
    resolution_notes: survey?.resolution_notes || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = survey
        ? `/api/surveys/${survey.id}`
        : '/api/surveys'
      const method = survey ? 'PATCH' : 'POST'

      const payload = {
        ...formData,
        rating: formData.rating ? parseInt(formData.rating) : null,
        review_threshold: parseInt(formData.review_threshold),
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to save survey')
      }

      router.push('/surveys')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Survey Details */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Survey Details</h2>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Survey Type
              </label>
              <select
                value={formData.survey_type}
                onChange={(e) => setFormData({ ...formData, survey_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="post_job">Post Job</option>
                <option value="mid_project">Mid Project</option>
                <option value="follow_up">Follow Up</option>
                <option value="general">General</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Method
              </label>
              <select
                value={formData.delivery_method}
                onChange={(e) => setFormData({ ...formData, delivery_method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="qr_code">QR Code</option>
                <option value="link">Link</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Status
            </label>
            <select
              value={formData.delivery_status}
              onChange={(e) => setFormData({ ...formData, delivery_status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Response */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Star className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Response</h2>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rating (1-5)
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Rating"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Review Threshold
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={formData.review_threshold}
                onChange={(e) => setFormData({ ...formData, review_threshold: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="4"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ratings at or above this prompt for public review
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Feedback
            </label>
            <textarea
              value={formData.feedback}
              onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Customer feedback..."
            />
          </div>
        </div>
      </div>

      {/* Review Gating */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Review Gating</h2>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.review_requested}
              onChange={(e) => setFormData({ ...formData, review_requested: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              Review Requested
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.review_posted}
              onChange={(e) => setFormData({ ...formData, review_posted: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              Review Posted
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Review Platform
            </label>
            <input
              type="text"
              value={formData.review_platform}
              onChange={(e) => setFormData({ ...formData, review_platform: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="google, facebook, yelp, etc."
            />
          </div>
        </div>
      </div>

      {/* Negative Feedback Handling */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Negative Feedback Handling</h2>

        <div className="space-y-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_negative_feedback}
              onChange={(e) => setFormData({ ...formData, is_negative_feedback: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              Mark as Negative Feedback
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Manager Response
            </label>
            <textarea
              value={formData.manager_response}
              onChange={(e) => setFormData({ ...formData, manager_response: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Manager's response to negative feedback..."
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.issue_resolved}
              onChange={(e) => setFormData({ ...formData, issue_resolved: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              Issue Resolved
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resolution Notes
            </label>
            <textarea
              value={formData.resolution_notes}
              onChange={(e) => setFormData({ ...formData, resolution_notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="How the issue was resolved..."
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : survey ? 'Update Survey' : 'Send Survey'}
        </button>
      </div>
    </form>
  )
}

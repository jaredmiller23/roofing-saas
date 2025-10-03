'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageSquare, Star, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'

interface Survey {
  id: string
  survey_type: string
  delivery_method: string
  rating: number | null
  delivery_status: string
  completed_at: string | null
  review_requested: boolean
  review_posted: boolean
  is_negative_feedback: boolean
  feedback: string | null
  created_at: string
}

interface SurveysTableProps {
  params: { [key: string]: string | string[] | undefined }
}

export function SurveysTable({ params }: SurveysTableProps) {
  const router = useRouter()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(parseInt((params.page as string) || '1'))

  useEffect(() => {
    async function fetchSurveys() {
      setLoading(true)
      setError(null)

      try {
        const queryParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value && typeof value === 'string') {
            queryParams.set(key, value)
          }
        })

        const response = await fetch(`/api/surveys?${queryParams.toString()}`)

        if (!response.ok) {
          throw new Error('Failed to fetch surveys')
        }

        const result = await response.json()
        const data = result.data || result
        setSurveys(data.surveys || data)
        setTotal(data.total || 0)
        setPage(data.page || 1)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchSurveys()
  }, [params])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this survey?')) {
      return
    }

    try {
      const response = await fetch(`/api/surveys/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete survey')
      }

      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete survey')
    }
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
            className={`h-4 w-4 ${
              i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-gray-600">{rating}/5</span>
      </div>
    )
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

  if (surveys.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No surveys</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by sending a survey.
        </p>
        <div className="mt-6">
          <Link
            href="/surveys/new"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            + Send Survey
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
                Survey
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rating
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Review
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Completed
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {surveys.map((survey) => (
              <tr key={survey.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 capitalize">
                        {survey.survey_type?.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-gray-500">
                        via {survey.delivery_method}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {renderStars(survey.rating)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getDeliveryStatusBadge(survey.delivery_status)}`}>
                    {survey.delivery_status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {survey.review_posted ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      <span className="text-sm">Posted</span>
                    </div>
                  ) : survey.review_requested ? (
                    <div className="flex items-center text-blue-600">
                      <Star className="h-4 w-4 mr-1" />
                      <span className="text-sm">Requested</span>
                    </div>
                  ) : survey.is_negative_feedback ? (
                    <div className="flex items-center text-red-600">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      <span className="text-sm">Negative</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {survey.completed_at
                    ? new Date(survey.completed_at).toLocaleDateString()
                    : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    href={`/surveys/${survey.id}`}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    <ExternalLink className="h-4 w-4 inline" />
                  </Link>
                  <button
                    onClick={() => handleDelete(survey.id)}
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
              onClick={() => router.push(`/surveys?page=${page - 1}`)}
              disabled={page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => router.push(`/surveys?page=${page + 1}`)}
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
                  onClick={() => router.push(`/surveys?page=${page - 1}`)}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => router.push(`/surveys?page=${page + 1}`)}
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

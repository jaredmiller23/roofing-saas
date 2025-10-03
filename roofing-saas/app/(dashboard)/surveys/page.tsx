import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SurveysTable } from '@/components/surveys/surveys-table'

/**
 * Surveys list page
 *
 * Features:
 * - Customer satisfaction surveys
 * - Review gating (4-5 stars → Google, 1-3 → internal)
 * - SMS/email/QR code delivery
 * - Negative feedback alerts
 */
export default async function SurveysPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const params = await searchParams

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Surveys</h1>
            <p className="text-gray-600 mt-1">
              Customer feedback and review management
            </p>
          </div>

          <Link
            href="/surveys/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Send Survey
          </Link>
        </div>

        {/* Table */}
        <div className="mt-6">
          <SurveysTable params={params} />
        </div>
      </div>
    </div>
  )
}

import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { OrganizationsTable } from '@/components/organizations/organizations-table'

/**
 * Organizations list page
 *
 * Features:
 * - List all business clients (real estate, developers, property managers, local businesses)
 * - Search organizations by name
 * - Filter by organization type and stage
 * - View organization details and linked projects
 */
export default async function OrganizationsPage({
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
            <h1 className="text-3xl font-bold text-gray-900">Organizations</h1>
            <p className="text-gray-600 mt-1">
              Manage business clients and referral sources
            </p>
          </div>

          <Link
            href="/organizations/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Add Organization
          </Link>
        </div>

        {/* Table */}
        <div className="mt-6">
          <OrganizationsTable params={params} />
        </div>
      </div>
    </div>
  )
}

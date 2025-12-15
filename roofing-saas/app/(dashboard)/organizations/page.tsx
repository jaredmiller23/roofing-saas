import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { OrganizationsWithFilters } from '@/components/organizations/organizations-with-filters'

/**
 * Organizations list page
 *
 * Features:
 * - Configurable filters via FilterBar
 * - Search organizations by name, type, industry
 * - Filter by organization type
 * - Pagination
 * - Quick actions (view, edit, delete)
 */
export default async function OrganizationsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Organizations</h1>
            <p className="text-muted-foreground mt-1">
              Manage your companies, agencies, and contractors
            </p>
          </div>

          <Link
            href="/organizations/new"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium"
          >
            + Add Organization
          </Link>
        </div>

        {/* Configurable Filters + Search + Table */}
        <OrganizationsWithFilters />
      </div>
    </div>
  )
}
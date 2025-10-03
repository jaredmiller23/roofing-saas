import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Building2 } from 'lucide-react'

/**
 * Organization detail page
 */
export default async function OrganizationDetailPage({
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

  const { data: organization, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)
    .single()

  if (error || !organization) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Organization Not Found</h2>
            <p className="text-red-700 mb-4">The organization you are looking for does not exist.</p>
            <Link href="/organizations" className="text-red-600 hover:text-red-900 underline">
              Back to Organizations
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const getOrgTypeLabel = (type: string | null) => {
    const labels: Record<string, string> = {
      real_estate: 'Real Estate',
      developer: 'Developer',
      property_manager: 'Property Manager',
      local_business: 'Local Business',
      other: 'Other',
    }
    return type ? labels[type] || type : '-'
  }

  const getStageLabel = (stage: string | null) => {
    const labels: Record<string, string> = {
      new: 'New',
      active: 'Active',
      inactive: 'Inactive',
    }
    return stage ? labels[stage] || stage : '-'
  }

  const getStageBadgeColor = (stage: string | null) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
    }
    return stage ? colors[stage] || 'bg-gray-100 text-gray-800' : 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {organization.name}
              </h1>
              <div className="flex gap-2 mt-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                  {getOrgTypeLabel(organization.org_type)}
                </span>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStageBadgeColor(organization.stage)}`}>
                  {getStageLabel(organization.stage)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/organizations/${organization.id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Edit
            </Link>
            <Link
              href="/organizations"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Back
            </Link>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Email</label>
              <p className="mt-1 text-gray-900">{organization.email || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Phone</label>
              <p className="mt-1 text-gray-900">{organization.phone || '-'}</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-500">Website</label>
              {organization.website ? (
                <a
                  href={organization.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 text-blue-600 hover:text-blue-800 underline"
                >
                  {organization.website}
                </a>
              ) : (
                <p className="mt-1 text-gray-900">-</p>
              )}
            </div>
          </div>
        </div>

        {/* Address */}
        {(organization.address_street || organization.address_city) && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Address</h2>
            <div className="text-gray-900">
              {organization.address_street && <p>{organization.address_street}</p>}
              {(organization.address_city || organization.address_state || organization.address_zip) && (
                <p>
                  {organization.address_city}
                  {organization.address_state && `, ${organization.address_state}`}
                  {organization.address_zip && ` ${organization.address_zip}`}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {organization.notes && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
            <p className="text-gray-900 whitespace-pre-wrap">{organization.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

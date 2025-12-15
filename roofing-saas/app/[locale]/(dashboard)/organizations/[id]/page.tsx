import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'

interface OrganizationDetailPageProps {
  params: { id: string }
}

export default async function OrganizationDetailPage({ params }: OrganizationDetailPageProps) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const tenantId = await getUserTenantId(user.id)
  if (!tenantId) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Fetch organization
  const { data: organization, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)
    .single()

  if (error || !organization) {
    notFound()
  }

  // Fetch related contacts count
  const { count: contactCount } = await supabase
    .from('contacts')
    .select('id', { count: 'exact' })
    .eq('organization_id', params.id)
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/organizations"
              className="text-muted-foreground hover:text-foreground"
            >
              ← Back to Organizations
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{organization.name}</h1>
              <p className="text-muted-foreground mt-1">
                Organization Details
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/organizations/${params.id}/edit`}
              className="px-4 py-2 border border-input text-muted-foreground rounded-lg hover:bg-accent"
            >
              Edit
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">{contactCount || 0}</div>
            <div className="text-sm text-muted-foreground">Related Contacts</div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">0</div>
            <div className="text-sm text-muted-foreground">Active Projects</div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">
              {organization.type.charAt(0).toUpperCase() + organization.type.slice(1)}
            </div>
            <div className="text-sm text-muted-foreground">Organization Type</div>
          </div>
        </div>

        {/* Organization Details */}
        <div className="bg-card border rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Organization Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Name
              </label>
              <p className="text-foreground">{organization.name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Type
              </label>
              <p className="text-foreground">
                {organization.type.charAt(0).toUpperCase() + organization.type.slice(1)}
              </p>
            </div>

            {organization.website && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Website
                </label>
                <a
                  href={organization.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {organization.website}
                </a>
              </div>
            )}

            {organization.phone && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Phone
                </label>
                <p className="text-foreground">{organization.phone}</p>
              </div>
            )}

            {organization.email && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Email
                </label>
                <p className="text-foreground">{organization.email}</p>
              </div>
            )}

            {organization.industry && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Industry
                </label>
                <p className="text-foreground">{organization.industry}</p>
              </div>
            )}
          </div>

          {/* Address */}
          {(organization.address_street || organization.address_city || organization.address_state || organization.address_zip) && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Address
              </label>
              <div className="text-foreground">
                {organization.address_street && <p>{organization.address_street}</p>}
                {(organization.address_city || organization.address_state || organization.address_zip) && (
                  <p>
                    {organization.address_city && organization.address_city}
                    {organization.address_city && organization.address_state && ', '}
                    {organization.address_state && organization.address_state}
                    {organization.address_zip && ` ${organization.address_zip}`}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {organization.description && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Description
              </label>
              <p className="text-foreground">{organization.description}</p>
            </div>
          )}
        </div>

        {/* Related Contacts */}
        <div className="bg-card border rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Related Contacts ({contactCount || 0})</h2>
            <Link
              href={`/contacts?organization=${params.id}`}
              className="text-primary hover:underline text-sm"
            >
              View All →
            </Link>
          </div>

          {(contactCount || 0) > 0 ? (
            <p className="text-muted-foreground">
              This organization has {contactCount} related contact{contactCount === 1 ? '' : 's'}.
            </p>
          ) : (
            <p className="text-muted-foreground">
              No contacts are currently associated with this organization.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
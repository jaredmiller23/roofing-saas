import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { OrganizationForm } from '@/components/organizations/organization-form'

/**
 * Create new organization page
 */
export default async function NewOrganizationPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/organizations"
            className="text-muted-foreground hover:text-foreground"
          >
            ← Back to Organizations
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Create Organization</h1>
            <p className="text-muted-foreground mt-1">
              Add a new company, agency, or contractor
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-card border rounded-lg p-6">
          <OrganizationForm mode="create" />
        </div>
      </div>
    </div>
  )
}
import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">New Organization</h1>
        <OrganizationForm />
      </div>
    </div>
  )
}

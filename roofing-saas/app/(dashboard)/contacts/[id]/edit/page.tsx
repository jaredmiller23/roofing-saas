import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ContactForm } from '@/components/contacts/contact-form'
import Link from 'next/link'

/**
 * Edit contact page
 */
export default async function EditContactPage({
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

  const { data: contact, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)
    .single()

  if (error || !contact) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Contact Not Found</h2>
            <p className="text-red-700 mb-4">The contact you are trying to edit does not exist.</p>
            <Link href="/contacts" className="text-red-600 hover:text-red-900 underline">
              Back to Contacts
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Edit Contact</h1>
          <p className="text-gray-600 mt-1">
            Update contact information for {contact.first_name} {contact.last_name}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <ContactForm contact={contact} mode="edit" />
        </div>
      </div>
    </div>
  )
}

import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ContactForm } from '@/components/contacts/contact-form'
import type { Contact } from '@/lib/types/contact'
import { Link } from '@/lib/i18n/navigation'

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
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-red-400 mb-2">Contact Not Found</h2>
            <p className="text-red-300 mb-4">The contact you are trying to edit does not exist.</p>
            <Link href="/contacts" className="text-red-400 hover:text-red-300 underline">
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
          <p className="text-muted-foreground mt-1">
            Update contact information for {contact.first_name} {contact.last_name}
          </p>
        </div>

        <div className="bg-card rounded-lg shadow p-6">
          <ContactForm contact={contact as unknown as Contact} mode="edit" />
        </div>
      </div>
    </div>
  )
}

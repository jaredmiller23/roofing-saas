import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ContactDetailClient } from './ContactDetailClient'

/**
 * Contact detail page
 */
export default async function ContactDetailPage({
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
            <p className="text-red-700 mb-4">The contact you are looking for does not exist.</p>
            <Link href="/contacts" className="text-red-600 hover:text-red-900 underline">
              Back to Contacts
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ContactDetailClient
      contact={contact}
      tenantId={tenantId}
      user={{
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.user_metadata?.full_name,
        avatar: user.user_metadata?.avatar_url,
      }}
    />
  )
}

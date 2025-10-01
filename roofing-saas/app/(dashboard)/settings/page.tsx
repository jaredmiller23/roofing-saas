import { getCurrentUser } from '@/lib/auth/session'
import { getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { QuickBooksConnection } from '@/components/settings/quickbooks-connection'
import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const tenantId = await getUserTenantId(user.id)
  if (!tenantId) {
    redirect('/register')
  }

  // Get QuickBooks connection status
  const supabase = await createClient()
  const { data: qbConnection } = await supabase
    .from('quickbooks_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="max-w-2xl space-y-8">
        {/* QuickBooks Integration Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4">QuickBooks Integration</h2>
          <QuickBooksConnection connection={qbConnection} />
        </section>

        {/* Future settings sections */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Team Settings</h2>
          <p className="text-gray-600">Coming soon...</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
          <p className="text-gray-600">Coming soon...</p>
        </section>
      </div>
    </div>
  )
}

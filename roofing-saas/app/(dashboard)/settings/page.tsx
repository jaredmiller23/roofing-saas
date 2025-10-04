import { getCurrentUser } from '@/lib/auth/session'
import { getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { QuickBooksConnection } from '@/components/settings/quickbooks-connection'
import { TeamSettings } from '@/components/settings/team-settings'
import { NotificationSettings } from '@/components/settings/notification-settings'
import { createClient } from '@/lib/supabase/server'

interface TeamMemberData {
  user_id: string
  role: string
  joined_at: string
  user: {
    id: string
    email: string
    raw_user_meta_data?: {
      full_name?: string
    }
  }[]
}

export default async function SettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const tenantId = await getUserTenantId(user.id)
  if (!tenantId) {
    redirect('/register')
  }

  const supabase = await createClient()

  // Get QuickBooks connection status
  const { data: qbConnection } = await supabase
    .from('quickbooks_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  // Get team members
  const { data: teamMembers } = await supabase
    .from('tenant_users')
    .select(`
      user_id,
      role,
      joined_at,
      user:auth.users!inner (
        id,
        email,
        raw_user_meta_data
      )
    `)
    .eq('tenant_id', tenantId)
    .order('joined_at', { ascending: false })

  // Format team members data
  const formattedTeamMembers = (teamMembers || []).map((member: TeamMemberData) => ({
    id: member.user[0]?.id || '',
    email: member.user[0]?.email || '',
    full_name: member.user[0]?.raw_user_meta_data?.full_name || null,
    role: member.role,
    joined_at: member.joined_at,
  }))

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="max-w-3xl space-y-8">
        {/* QuickBooks Integration Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4">QuickBooks Integration</h2>
          <QuickBooksConnection connection={qbConnection} />
        </section>

        {/* Team Settings */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Team Settings</h2>
          <TeamSettings members={formattedTeamMembers} currentUserId={user.id} />
        </section>

        {/* Notification Preferences */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
          <NotificationSettings />
        </section>
      </div>
    </div>
  )
}

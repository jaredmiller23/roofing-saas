import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { InsightsPageClient } from './insights-client'

export default async function InsightsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const tenantId = await getUserTenantId(user.id)
  if (!tenantId) {
    redirect('/register')
  }

  // Get user metadata for role-based suggestions
  const userRole = user.user_metadata?.role || 'user'

  return (
    <InsightsPageClient
      userId={user.id}
      tenantId={tenantId}
      userRole={userRole}
    />
  )
}
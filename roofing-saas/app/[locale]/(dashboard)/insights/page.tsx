import { getCurrentUser, getUserTenantId, getUserRole } from '@/lib/auth/session'
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

  const userRole = await getUserRole(user.id) || 'user'

  return (
    <InsightsPageClient
      userRole={userRole}
    />
  )
}
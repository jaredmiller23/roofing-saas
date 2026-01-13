import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { ApprovalsPageClient } from './approvals-client'

export const metadata = {
  title: 'ARIA Approval Queue | Roofing SaaS',
  description: 'Review and approve AI-generated SMS responses',
}

export default async function ApprovalsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const tenantId = await getUserTenantId(user.id)
  if (!tenantId) {
    redirect('/register')
  }

  return <ApprovalsPageClient userId={user.id} tenantId={tenantId} />
}

import { getCurrentUser, getUserTenantId, isAdmin } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { KnowledgePageClient } from './knowledge-client'

export const metadata = {
  title: 'Knowledge Base | Roofing SaaS',
  description: 'Manage roofing knowledge entries for AI assistant',
}

export default async function KnowledgePage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const tenantId = await getUserTenantId(user.id)
  if (!tenantId) {
    redirect('/register')
  }

  // Verify admin access
  const userIsAdmin = await isAdmin(user.id)
  if (!userIsAdmin) {
    redirect('/dashboard')
  }

  return <KnowledgePageClient tenantId={tenantId} />
}

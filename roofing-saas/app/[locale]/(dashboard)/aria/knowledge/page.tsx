import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
  const supabase = await createClient()
  const { data: roleAssignment } = await supabase
    .from('user_role_assignments')
    .select('role_id, user_roles!inner(name)')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .in('user_roles.name', ['owner', 'admin'])
    .single()

  if (!roleAssignment) {
    redirect('/dashboard')
  }

  return <KnowledgePageClient tenantId={tenantId} />
}

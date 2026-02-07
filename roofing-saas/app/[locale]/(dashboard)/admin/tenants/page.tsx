import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { TenantList } from '@/components/admin/tenant-list'

export default async function AdminTenantsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return <TenantList />
}

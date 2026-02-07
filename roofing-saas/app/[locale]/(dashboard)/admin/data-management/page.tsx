import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { DataManagement } from '@/components/admin/data-management'

export default async function AdminDataManagementPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return <DataManagement />
}

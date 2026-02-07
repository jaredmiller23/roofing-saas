import { getCurrentUser, getUserRole } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { RoleManagement } from '@/components/settings/role-management'

export default async function RolesSettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Only admin and owner can manage roles
  const role = await getUserRole(user.id)
  if (role !== 'admin' && role !== 'owner') {
    redirect('/en/settings')
  }

  return <RoleManagement />
}

import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { TeamManagement } from '@/components/settings/team-management'

export default async function TeamSettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return <TeamManagement />
}

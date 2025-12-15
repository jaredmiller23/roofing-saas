import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { SettingsTabs } from '@/components/settings/SettingsTabs'

export default async function SettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return <SettingsTabs />
}

import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { MFASettings } from '@/components/settings/mfa-settings'

export default async function SecuritySettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return <MFASettings />
}

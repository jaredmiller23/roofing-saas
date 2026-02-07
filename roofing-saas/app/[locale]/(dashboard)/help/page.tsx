import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { HelpCenter } from '@/components/help/help-center'

export default async function HelpPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <HelpCenter />
      </div>
    </div>
  )
}

import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { DevDashboard } from '@/components/dev/DevDashboard'

/**
 * Development Dashboard Page
 *
 * Internal dashboard for Clarity's development team.
 * Displays:
 * - Task metrics (my tasks, team tasks, completed)
 * - Recent decisions from planning sessions
 * - Task queue with priority indicators
 *
 * Access: Requires authentication. In future, may be restricted to
 * admin/developer roles.
 */
export default async function DevDashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
      <div className="max-w-7xl mx-auto">
        <DevDashboard />
      </div>
    </div>
  )
}

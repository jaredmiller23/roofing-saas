import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

/**
 * Dashboard page - main landing page after authentication
 *
 * This is a placeholder that will be enhanced with:
 * - KPI widgets
 * - Pipeline overview
 * - Recent activities
 * - Quick actions
 */
export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back!
        </h1>
        <p className="text-gray-600 mb-8">
          Signed in as {user.email}
        </p>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
          <p className="text-gray-600">
            Your CRM dashboard will be built here in the next phase.
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Total Contacts</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">0</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Active Projects</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">0</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase">This Month Revenue</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">$0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

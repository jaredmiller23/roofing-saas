import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

/**
 * Dashboard layout - main application layout with navigation
 *
 * This layout wraps all authenticated pages and provides:
 * - Top navigation bar
 * - User menu
 * - Sign out functionality
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                Roofing CRM
              </Link>

              <div className="hidden md:ml-10 md:flex md:space-x-8 overflow-x-auto max-w-3xl scrollbar-thin">
                <Link
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium whitespace-nowrap"
                >
                  Dashboard
                </Link>
                <Link
                  href="/contacts"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium whitespace-nowrap"
                >
                  Contacts
                </Link>
                <Link
                  href="/pipeline"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium whitespace-nowrap"
                >
                  Pipeline
                </Link>
                <Link
                  href="/organizations"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium whitespace-nowrap"
                >
                  Organizations
                </Link>
                <Link
                  href="/tasks"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium whitespace-nowrap"
                >
                  Tasks
                </Link>
                <Link
                  href="/project-files"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium whitespace-nowrap"
                >
                  Files
                </Link>
                <Link
                  href="/call-logs"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium whitespace-nowrap"
                >
                  Call Logs
                </Link>
                <Link
                  href="/jobs"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium whitespace-nowrap"
                >
                  Jobs
                </Link>
                <Link
                  href="/events"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium whitespace-nowrap"
                >
                  Events
                </Link>
                <Link
                  href="/surveys"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium whitespace-nowrap"
                >
                  Surveys
                </Link>
                <Link
                  href="/projects"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium whitespace-nowrap"
                >
                  Projects
                </Link>
                <Link
                  href="/territories"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium whitespace-nowrap"
                >
                  Territories
                </Link>
                <Link
                  href="/settings"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium whitespace-nowrap"
                >
                  Settings
                </Link>
              </div>
            </div>

            <div className="flex items-center space-x-4 flex-shrink-0 ml-4">
              <span className="text-sm text-gray-600 whitespace-nowrap">{user.email}</span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  )
}

/**
 * Sign out server action
 */
async function signOut() {
  'use server'

  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

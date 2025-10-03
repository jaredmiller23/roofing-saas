import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DashboardNav } from '@/components/layout/DashboardNav'

/**
 * Dashboard layout - main application layout with navigation
 *
 * This layout wraps all authenticated pages and provides:
 * - Top navigation bar with responsive hamburger menu
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
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/dashboard" className="text-xl font-bold text-gray-900 flex-shrink-0">
              Roofing CRM
            </Link>

            {/* Navigation Links & User Menu */}
            <div className="flex items-center gap-4 min-w-0">
              <DashboardNav userEmail={user.email || ''} />
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

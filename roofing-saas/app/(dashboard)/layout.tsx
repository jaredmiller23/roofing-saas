import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'

/**
 * Dashboard layout - main application layout with sidebar navigation
 *
 * This layout wraps all authenticated pages and provides:
 * - Left sidebar navigation with dark theme
 * - Responsive mobile menu
 * - User profile and sign out
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
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar userEmail={user.email || ''} />

      {/* Main Content - with left padding for sidebar */}
      <main className="lg:ml-64 min-h-screen">
        {children}
      </main>
    </div>
  )
}

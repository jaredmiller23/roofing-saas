import { getCurrentUser, getUserRole } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { DashboardLayoutClient } from '@/components/layout/DashboardLayoutClient'
import { CommandPaletteProvider } from '@/components/command-palette/CommandPaletteProvider'

/**
 * Dashboard layout - main application layout with sidebar navigation
 *
 * This layout wraps all authenticated pages and provides:
 * - Left sidebar navigation with dark theme
 * - Responsive mobile menu
 * - User profile and sign out
 * - Admin impersonation UI (for admins only)
 * - Command palette (Cmd+K) for quick navigation
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

  // Get user role for admin-only features
  const userRole = await getUserRole(user.id)

  return (
    <CommandPaletteProvider>
      <div className="min-h-screen bg-background">
        {/* Sidebar */}
        <Sidebar userEmail={user.email || ''} userRole={userRole || 'user'} />

        {/* Main Content - with left padding for sidebar and bottom padding for AI assistant */}
        <main className="lg:ml-64 min-h-screen pb-20">
          <DashboardLayoutClient>
            {children}
          </DashboardLayoutClient>
        </main>
      </div>
    </CommandPaletteProvider>
  )
}

import { getCurrentUser, getUserRole } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { DashboardLayoutClient } from '@/components/layout/DashboardLayoutClient'
import { CommandPaletteProvider } from '@/components/command-palette/CommandPaletteProvider'
import { ARIAChatButton } from '@/components/aria/ARIAChatButton'

/**
 * Dashboard layout - main application layout with sidebar navigation
 *
 * This layout wraps all authenticated pages and provides:
 * - Left sidebar navigation with dark theme
 * - Responsive mobile menu
 * - User profile and sign out
 * - Admin impersonation UI (for admins only)
 * - Command palette (Cmd+K) for quick navigation
 * - Internationalization support
 */
export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  // Get user role for admin-only features
  const userRole = await getUserRole(user.id)

  return (
    <CommandPaletteProvider>
      <div className="min-h-screen bg-background">
        {/* Sidebar */}
        <Sidebar 
          userEmail={user.email || ''} 
          userRole={userRole || 'user'} 
        />

        {/* Main Content - with left padding for sidebar and bottom padding for AI assistant */}
        <main className="lg:ml-64 min-h-screen pb-20">
          <DashboardLayoutClient
            userRole={userRole || 'user'}
            userEmail={user.email || ''}
          >
            {children}
          </DashboardLayoutClient>
        </main>

        {/* ARIA Chat - floating button + slide-over panel */}
        <ARIAChatButton />
      </div>
    </CommandPaletteProvider>
  )
}

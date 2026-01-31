import { redirect } from 'next/navigation'
import { getCurrentUser, getUserContext } from '@/lib/auth/session'
import { Sidebar } from '@/components/layout/Sidebar'
import { DashboardLayoutClient } from '@/components/layout/DashboardLayoutClient'
import { CommandPaletteProvider } from '@/components/command-palette/CommandPaletteProvider'
import { ARIAChatButton } from '@/components/aria/ARIAChatButton'

/**
 * Dashboard layout - main application layout with sidebar navigation
 *
 * Uses getCurrentUser() for JWT validation + getUserContext() for role/tenant
 * in a single tenant_users query (2 total DB calls).
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

  // Single query for tenant context (replaces separate getUserRole call)
  const ctx = await getUserContext(user.id)
  const userRole = ctx?.role || 'user'
  const userEmail = user.email || ''

  return (
    <CommandPaletteProvider>
      <div className="min-h-screen bg-background">
        {/* Sidebar */}
        <Sidebar
          userEmail={userEmail}
          userRole={userRole}
        />

        {/* Main Content - with left padding for sidebar and bottom padding for AI assistant */}
        <main className="lg:ml-64 min-h-screen pb-20">
          <DashboardLayoutClient
            userRole={userRole}
            userEmail={userEmail}
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

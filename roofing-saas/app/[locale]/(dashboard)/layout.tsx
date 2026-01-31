import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { DashboardLayoutClient } from '@/components/layout/DashboardLayoutClient'
import { CommandPaletteProvider } from '@/components/command-palette/CommandPaletteProvider'
import { ARIAChatButton } from '@/components/aria/ARIAChatButton'

/**
 * Dashboard layout - main application layout with sidebar navigation
 *
 * Auth context is read from middleware-set headers to avoid redundant
 * JWT validation and tenant_users queries. The middleware has already
 * validated the session and looked up the tenant context.
 */
export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const headerStore = await headers()

  // Read auth context from middleware headers (no redundant DB calls)
  const userId = headerStore.get('x-user-id')
  const userEmail = headerStore.get('x-user-email') || ''
  const userRole = headerStore.get('x-user-role') || 'user'

  if (!userId) {
    redirect(`/${locale}/login`)
  }

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

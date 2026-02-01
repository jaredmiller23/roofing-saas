import { redirect } from 'next/navigation'
import { getCurrentUser, getUserContext } from '@/lib/auth/session'
import { getMFARedirectPath } from '@/lib/auth/mfa-enforcement'
import { Sidebar } from '@/components/layout/Sidebar'
import { DashboardLayoutClient } from '@/components/layout/DashboardLayoutClient'
import { CommandPaletteProvider } from '@/components/command-palette/CommandPaletteProvider'
import { ARIAChatButton } from '@/components/aria/ARIAChatButton'

/**
 * Dashboard layout - main application layout with sidebar navigation
 *
 * This is the real auth gate (server-side, cannot be bypassed):
 * 1. getCurrentUser() validates JWT with Supabase
 * 2. getUserContext() fetches role + tenant in one query
 * 3. MFA enforcement redirects privileged users without MFA
 *
 * The proxy.ts only handles optimistic redirects for UX.
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

  // Run getUserContext and MFA check in parallel for better performance
  // Both operations are cached, so subsequent calls within this request are instant
  const [ctx, mfaRedirect] = await Promise.all([
    getUserContext(user.id),
    getMFARedirectPath().catch(() => null) // MFA check failure should not block
  ])

  const userRole = ctx?.role || 'user'
  const userEmail = user.email || ''

  // MFA enforcement for privileged users (admin/owner)
  if (mfaRedirect) {
    redirect(`/${locale}${mfaRedirect}`)
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

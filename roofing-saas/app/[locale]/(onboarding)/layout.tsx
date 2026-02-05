import { redirect } from 'next/navigation'
import { getCurrentUser, getUserContext } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

/**
 * Onboarding layout - minimal chrome, auth-gated
 *
 * This sits between (auth) and (dashboard) route groups.
 * User is authenticated but hasn't completed onboarding yet.
 * No sidebar, no dashboard nav — just the wizard.
 */
export default async function OnboardingLayout({
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

  const ctx = await getUserContext(user.id)

  if (!ctx?.tenantId) {
    // No tenant yet — they might be mid-registration. Let them proceed.
    return <div className="min-h-screen bg-background">{children}</div>
  }

  // If onboarding already completed, go to dashboard
  const supabase = await createClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('onboarding_completed')
    .eq('id', ctx.tenantId)
    .single()

  if (tenant?.onboarding_completed) {
    redirect(`/${locale}/dashboard`)
  }

  return <div className="min-h-screen bg-background">{children}</div>
}

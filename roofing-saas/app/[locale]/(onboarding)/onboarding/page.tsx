import { redirect } from 'next/navigation'
import { getCurrentUser, getUserContext } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

/**
 * Onboarding page - renders the wizard with tenant data pre-filled
 */
export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const ctx = await getUserContext(user.id)

  if (!ctx?.tenantId) {
    // No tenant — something went wrong with registration
    redirect(`/${locale}/login?error=no-tenant`)
  }

  // Only owners see the onboarding wizard. Team members go to dashboard.
  if (ctx.role !== 'owner') {
    redirect(`/${locale}/dashboard`)
  }

  // Fetch tenant details for pre-filling
  const supabase = await createClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, phone, onboarding_completed')
    .eq('id', ctx.tenantId)
    .single()

  // Already completed — go to dashboard
  if (tenant?.onboarding_completed) {
    redirect(`/${locale}/dashboard`)
  }

  return (
    <OnboardingWizard
      tenantName={tenant?.name || ''}
      tenantPhone={tenant?.phone || ''}
    />
  )
}

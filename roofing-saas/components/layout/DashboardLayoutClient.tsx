'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { GlobalSearch } from '@/components/search/GlobalSearch'
import { ImpersonationBanner } from '@/components/impersonation'
import { TrialBannerWrapper } from '@/components/layout/TrialBannerWrapper'
import { UIModeProvider } from '@/lib/ui-mode/context'
import { UIPreferencesProvider } from '@/lib/ui-preferences/context'
import { AdaptiveLayout } from '@/components/layout/AdaptiveLayout'
import { ErrorBufferProvider } from '@/lib/aria/error-buffer'

interface DashboardLayoutClientProps {
  children: React.ReactNode
  userRole?: string
  userEmail?: string
  mfaRedirect?: string | null
  locale?: string
}

export function DashboardLayoutClient({ children, userRole, userEmail, mfaRedirect, locale }: DashboardLayoutClientProps) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (mfaRedirect && !pathname.includes('/settings')) {
      router.replace(`/${locale || 'en'}${mfaRedirect}`)
    }
  }, [mfaRedirect, pathname, locale, router])

  return (
    <ErrorBufferProvider>
      <UIModeProvider>
        <UIPreferencesProvider>
          <ImpersonationBanner />
          <TrialBannerWrapper />
          <AdaptiveLayout
            userEmail={userEmail || ''}
            userRole={userRole || 'user'}
          >
            {children}
          </AdaptiveLayout>
          <GlobalSearch />
        </UIPreferencesProvider>
      </UIModeProvider>
    </ErrorBufferProvider>
  )
}

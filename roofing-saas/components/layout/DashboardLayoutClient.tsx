'use client'

import Link from 'next/link'
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
  return (
    <ErrorBufferProvider>
      <UIModeProvider>
        <UIPreferencesProvider>
          <ImpersonationBanner />
          <TrialBannerWrapper />
          {mfaRedirect && (
            <div className="sticky top-0 z-40 bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-sm text-center">
              <span className="text-amber-200 font-medium">
                Two-factor authentication is required for {userRole} accounts.
              </span>
              {' '}
              <Link
                href={`/${locale || 'en'}${mfaRedirect}`}
                className="text-primary underline hover:text-primary/80 font-medium"
              >
                Set up MFA now
              </Link>
            </div>
          )}
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

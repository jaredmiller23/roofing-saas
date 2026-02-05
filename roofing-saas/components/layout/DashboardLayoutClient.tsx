'use client'

import { GlobalSearch } from '@/components/search/GlobalSearch'
import { AIAssistantProvider } from '@/lib/ai-assistant/context'
import { AIAssistantBar } from '@/components/ai-assistant/AIAssistantBar'
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
}

export function DashboardLayoutClient({ children, userRole, userEmail }: DashboardLayoutClientProps) {
  return (
    <ErrorBufferProvider>
      <UIModeProvider>
        <UIPreferencesProvider>
          <AIAssistantProvider>
            <ImpersonationBanner />
            <TrialBannerWrapper />
            <AdaptiveLayout
              userEmail={userEmail || ''}
              userRole={userRole || 'user'}
            >
              {children}
            </AdaptiveLayout>
            <GlobalSearch />
            <AIAssistantBar />
          </AIAssistantProvider>
        </UIPreferencesProvider>
      </UIModeProvider>
    </ErrorBufferProvider>
  )
}

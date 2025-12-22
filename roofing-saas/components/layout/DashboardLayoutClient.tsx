'use client'

import { GlobalSearch } from '@/components/search/GlobalSearch'
import { AIAssistantProvider } from '@/lib/ai-assistant/context'
import { AIAssistantBar } from '@/components/ai-assistant/AIAssistantBar'
import { ImpersonationBanner } from '@/components/impersonation'
import { UIModeProvider } from '@/lib/ui-mode/context'
import { UIPreferencesProvider } from '@/lib/ui-preferences/context'
import { AdaptiveLayout } from '@/components/layout/AdaptiveLayout'

interface DashboardLayoutClientProps {
  children: React.ReactNode
  userRole?: string
  userEmail?: string
}

export function DashboardLayoutClient({ children, userRole, userEmail }: DashboardLayoutClientProps) {
  // Log UI mode initialization for verification
  console.log('DashboardLayoutClient - Initializing with userRole:', userRole)

  return (
    <UIModeProvider>
      <UIPreferencesProvider>
        <AIAssistantProvider>
          <ImpersonationBanner />
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
  )
}

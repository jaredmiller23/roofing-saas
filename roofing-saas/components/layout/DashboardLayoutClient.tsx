'use client'

import { GlobalSearch } from '@/components/search/GlobalSearch'
import { AIAssistantProvider } from '@/lib/ai-assistant/context'
import { AIAssistantBar } from '@/components/ai-assistant/AIAssistantBar'
import { ImpersonationBanner } from '@/components/impersonation'
import { UIModeProvider } from '@/lib/ui-mode/context'
import { AdaptiveLayout } from '@/components/layout/AdaptiveLayout'

interface DashboardLayoutClientProps {
  children: React.ReactNode
  userRole?: string
}

export function DashboardLayoutClient({ children, userRole }: DashboardLayoutClientProps) {
  // Log UI mode initialization for verification
  console.log('DashboardLayoutClient - Initializing with userRole:', userRole)

  return (
    <UIModeProvider>
      <AIAssistantProvider>
        <ImpersonationBanner />
        <AdaptiveLayout>
          {children}
        </AdaptiveLayout>
        <GlobalSearch />
        <AIAssistantBar />
      </AIAssistantProvider>
    </UIModeProvider>
  )
}

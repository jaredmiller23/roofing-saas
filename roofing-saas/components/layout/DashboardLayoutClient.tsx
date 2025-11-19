'use client'

import { GlobalSearch } from '@/components/search/GlobalSearch'
import { AIAssistantProvider } from '@/lib/ai-assistant/context'
import { AIAssistantBar } from '@/components/ai-assistant/AIAssistantBar'
import { ImpersonationBanner } from '@/components/impersonation'

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <AIAssistantProvider>
      <ImpersonationBanner />
      {children}
      <GlobalSearch />
      <AIAssistantBar />
    </AIAssistantProvider>
  )
}

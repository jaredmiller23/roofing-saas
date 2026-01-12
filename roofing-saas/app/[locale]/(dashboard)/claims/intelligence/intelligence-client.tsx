'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { BarChart3, Users, Building2, FileText } from 'lucide-react'
import { IntelligenceSummary } from '@/components/claims/IntelligenceSummary'
import { AdjusterList } from '@/components/claims/AdjusterList'
import { CarrierIntelligence } from '@/components/claims/CarrierIntelligence'
import { PatternAnalytics } from '@/components/claims/PatternAnalytics'
import { OutcomeAnalytics } from '@/components/claims/OutcomeAnalytics'

type TabValue = 'summary' | 'adjusters' | 'carriers' | 'patterns' | 'outcomes'

interface IntelligenceClientProps {
  defaultTab?: TabValue
}

/**
 * IntelligenceClient - Client-side orchestrator for Intelligence Dashboard tabs
 *
 * Manages tab state and renders the appropriate tab content.
 * Each tab component handles its own data fetching.
 */
export function IntelligenceClient({ defaultTab = 'summary' }: IntelligenceClientProps) {
  const [activeTab, setActiveTab] = useState<TabValue>(defaultTab)

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="space-y-6">
      <TabsList className="bg-card border border-border p-1 h-auto flex-wrap">
        <TabsTrigger
          value="summary"
          className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
        >
          <BarChart3 className="h-4 w-4" />
          Summary
        </TabsTrigger>
        <TabsTrigger
          value="adjusters"
          className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
        >
          <Users className="h-4 w-4" />
          Adjusters
        </TabsTrigger>
        <TabsTrigger
          value="carriers"
          className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
        >
          <Building2 className="h-4 w-4" />
          Carriers
        </TabsTrigger>
        <TabsTrigger
          value="patterns"
          className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
        >
          <BarChart3 className="h-4 w-4" />
          Patterns
        </TabsTrigger>
        <TabsTrigger
          value="outcomes"
          className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
        >
          <FileText className="h-4 w-4" />
          Outcomes
        </TabsTrigger>
      </TabsList>

      <TabsContent value="summary">
        <IntelligenceSummary />
      </TabsContent>

      <TabsContent value="adjusters">
        <AdjusterList />
      </TabsContent>

      <TabsContent value="carriers">
        <CarrierIntelligence />
      </TabsContent>

      <TabsContent value="patterns">
        <PatternAnalytics />
      </TabsContent>

      <TabsContent value="outcomes">
        <OutcomeAnalytics />
      </TabsContent>
    </Tabs>
  )
}

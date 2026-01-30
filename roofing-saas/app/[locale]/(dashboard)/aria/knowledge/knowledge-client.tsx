'use client'

import { useState } from 'react'
import { BookOpen, Search, BarChart3 } from 'lucide-react'
import { KnowledgeTable } from '@/components/aria/knowledge/KnowledgeTable'
import { KnowledgeSearch } from '@/components/aria/knowledge/KnowledgeSearch'
import { KnowledgeAnalytics } from '@/components/aria/knowledge/KnowledgeAnalytics'

interface KnowledgePageClientProps {
  tenantId: string
}

type TabId = 'entries' | 'search' | 'analytics'

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'entries', label: 'Entries', icon: BookOpen },
  { id: 'search', label: 'Test Search', icon: Search },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
]

export function KnowledgePageClient({ tenantId }: KnowledgePageClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>('entries')

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1">
            Manage roofing knowledge entries used by ARIA for intelligent responses.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'entries' && <KnowledgeTable />}
        {activeTab === 'search' && <KnowledgeSearch />}
        {activeTab === 'analytics' && <KnowledgeAnalytics tenantId={tenantId} />}
      </div>
    </div>
  )
}

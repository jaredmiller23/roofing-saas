'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { SettingsSidebar } from './SettingsSidebar'
import { GeneralSettings } from './GeneralSettings'
import { BrandingSettings } from './BrandingSettings'
import { PipelineSettings } from './PipelineSettings'
import { TemplateSettings } from './TemplateSettings'
import { RoleSettings } from './RoleSettings'
import { SubstatusSettings } from './SubstatusSettings'
import { AppearanceSettings } from './appearance-settings'
import { SecuritySettings } from './SecuritySettings'
import { CallComplianceSettings } from './CallComplianceSettings'
import { GamificationSettings } from './GamificationSettings'
import { IntegrationsSettings } from './IntegrationsSettings'
import { BillingSettings } from '@/components/billing/BillingSettings'

interface SettingsLayoutProps {
  initialSection?: string
}

export function SettingsLayout({ initialSection = 'general' }: SettingsLayoutProps) {
  const [activeSection, setActiveSection] = useState(initialSection)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSelect = (section: string) => {
    setActiveSection(section)
    setMobileMenuOpen(false)
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return <GeneralSettings />
      case 'appearance':
        return <AppearanceSettings />
      case 'branding':
        return <BrandingSettings />
      case 'pipeline':
        return <PipelineSettings />
      case 'substatuses':
        return <SubstatusSettings />
      case 'templates':
        return <TemplateSettings />
      case 'roles':
        return <RoleSettings />
      case 'security':
        return <SecuritySettings />
      case 'compliance':
        return <CallComplianceSettings />
      case 'gamification':
        return <GamificationSettings />
      case 'integrations':
        return <IntegrationsSettings />
      case 'billing':
        return <BillingSettings />
      default:
        return <GeneralSettings />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header with Menu */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center gap-4 px-4 py-3 bg-card border-b border-border">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open settings menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SettingsSidebar activeSection={activeSection} onSelect={handleSelect} />
          </SheetContent>
        </Sheet>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Settings</h1>
        </div>
      </div>

      {/* Desktop: Flex layout with sticky sidebar */}
      <div className="lg:flex">
        {/* Desktop Sidebar - Sticky within content flow */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:shrink-0 lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-border lg:bg-card">
          <SettingsSidebar activeSection={activeSection} onSelect={handleSelect} />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          <div className="p-6 lg:p-8 max-w-5xl">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}

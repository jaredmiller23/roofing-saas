'use client'

import { useState, useEffect } from 'react'
import { SettingsSidebar, settingsGroups } from './SettingsSidebar'
import { SettingsMobileHeader } from './SettingsMobileHeader'
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

// Hook to detect mobile viewport (below lg breakpoint = 1024px)
// IMPORTANT: Initial state must match server-render assumption.
// We default to showing mobile layout to avoid the "no sidebar, no nav" bug
// that occurs when JS says "desktop" but CSS hides the sidebar.
function useIsMobile() {
  // Start with undefined to detect SSR vs client
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // During SSR or before hydration, default to true (mobile-first)
  // This ensures users always have navigation available
  return isMobile ?? true
}

// Get human-readable title for a section
function getSectionTitle(sectionId: string): string {
  for (const group of settingsGroups) {
    const item = group.items.find(i => i.id === sectionId)
    if (item) return item.label
  }
  return 'Settings'
}

interface SettingsLayoutProps {
  initialSection?: string
}

export function SettingsLayout({ initialSection = 'general' }: SettingsLayoutProps) {
  const isMobile = useIsMobile()
  // On mobile, start with null to show the list. On desktop, show the initial section.
  // Initialize to null - we'll set it properly after we know the viewport
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Initialize activeSection based on viewport after mount
  useEffect(() => {
    if (!initialized && isMobile !== undefined) {
      // On mobile, start with null to show list
      // On desktop, show the initial section
      setActiveSection(isMobile ? null : initialSection)
      setInitialized(true)
    }
  }, [isMobile, initialized, initialSection])

  // When switching from mobile to desktop, ensure we have a section (default to 'general')
  useEffect(() => {
    if (initialized && !isMobile && activeSection === null) {
      setActiveSection('general')
    }
  }, [isMobile, activeSection, initialized])

  const handleSelect = (section: string) => {
    setActiveSection(section)
  }

  const handleBack = () => {
    setActiveSection(null)
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

  // MOBILE: List/Detail navigation pattern
  if (isMobile) {
    // No section selected → show settings list
    if (activeSection === null) {
      return (
        <div className="min-h-screen bg-background">
          <SettingsMobileHeader title="Settings" backHref="/dashboard" />
          <SettingsSidebar
            variant="list"
            activeSection={null}
            onSelect={handleSelect}
          />
        </div>
      )
    }

    // Section selected → show section content with back button
    return (
      <div className="min-h-screen bg-background">
        <SettingsMobileHeader
          title={getSectionTitle(activeSection)}
          onBack={handleBack}
        />
        <main className="p-4">
          {renderContent()}
        </main>
      </div>
    )
  }

  // DESKTOP: Sidebar + Content layout
  return (
    <div className="min-h-screen bg-background">
      <div className="lg:flex">
        {/* Desktop Sidebar - Sticky within content flow */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:shrink-0 lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-border lg:bg-card">
          <SettingsSidebar
            variant="sidebar"
            activeSection={activeSection}
            onSelect={handleSelect}
          />
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

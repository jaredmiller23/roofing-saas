'use client'

import {
  Settings,
  Monitor,
  Palette,
  Workflow,
  Tag,
  FileText,
  Zap,
  Shield,
  Lock,
  PhoneOff,
  Trophy,
  Plug,
  CreditCard,
} from 'lucide-react'
import { SettingsNavGroup } from './SettingsNavGroup'

const settingsGroups = [
  {
    label: 'COMPANY',
    items: [
      { id: 'general', label: 'General', icon: Settings },
      { id: 'appearance', label: 'Appearance', icon: Monitor },
      { id: 'branding', label: 'Branding', icon: Palette },
    ],
  },
  {
    label: 'WORKFLOW',
    items: [
      { id: 'pipeline', label: 'Pipeline', icon: Workflow },
      { id: 'substatuses', label: 'Substatuses', icon: Tag },
      { id: 'templates', label: 'Templates', icon: FileText },
      { id: 'automations', label: 'Automations', icon: Zap, href: '/automations' },
    ],
  },
  {
    label: 'TEAM & ACCESS',
    items: [
      { id: 'roles', label: 'Roles', icon: Shield },
      { id: 'security', label: 'Security', icon: Lock },
      { id: 'compliance', label: 'Compliance', icon: PhoneOff },
    ],
  },
  {
    label: 'BUSINESS',
    items: [
      { id: 'gamification', label: 'Incentives', icon: Trophy },
      { id: 'integrations', label: 'Integrations', icon: Plug },
      { id: 'billing', label: 'Billing', icon: CreditCard },
    ],
  },
]

interface SettingsSidebarProps {
  activeSection: string | null
  onSelect: (section: string) => void
  /** Render as list (full-width mobile) or sidebar (desktop) */
  variant?: 'sidebar' | 'list'
}

export function SettingsSidebar({ activeSection, onSelect, variant = 'sidebar' }: SettingsSidebarProps) {
  const isList = variant === 'list'

  return (
    <div className={isList ? 'flex flex-col' : 'flex flex-col h-full'}>
      {/* Header - only show in sidebar mode */}
      {!isList && (
        <div className="px-4 py-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your CRM configuration
          </p>
        </div>
      )}

      {/* Navigation Groups */}
      <div className={isList ? 'px-4 py-4 space-y-6' : 'flex-1 overflow-y-auto px-2 py-4 space-y-6'}>
        {settingsGroups.map((group) => (
          <SettingsNavGroup
            key={group.label}
            label={group.label}
            items={group.items}
            activeId={activeSection}
            onSelect={onSelect}
            variant={variant}
          />
        ))}
      </div>
    </div>
  )
}

export { settingsGroups }

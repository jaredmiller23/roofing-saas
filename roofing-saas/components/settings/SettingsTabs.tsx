'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
import {
  Settings,
  Palette,
  Workflow,
  FileText,
  Shield,
  Tag,
  Monitor,
  Zap,
  PhoneOff,
  Trophy,
  Plug,
  CreditCard
} from 'lucide-react'

export function SettingsTabs() {
  const [activeTab, setActiveTab] = useState('general')

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your CRM customization and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card border border-border p-1 h-auto">
            <TabsTrigger
              value="general"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger
              value="appearance"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <Monitor className="h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger
              value="branding"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <Palette className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger
              value="pipeline"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <Workflow className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger
              value="roles"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <Shield className="h-4 w-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger
              value="substatuses"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <Tag className="h-4 w-4" />
              Substatuses
            </TabsTrigger>
            <TabsTrigger
              value="automations"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <Zap className="h-4 w-4" />
              Automations
            </TabsTrigger>
            <TabsTrigger
              value="compliance"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <PhoneOff className="h-4 w-4" />
              Compliance
            </TabsTrigger>
            <TabsTrigger
              value="gamification"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <Trophy className="h-4 w-4" />
              Incentives
            </TabsTrigger>
            <TabsTrigger
              value="integrations"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <Plug className="h-4 w-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralSettings />
          </TabsContent>

          <TabsContent value="appearance">
            <AppearanceSettings />
          </TabsContent>

          <TabsContent value="branding">
            <BrandingSettings />
          </TabsContent>

          <TabsContent value="pipeline">
            <PipelineSettings />
          </TabsContent>

          <TabsContent value="templates">
            <TemplateSettings />
          </TabsContent>

          <TabsContent value="roles">
            <RoleSettings />
          </TabsContent>

          <TabsContent value="security">
            <SecuritySettings />
          </TabsContent>

          <TabsContent value="substatuses">
            <SubstatusSettings />
          </TabsContent>

          <TabsContent value="automations">
            <div className="space-y-6">
              <div className="text-center py-12">
                <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Workflow Automation Settings</h3>
                <p className="text-muted-foreground mb-6">
                  Configure global automation settings and preferences
                </p>
                <div className="max-w-md mx-auto space-y-4">
                  <div className="text-left space-y-2">
                    <h4 className="font-medium">Automation features:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Visual workflow builder available at /automations</li>
                      <li>• Trigger-based automation system</li>
                      <li>• Email and SMS action support</li>
                      <li>• Task creation and field updates</li>
                      <li>• Webhook integrations</li>
                      <li>• Pre-built workflow templates</li>
                    </ul>
                  </div>
                  <div className="pt-4">
                    <Link
                      href="/automations"
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Go to Automations
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="compliance">
            <CallComplianceSettings />
          </TabsContent>

          <TabsContent value="gamification">
            <GamificationSettings />
          </TabsContent>

          <TabsContent value="integrations">
            <IntegrationsSettings />
          </TabsContent>

          <TabsContent value="billing">
            <BillingSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

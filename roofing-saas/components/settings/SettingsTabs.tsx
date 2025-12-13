'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { GeneralSettings } from './GeneralSettings'
import { BrandingSettings } from './BrandingSettings'
import { PipelineSettings } from './PipelineSettings'
import { TemplateSettings } from './TemplateSettings'
import { RoleSettings } from './RoleSettings'
import { SubstatusSettings } from './SubstatusSettings'
import { FilterSettings } from './FilterSettings'
import { AdminSettings } from './AdminSettings'
import { AutomationSettings } from './AutomationSettings'
import { IntegrationsSettings } from './IntegrationsSettings'
import { GamificationSettings } from './GamificationSettings'
import { CallComplianceSettings } from './CallComplianceSettings'
import {
  Settings,
  Palette,
  Workflow,
  FileText,
  Shield,
  Tag,
  Filter,
  UserCog,
  Zap,
  Plug,
  Trophy,
  PhoneIncoming
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
          <TabsList className="bg-card border border p-1 h-auto">
            <TabsTrigger
              value="general"
              className="flex items-center gap-2 text-foreground hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2"
            >
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger
              value="branding"
              className="flex items-center gap-2 text-foreground hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2"
            >
              <Palette className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger
              value="pipeline"
              className="flex items-center gap-2 text-foreground hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2"
            >
              <Workflow className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="flex items-center gap-2 text-foreground hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2"
            >
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger
              value="roles"
              className="flex items-center gap-2 text-foreground hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2"
            >
              <Shield className="h-4 w-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger
              value="substatus"
              className="flex items-center gap-2 text-foreground hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2"
            >
              <Tag className="h-4 w-4" />
              Substatus
            </TabsTrigger>
            <TabsTrigger
              value="filters"
              className="flex items-center gap-2 text-foreground hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </TabsTrigger>
            <TabsTrigger
              value="admin"
              className="flex items-center gap-2 text-foreground hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2"
            >
              <UserCog className="h-4 w-4" />
              Admin
            </TabsTrigger>
            <TabsTrigger
              value="automations"
              className="flex items-center gap-2 text-foreground hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2"
            >
              <Zap className="h-4 w-4" />
              Automations
            </TabsTrigger>
            <TabsTrigger
              value="integrations"
              className="flex items-center gap-2 text-foreground hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2"
            >
              <Plug className="h-4 w-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger
              value="gamification"
              className="flex items-center gap-2 text-foreground hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2"
            >
              <Trophy className="h-4 w-4" />
              Gamification
            </TabsTrigger>
            <TabsTrigger
              value="compliance"
              className="flex items-center gap-2 text-foreground hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2"
            >
              <PhoneIncoming className="h-4 w-4" />
              Compliance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralSettings />
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

          <TabsContent value="substatus">
            <SubstatusSettings />
          </TabsContent>

          <TabsContent value="filters">
            <FilterSettings />
          </TabsContent>

          <TabsContent value="admin">
            <AdminSettings />
          </TabsContent>

          <TabsContent value="automations">
            <AutomationSettings />
          </TabsContent>

          <TabsContent value="integrations">
            <IntegrationsSettings />
          </TabsContent>

          <TabsContent value="gamification">
            <GamificationSettings />
          </TabsContent>

          <TabsContent value="compliance">
            <CallComplianceSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

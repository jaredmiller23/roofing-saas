'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { GeneralSettings } from './GeneralSettings'
import { BrandingSettings } from './BrandingSettings'
import { PipelineSettings } from './PipelineSettings'
import { TemplateSettings } from './TemplateSettings'
import { RoleSettings } from './RoleSettings'
import { SubstatusSettings } from './SubstatusSettings'
import { AppearanceSettings } from './appearance-settings'
import {
  Settings,
  Palette,
  Workflow,
  FileText,
  Shield,
  Tag,
  Monitor
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
              value="substatuses"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <Tag className="h-4 w-4" />
              Substatuses
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

          <TabsContent value="substatuses">
            <SubstatusSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

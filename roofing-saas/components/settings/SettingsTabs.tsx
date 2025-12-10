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
import {
  Settings,
  Palette,
  Workflow,
  FileText,
  Shield,
  Tag,
  Filter,
  UserCog
} from 'lucide-react'

export function SettingsTabs() {
  const [activeTab, setActiveTab] = useState('general')

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your CRM customization and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-gray-200 p-1 h-auto">
            <TabsTrigger
              value="general"
              className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white px-4 py-2"
            >
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger
              value="branding"
              className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white px-4 py-2"
            >
              <Palette className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger
              value="pipeline"
              className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white px-4 py-2"
            >
              <Workflow className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white px-4 py-2"
            >
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger
              value="roles"
              className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white px-4 py-2"
            >
              <Shield className="h-4 w-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger
              value="substatus"
              className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white px-4 py-2"
            >
              <Tag className="h-4 w-4" />
              Substatus
            </TabsTrigger>
            <TabsTrigger
              value="filters"
              className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white px-4 py-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </TabsTrigger>
            <TabsTrigger
              value="admin"
              className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white px-4 py-2"
            >
              <UserCog className="h-4 w-4" />
              Admin
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
        </Tabs>
      </div>
    </div>
  )
}

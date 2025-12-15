'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ProjectTemplate,
  TemplateType,
  TemplateCategory,
  QuickTemplateOption
} from '@/lib/types/project-template'
import { DEFAULT_TEMPLATES } from '@/lib/data/default-templates'
import {
  Home,
  Building2,
  Wrench,
  Search,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Clock,
  DollarSign,
  Users,
  CheckCircle
} from 'lucide-react'

interface TemplateSelectorProps {
  onTemplateSelect: (template: ProjectTemplate | null) => void
  selectedTemplate?: ProjectTemplate | null
  className?: string
}

const TEMPLATE_ICONS = {
  'residential-roof-replacement': Home,
  'commercial-roof-installation': Building2,
  'storm-damage-repair': AlertTriangle,
  'roof-inspection': Search,
  'insurance-claim-project': ShieldCheck,
  'emergency-repair': Wrench,
} as const

const CATEGORY_INFO = {
  residential: {
    name: 'Residential',
    description: 'Single-family and multi-family homes',
    icon: Home,
    color: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
  },
  commercial: {
    name: 'Commercial',
    description: 'Office buildings and commercial properties',
    icon: Building2,
    color: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
  },
  repair: {
    name: 'Repair',
    description: 'Maintenance and repair projects',
    icon: Wrench,
    color: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
  },
  inspection: {
    name: 'Inspection',
    description: 'Assessment and evaluation services',
    icon: Search,
    color: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
  },
  insurance: {
    name: 'Insurance',
    description: 'Insurance claim projects',
    icon: ShieldCheck,
    color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
  },
  emergency: {
    name: 'Emergency',
    description: 'Urgent repair and emergency services',
    icon: AlertTriangle,
    color: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
  }
} as const

export function TemplateSelector({
  onTemplateSelect,
  selectedTemplate,
  className
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all')
  const [templateType, setTemplateType] = useState<TemplateType | 'all'>('all')
  const [showQuickOptions, setShowQuickOptions] = useState(true)

  // Load templates on component mount
  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      // For now, use default templates. In production, this would fetch from API
      const defaultTemplates = Object.entries(DEFAULT_TEMPLATES).map(([key, template]) => ({
        id: key,
        tenant_id: 'current', // Would be actual tenant ID
        created_by: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        usage_count: Math.floor(Math.random() * 100), // Mock usage
        last_used_at: new Date().toISOString(),
        ...template
      }))

      setTemplates(defaultTemplates as ProjectTemplate[])
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter templates based on search and category
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = selectedCategory === 'all' ||
      getCategoryFromTemplate(template) === selectedCategory

    const matchesType = templateType === 'all' || template.template_type === templateType

    return matchesSearch && matchesCategory && matchesType
  })

  // Get template category based on template ID
  const getCategoryFromTemplate = (template: ProjectTemplate): TemplateCategory => {
    if (template.default_template_id) {
      if (template.default_template_id.includes('residential')) return 'residential'
      if (template.default_template_id.includes('commercial')) return 'commercial'
      if (template.default_template_id.includes('repair')) return 'repair'
      if (template.default_template_id.includes('inspection')) return 'inspection'
      if (template.default_template_id.includes('insurance')) return 'insurance'
      if (template.default_template_id.includes('emergency')) return 'emergency'
    }
    return 'residential' // Default
  }

  // Quick template options for fast selection
  const quickOptions: QuickTemplateOption[] = [
    {
      id: 'residential-roof-replacement',
      name: 'Roof Replacement',
      description: 'Complete residential roof replacement',
      estimated_duration: '3-5 days',
      typical_value_range: '$8K - $25K',
      icon: 'Home'
    },
    {
      id: 'storm-damage-repair',
      name: 'Storm Repair',
      description: 'Emergency storm damage repair',
      estimated_duration: '1-3 days',
      typical_value_range: '$2K - $15K',
      icon: 'AlertTriangle'
    },
    {
      id: 'roof-inspection',
      name: 'Inspection',
      description: 'Comprehensive roof inspection',
      estimated_duration: '1 day',
      typical_value_range: '$200 - $500',
      icon: 'Search'
    }
  ]

  const handleTemplateSelect = (template: ProjectTemplate) => {
    onTemplateSelect(template)
  }

  const handleQuickSelect = (optionId: string) => {
    const template = templates.find(t => t.default_template_id === optionId)
    if (template) {
      handleTemplateSelect(template)
      setShowQuickOptions(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Select Project Template</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Select Project Template</h3>
          <p className="text-sm text-muted-foreground">
            Choose a template to get started quickly with pre-configured tasks and milestones
          </p>
        </div>
        {selectedTemplate && (
          <Button
            variant="outline"
            onClick={() => onTemplateSelect(null)}
            className="text-sm"
          >
            Clear Selection
          </Button>
        )}
      </div>

      {/* Quick Options */}
      {showQuickOptions && !selectedTemplate && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Quick Start</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowQuickOptions(false)}
            >
              Show All Templates
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {quickOptions.map((option) => {
              const Icon = TEMPLATE_ICONS[option.id as keyof typeof TEMPLATE_ICONS]
              return (
                <Card
                  key={option.id}
                  className="cursor-pointer transition-all hover:shadow-md border-2 hover:border-primary/50"
                  onClick={() => handleQuickSelect(option.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{option.name}</CardTitle>
                    </div>
                    <CardDescription className="text-sm">
                      {option.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {option.estimated_duration}
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {option.typical_value_range}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <Separator />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Label htmlFor="template-search" className="sr-only">Search templates</Label>
          <Input
            id="template-search"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={selectedCategory} onValueChange={(value: TemplateCategory | 'all') => setSelectedCategory(value)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_INFO).map(([key, info]) => (
              <SelectItem key={key} value={key}>
                {info.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={templateType} onValueChange={(value: TemplateType | 'all') => setTemplateType(value)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => {
          const category = getCategoryFromTemplate(template)
          const categoryInfo = CATEGORY_INFO[category]
          const Icon = template.default_template_id
            ? TEMPLATE_ICONS[template.default_template_id as keyof typeof TEMPLATE_ICONS] || FileText
            : FileText
          const isSelected = selectedTemplate?.id === template.id

          return (
            <Card
              key={template.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected
                  ? 'ring-2 ring-primary border-primary shadow-md'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => handleTemplateSelect(template)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{template.name}</CardTitle>
                      {isSelected && (
                        <div className="flex items-center gap-1 text-xs text-primary mt-1">
                          <CheckCircle className="h-3 w-3" />
                          Selected
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Badge variant="secondary" className={categoryInfo.color}>
                      {categoryInfo.name}
                    </Badge>
                    {template.template_type === 'system' && (
                      <Badge variant="outline" className="text-xs">
                        System
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="text-sm line-clamp-2">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {template.estimated_duration_days} days
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {template.tasks.length} tasks
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {template.milestones.length} milestones
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {template.document_checklist.length} docs
                    </div>
                  </div>

                  {template.estimated_budget_range && (
                    <div className="flex items-center gap-1 text-sm">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-muted-foreground">
                        ${template.estimated_budget_range.min?.toLocaleString()} -
                        ${template.estimated_budget_range.max?.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {template.usage_count > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Used {template.usage_count} times
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* No results */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No templates found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search criteria or create a new custom template
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('')
              setSelectedCategory('all')
              setTemplateType('all')
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Custom Template Option */}
      <div className="border-t pt-4">
        <Card
          className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 border-dashed"
          onClick={() => onTemplateSelect(null)}
        >
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Start from Scratch</CardTitle>
                <CardDescription>
                  Create a custom project without using a template
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
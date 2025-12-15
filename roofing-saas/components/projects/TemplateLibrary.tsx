'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ProjectTemplate,
  TemplateType,
  TemplateFilters,
  TemplateAnalytics,
  TemplatePerformanceMetrics
} from '@/lib/types/project-template'
import { DEFAULT_TEMPLATES } from '@/lib/data/default-templates'
import {
  Search,
  MoreHorizontal,
  Copy,
  Edit,
  Trash2,
  Download,
  Eye,
  Plus,
  TrendingUp,
  Clock,
  DollarSign,
  BarChart3,
  Grid3x3,
  List,
  Filter,
  Star,
  Users,
  Calendar
} from 'lucide-react'

interface TemplateLibraryProps {
  onTemplateEdit?: (template: ProjectTemplate) => void
  onTemplateCreate?: () => void
  className?: string
}

type ViewMode = 'grid' | 'table'

export function TemplateLibrary({
  onTemplateEdit,
  onTemplateCreate,
  className
}: TemplateLibraryProps) {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null)
  const [templateToDelete, setTemplateToDelete] = useState<ProjectTemplate | null>(null)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [filters, setFilters] = useState<TemplateFilters>({
    search: '',
    template_type: undefined,
    is_active: undefined,
    sort_by: 'name',
    sort_order: 'asc'
  })

  // Mock analytics data
  const [analytics, setAnalytics] = useState<TemplatePerformanceMetrics | null>(null)

  useEffect(() => {
    loadTemplates()
    loadAnalytics()
  }, [filters])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      // Mock API call - in production, this would fetch from the API
      const defaultTemplates = Object.entries(DEFAULT_TEMPLATES).map(([key, template]) => ({
        id: key,
        tenant_id: 'current',
        created_by: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        usage_count: Math.floor(Math.random() * 100),
        last_used_at: Math.random() > 0.3 ? new Date().toISOString() : undefined,
        ...template
      }))

      // Add some mock custom templates
      const customTemplates: ProjectTemplate[] = [
        {
          id: 'custom-1',
          tenant_id: 'current',
          name: 'Premium Residential Package',
          description: 'High-end residential roof replacement with premium materials',
          template_type: 'custom',
          created_by: 'user-123',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-02-01T15:30:00Z',
          is_active: true,
          is_default: false,
          version: 2,
          default_pipeline_stage: 'qualified',
          default_priority: 'high',
          estimated_duration_days: 6,
          estimated_budget_range: { min: 15000, max: 40000 },
          stages: [],
          tasks: [],
          milestones: [],
          default_fields: {
            name_pattern: '{customer_name} - Premium Roof Package',
            description: 'Premium residential roofing project'
          },
          document_checklist: [],
          usage_count: 45,
          last_used_at: '2024-02-10T09:15:00Z'
        },
        {
          id: 'custom-2',
          tenant_id: 'current',
          name: 'Quick Repair Process',
          description: 'Streamlined process for small repair jobs',
          template_type: 'custom',
          created_by: 'user-456',
          created_at: '2024-01-20T14:00:00Z',
          updated_at: '2024-01-20T14:00:00Z',
          is_active: true,
          is_default: false,
          version: 1,
          default_pipeline_stage: 'prospect',
          default_priority: 'normal',
          estimated_duration_days: 1,
          estimated_budget_range: { min: 500, max: 2500 },
          stages: [],
          tasks: [],
          milestones: [],
          default_fields: {
            name_pattern: '{customer_name} - Quick Repair',
            description: 'Fast repair service'
          },
          document_checklist: [],
          usage_count: 23,
          last_used_at: '2024-02-08T11:20:00Z'
        }
      ]

      const allTemplates = [...defaultTemplates, ...customTemplates] as ProjectTemplate[]

      // Apply filters
      let filteredTemplates = allTemplates.filter(template => {
        const matchesSearch = !filters.search ||
          template.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          template.description?.toLowerCase().includes(filters.search.toLowerCase())

        const matchesType = filters.template_type === undefined ||
          template.template_type === filters.template_type

        const matchesActive = filters.is_active === undefined ||
          template.is_active === filters.is_active

        return matchesSearch && matchesType && matchesActive
      })

      // Apply sorting
      if (filters.sort_by) {
        filteredTemplates.sort((a, b) => {
          let aValue: any = a[filters.sort_by!]
          let bValue: any = b[filters.sort_by!]

          if (filters.sort_by === 'usage_count' || filters.sort_by === 'last_used_at') {
            aValue = aValue || 0
            bValue = bValue || 0
          }

          if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase()
            bValue = bValue?.toLowerCase() || ''
          }

          const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
          return filters.sort_order === 'desc' ? -result : result
        })
      }

      setTemplates(filteredTemplates)
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAnalytics = async () => {
    try {
      // Mock analytics data
      const mockAnalytics: TemplatePerformanceMetrics = {
        most_used_templates: templates.slice(0, 5).map(t => ({
          template_id: t.id,
          name: t.name,
          usage_count: t.usage_count,
          avg_project_duration: t.estimated_duration_days || 0,
          avg_project_value: ((t.estimated_budget_range?.min || 0) + (t.estimated_budget_range?.max || 0)) / 2,
          success_rate: 0.85 + Math.random() * 0.15,
          last_30_days_usage: Math.floor(t.usage_count * 0.3),
          created_projects: {
            total: t.usage_count,
            completed: Math.floor(t.usage_count * 0.8),
            in_progress: Math.floor(t.usage_count * 0.15),
            cancelled: Math.floor(t.usage_count * 0.05)
          }
        })),
        fastest_completion: [],
        highest_value: [],
        best_success_rate: []
      }

      setAnalytics(mockAnalytics)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    }
  }

  const handleDuplicateTemplate = async (template: ProjectTemplate) => {
    try {
      // In production, this would make an API call
      const duplicated: ProjectTemplate = {
        ...template,
        id: `${template.id}-copy-${Date.now()}`,
        name: `${template.name} (Copy)`,
        template_type: 'custom',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        usage_count: 0,
        last_used_at: undefined,
        version: 1
      }

      setTemplates(prev => [duplicated, ...prev])
    } catch (error) {
      console.error('Failed to duplicate template:', error)
    }
  }

  const handleDeleteTemplate = async (template: ProjectTemplate) => {
    try {
      // In production, this would make an API call
      setTemplates(prev => prev.filter(t => t.id !== template.id))
      setTemplateToDelete(null)
    } catch (error) {
      console.error('Failed to delete template:', error)
    }
  }

  const handleToggleActive = async (template: ProjectTemplate) => {
    try {
      // In production, this would make an API call
      setTemplates(prev =>
        prev.map(t =>
          t.id === template.id
            ? { ...t, is_active: !t.is_active, updated_at: new Date().toISOString() }
            : t
        )
      )
    } catch (error) {
      console.error('Failed to toggle template status:', error)
    }
  }

  const formatLastUsed = (dateString?: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 30) return `${diffInDays} days ago`
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`
    return `${Math.floor(diffInDays / 365)} years ago`
  }

  const TemplateActions = ({ template }: { template: ProjectTemplate }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setSelectedTemplate(template)}>
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </DropdownMenuItem>
        {template.template_type === 'custom' && onTemplateEdit && (
          <DropdownMenuItem onClick={() => onTemplateEdit(template)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleToggleActive(template)}>
          <Star className="h-4 w-4 mr-2" />
          {template.is_active ? 'Deactivate' : 'Activate'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {template.template_type === 'custom' && (
          <DropdownMenuItem
            onClick={() => setTemplateToDelete(template)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const GridView = () => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <Card key={template.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <div className="flex gap-2">
                  <Badge variant={template.template_type === 'system' ? 'default' : 'secondary'}>
                    {template.template_type}
                  </Badge>
                  {!template.is_active && (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                  {template.is_default && (
                    <Badge variant="outline">Default</Badge>
                  )}
                </div>
              </div>
              <TemplateActions template={template} />
            </div>
            <CardDescription className="line-clamp-2">
              {template.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{template.estimated_duration_days} days</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{template.usage_count} uses</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span>{template.tasks?.length || 0} tasks</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatLastUsed(template.last_used_at)}</span>
                </div>
              </div>

              {template.estimated_budget_range && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-muted-foreground">
                    ${template.estimated_budget_range.min?.toLocaleString()} -
                    ${template.estimated_budget_range.max?.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const TableView = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Usage</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Last Used</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {templates.map((template) => (
          <TableRow key={template.id}>
            <TableCell>
              <div>
                <div className="font-medium">{template.name}</div>
                <div className="text-sm text-muted-foreground line-clamp-1">
                  {template.description}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={template.template_type === 'system' ? 'default' : 'secondary'}>
                {template.template_type}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Badge variant={template.is_active ? 'default' : 'outline'}>
                  {template.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {template.is_default && (
                  <Badge variant="outline">Default</Badge>
                )}
              </div>
            </TableCell>
            <TableCell>{template.usage_count}</TableCell>
            <TableCell>{template.estimated_duration_days} days</TableCell>
            <TableCell>{formatLastUsed(template.last_used_at)}</TableCell>
            <TableCell>
              <TemplateActions template={template} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  return (
    <div className={`space-y-6 ${className}`}>
      <Tabs defaultValue="templates" className="w-full">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <Button onClick={onTemplateCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </div>

        <TabsContent value="templates" className="space-y-4">
          {/* Filters and Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1">
              <Input
                placeholder="Search templates..."
                value={filters.search || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="max-w-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Templates Display */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No templates found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search criteria or create a new template
              </p>
              <Button onClick={() => setFilters({ search: '' })}>
                Clear Search
              </Button>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? <GridView /> : <TableView />}
            </>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analytics && (
            <div className="grid gap-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{templates.length}</div>
                    <p className="text-xs text-muted-foreground">
                      {templates.filter(t => t.template_type === 'system').length} system,{' '}
                      {templates.filter(t => t.template_type === 'custom').length} custom
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {templates.reduce((sum, t) => sum + t.usage_count, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Projects created from templates
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Math.round(templates.reduce((sum, t) => sum + (t.estimated_duration_days || 0), 0) / templates.length)}
                    </div>
                    <p className="text-xs text-muted-foreground">Days per project</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {templates.filter(t => t.is_active).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {Math.round((templates.filter(t => t.is_active).length / templates.length) * 100)}% of total
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Most Used Templates</CardTitle>
                  <CardDescription>Templates with highest usage in the last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Template</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead>Success Rate</TableHead>
                        <TableHead>Avg Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.most_used_templates.slice(0, 5).map((template) => (
                        <TableRow key={template.template_id}>
                          <TableCell className="font-medium">{template.name}</TableCell>
                          <TableCell>{template.usage_count}</TableCell>
                          <TableCell>{Math.round(template.success_rate * 100)}%</TableCell>
                          <TableCell>${template.avg_project_value.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Template Details Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>{selectedTemplate?.description}</DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Template Info</h4>
                  <div className="space-y-1 text-sm">
                    <div>Type: {selectedTemplate.template_type}</div>
                    <div>Duration: {selectedTemplate.estimated_duration_days} days</div>
                    <div>Usage: {selectedTemplate.usage_count} times</div>
                    <div>Last used: {formatLastUsed(selectedTemplate.last_used_at)}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Budget Range</h4>
                  <div className="text-sm">
                    {selectedTemplate.estimated_budget_range ? (
                      <div>
                        ${selectedTemplate.estimated_budget_range.min?.toLocaleString()} -
                        ${selectedTemplate.estimated_budget_range.max?.toLocaleString()}
                      </div>
                    ) : (
                      'Not specified'
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Stages ({selectedTemplate.stages?.length || 0})</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {selectedTemplate.stages?.map((stage, index) => (
                    <div key={index}>• {stage.name}</div>
                  )) || <div>No stages defined</div>}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Tasks ({selectedTemplate.tasks?.length || 0})</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {selectedTemplate.tasks?.slice(0, 5).map((task, index) => (
                    <div key={index}>• {task.name}</div>
                  )) || <div>No tasks defined</div>}
                  {(selectedTemplate.tasks?.length || 0) > 5 && (
                    <div className="text-xs">... and {selectedTemplate.tasks!.length - 5} more</div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Document Checklist ({selectedTemplate.document_checklist?.length || 0})</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {selectedTemplate.document_checklist?.slice(0, 5).map((doc, index) => (
                    <div key={index}>• {doc}</div>
                  )) || <div>No documents specified</div>}
                  {(selectedTemplate.document_checklist?.length || 0) > 5 && (
                    <div className="text-xs">... and {selectedTemplate.document_checklist!.length - 5} more</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => templateToDelete && handleDeleteTemplate(templateToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
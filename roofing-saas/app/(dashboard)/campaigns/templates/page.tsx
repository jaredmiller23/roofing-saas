'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Mail,
  FileText,
  ClipboardCheck,
  RefreshCw,
  Star,
  CloudRain,
  Loader2,
  Clock,
  Target,
  Zap,
} from 'lucide-react'
import { getAllTemplates, getTemplateById, type CampaignTemplate } from '@/lib/campaigns/templates'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  lead_nurture: <Mail className="h-5 w-5" />,
  follow_up: <FileText className="h-5 w-5" />,
  retention: <RefreshCw className="h-5 w-5" />,
  review: <Star className="h-5 w-5" />,
  reengagement: <Zap className="h-5 w-5" />,
}

export default function CampaignTemplatesPage() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null)
  const [showUseDialog, setShowUseDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [customization, setCustomization] = useState({
    name: '',
    description: '',
  })

  const templates = getAllTemplates()
  const filteredTemplates =
    selectedCategory === 'all'
      ? templates
      : templates.filter((t) => t.category === selectedCategory)

  const handleUseTemplate = (template: CampaignTemplate) => {
    setSelectedTemplate(template)
    setCustomization({
      name: template.name,
      description: template.description,
    })
    setShowUseDialog(true)
  }

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate) return

    setLoading(true)
    try {
      // Create campaign
      const campaignRes = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customization.name,
          description: customization.description,
          campaign_type: selectedTemplate.campaign_type,
          goal_type: selectedTemplate.goal_type,
          goal_target: selectedTemplate.goal_target,
        }),
      })

      if (!campaignRes.ok) throw new Error('Failed to create campaign')

      const campaignData = await campaignRes.json()
      const campaignId = campaignData.campaign.id

      // Create steps
      for (const step of selectedTemplate.steps) {
        const stepRes = await fetch(`/api/campaigns/${campaignId}/steps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(step),
        })

        if (!stepRes.ok) {
          console.error('Failed to create step:', step)
        }
      }

      // Navigate to builder
      router.push(`/campaigns/${campaignId}/builder`)
    } catch (error) {
      console.error('Error creating campaign from template:', error)
      alert('Failed to create campaign. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/campaigns')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Campaign Templates</h1>
            <p className="text-muted-foreground mt-1">
              Pre-built campaigns for common roofing business workflows
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Templates</CardDescription>
            <CardTitle className="text-3xl">{templates.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Lead Nurture</CardDescription>
            <CardTitle className="text-3xl">
              {templates.filter((t) => t.category === 'lead_nurture').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Follow-ups</CardDescription>
            <CardTitle className="text-3xl">
              {templates.filter((t) => t.category === 'follow_up').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Reviews</CardDescription>
            <CardTitle className="text-3xl">
              {templates.filter((t) => t.category === 'review').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList>
          <TabsTrigger value="all">All Templates</TabsTrigger>
          <TabsTrigger value="lead_nurture">Lead Nurture</TabsTrigger>
          <TabsTrigger value="follow_up">Follow-ups</TabsTrigger>
          <TabsTrigger value="reengagement">Re-engagement</TabsTrigger>
          <TabsTrigger value="review">Reviews</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">No templates found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUse={handleUseTemplate}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Use Template Dialog */}
      <Dialog open={showUseDialog} onOpenChange={setShowUseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Campaign from Template</DialogTitle>
            <DialogDescription>
              Customize the template before creating your campaign
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-6 py-4">
              {/* Template Info */}
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="flex items-start gap-3">
                  {CATEGORY_ICONS[selectedTemplate.category]}
                  <div className="flex-1">
                    <h4 className="font-semibold">{selectedTemplate.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedTemplate.description}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {selectedTemplate.estimated_duration}
                      </Badge>
                      <Badge variant="outline">
                        {selectedTemplate.steps.length} steps
                      </Badge>
                      {selectedTemplate.goal_type && (
                        <Badge variant="outline">
                          <Target className="h-3 w-3 mr-1" />
                          {selectedTemplate.goal_type}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Customization */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input
                    id="campaign-name"
                    value={customization.name}
                    onChange={(e) =>
                      setCustomization({ ...customization, name: e.target.value })
                    }
                    placeholder="Enter campaign name..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaign-description">Description</Label>
                  <Textarea
                    id="campaign-description"
                    value={customization.description}
                    onChange={(e) =>
                      setCustomization({
                        ...customization,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Describe your campaign..."
                  />
                </div>
              </div>

              {/* Steps Preview */}
              <div className="space-y-2">
                <Label>Campaign Steps ({selectedTemplate.steps.length})</Label>
                <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
                  {selectedTemplate.steps.map((step, index) => (
                    <div key={index} className="p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Step {step.step_order}:</span>
                        <span className="text-muted-foreground">
                          {step.step_type.replace(/_/g, ' ')}
                        </span>
                        {step.delay_value > 0 && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            Wait {step.delay_value} {step.delay_unit}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUseDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFromTemplate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Campaign'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface TemplateCardProps {
  template: CampaignTemplate
  onUse: (template: CampaignTemplate) => void
}

function TemplateCard({ template, onUse }: TemplateCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {CATEGORY_ICONS[template.category]}
            </div>
            <div>
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <CardDescription className="mt-1">
                {template.description}
              </CardDescription>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="secondary" className="capitalize">
            {template.category.replace(/_/g, ' ')}
          </Badge>
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            {template.estimated_duration}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Steps</span>
            <span className="font-medium">{template.steps.length}</span>
          </div>
          {template.goal_type && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Goal</span>
              <span className="font-medium capitalize">
                {template.goal_type.replace(/_/g, ' ')}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium capitalize">
              {template.campaign_type}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {template.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <Button onClick={() => onUse(template)} className="w-full">
          Use This Template
        </Button>
      </CardContent>
    </Card>
  )
}

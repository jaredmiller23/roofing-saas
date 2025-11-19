'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Play, Pause, Archive, Copy, MoreVertical, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Campaign, CampaignType, CampaignStatus } from '@/lib/campaigns/types'

export default function CampaignsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all')

  useEffect(() => {
    fetchCampaigns()
  }, [statusFilter])

  const fetchCampaigns = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      const response = await fetch(`/api/campaigns?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch campaigns')

      const data = await response.json()
      setCampaigns(data.campaigns || [])
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCampaign = () => {
    router.push('/campaigns/new')
  }

  const handleEditCampaign = (id: string) => {
    router.push(`/campaigns/${id}/builder`)
  }

  const handleDuplicateCampaign = async (campaign: Campaign) => {
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${campaign.name} (Copy)`,
          description: campaign.description,
          campaign_type: campaign.campaign_type,
          goal_type: campaign.goal_type,
          goal_target: campaign.goal_target,
          allow_re_enrollment: campaign.allow_re_enrollment,
          re_enrollment_delay_days: campaign.re_enrollment_delay_days,
          respect_business_hours: campaign.respect_business_hours,
          business_hours: campaign.business_hours,
          enrollment_type: campaign.enrollment_type,
          max_enrollments: campaign.max_enrollments,
        }),
      })

      if (!response.ok) throw new Error('Failed to duplicate campaign')

      const data = await response.json()
      router.push(`/campaigns/${data.campaign.id}/builder`)
    } catch (error) {
      console.error('Error duplicating campaign:', error)
    }
  }

  const handleToggleCampaignStatus = async (
    id: string,
    currentStatus: CampaignStatus
  ) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'

    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error('Failed to update campaign status')

      await fetchCampaigns()
    } catch (error) {
      console.error('Error updating campaign status:', error)
    }
  }

  const handleArchiveCampaign = async (id: string) => {
    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      })

      if (!response.ok) throw new Error('Failed to archive campaign')

      await fetchCampaigns()
    } catch (error) {
      console.error('Error archiving campaign:', error)
    }
  }

  const filteredCampaigns =
    statusFilter === 'all'
      ? campaigns
      : campaigns.filter((c) => c.status === statusFilter)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Automated email and SMS sequences to nurture leads
          </p>
        </div>
        <Button onClick={handleCreateCampaign}>
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Campaigns</CardDescription>
            <CardTitle className="text-3xl">
              {campaigns.filter((c) => c.status === 'active').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Enrolled</CardDescription>
            <CardTitle className="text-3xl">
              {campaigns.reduce((sum, c) => sum + c.total_enrolled, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl">
              {campaigns.reduce((sum, c) => sum + c.total_completed, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Revenue</CardDescription>
            <CardTitle className="text-3xl">
              ${campaigns.reduce((sum, c) => sum + c.total_revenue, 0).toFixed(0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs Filter */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as CampaignStatus | 'all')}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="paused">Paused</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">
                  No campaigns found
                </p>
                <Button onClick={handleCreateCampaign}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCampaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onEdit={handleEditCampaign}
                  onDuplicate={handleDuplicateCampaign}
                  onToggleStatus={handleToggleCampaignStatus}
                  onArchive={handleArchiveCampaign}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface CampaignCardProps {
  campaign: Campaign
  onEdit: (id: string) => void
  onDuplicate: (campaign: Campaign) => void
  onToggleStatus: (id: string, currentStatus: CampaignStatus) => void
  onArchive: (id: string) => void
}

function CampaignCard({
  campaign,
  onEdit,
  onDuplicate,
  onToggleStatus,
  onArchive,
}: CampaignCardProps) {
  const completionRate = campaign.total_enrolled > 0
    ? ((campaign.total_completed / campaign.total_enrolled) * 100).toFixed(1)
    : '0'

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader onClick={() => onEdit(campaign.id)}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{campaign.name}</CardTitle>
            <CardDescription className="mt-1">
              {campaign.description || 'No description'}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(campaign.id)}>
                Edit Campaign
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(campaign)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {campaign.status !== 'archived' && (
                <DropdownMenuItem
                  onClick={() => onToggleStatus(campaign.id, campaign.status)}
                >
                  {campaign.status === 'active' ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onArchive(campaign.id)}
                className="text-destructive"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <CampaignStatusBadge status={campaign.status} />
          <CampaignTypeBadge type={campaign.campaign_type} />
        </div>
      </CardHeader>
      <CardContent onClick={() => onEdit(campaign.id)}>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Enrolled</p>
            <p className="text-2xl font-bold">{campaign.total_enrolled}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Completion</p>
            <p className="text-2xl font-bold">{completionRate}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const variants: Record<CampaignStatus, string> = {
    draft: 'secondary',
    active: 'default',
    paused: 'outline',
    archived: 'destructive',
  }

  return (
    <Badge variant={variants[status] as 'default' | 'secondary' | 'outline' | 'destructive'}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

function CampaignTypeBadge({ type }: { type: CampaignType }) {
  const labels: Record<CampaignType, string> = {
    drip: 'Drip',
    event: 'Event-based',
    reengagement: 'Re-engagement',
    retention: 'Retention',
    nurture: 'Nurture',
  }

  return <Badge variant="outline">{labels[type]}</Badge>
}

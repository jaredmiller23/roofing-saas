'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Loader2 } from 'lucide-react'
import type { CampaignType, GoalType } from '@/lib/campaigns/types'

export default function NewCampaignPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    campaign_type: 'drip' as CampaignType,
    goal_type: undefined as GoalType | undefined,
    goal_target: undefined as number | undefined,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to create campaign')
      }

      const data = await response.json()
      router.push(`/campaigns/${data.campaign.id}/builder`)
    } catch (error) {
      console.error('Error creating campaign:', error)
      alert('Failed to create campaign. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Campaigns
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Create New Campaign</CardTitle>
          <CardDescription>
            Set up a new automated campaign to nurture your leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campaign Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., New Lead Welcome Series"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe the purpose of this campaign..."
                rows={3}
              />
            </div>

            {/* Campaign Type */}
            <div className="space-y-2">
              <Label htmlFor="campaign_type">Campaign Type *</Label>
              <Select
                value={formData.campaign_type}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    campaign_type: value as CampaignType,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="drip">
                    Drip Campaign
                    <span className="text-xs text-muted-foreground block">
                      Time-based email/SMS sequences
                    </span>
                  </SelectItem>
                  <SelectItem value="event">
                    Event-Based
                    <span className="text-xs text-muted-foreground block">
                      Triggered by specific events
                    </span>
                  </SelectItem>
                  <SelectItem value="reengagement">
                    Re-engagement
                    <span className="text-xs text-muted-foreground block">
                      Re-engage inactive contacts
                    </span>
                  </SelectItem>
                  <SelectItem value="retention">
                    Retention
                    <span className="text-xs text-muted-foreground block">
                      Keep active customers engaged
                    </span>
                  </SelectItem>
                  <SelectItem value="nurture">
                    Nurture
                    <span className="text-xs text-muted-foreground block">
                      Long-term relationship building
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Goal Type */}
            <div className="space-y-2">
              <Label htmlFor="goal_type">Goal Type (Optional)</Label>
              <Select
                value={formData.goal_type || 'none'}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    goal_type: value === 'none' ? undefined : (value as GoalType),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a goal..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific goal</SelectItem>
                  <SelectItem value="appointments">Appointments Scheduled</SelectItem>
                  <SelectItem value="deals">Deals Closed</SelectItem>
                  <SelectItem value="reviews">Reviews Collected</SelectItem>
                  <SelectItem value="engagement">Contact Engagement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Goal Target */}
            {formData.goal_type && (
              <div className="space-y-2">
                <Label htmlFor="goal_target">Goal Target</Label>
                <Input
                  id="goal_target"
                  type="number"
                  min="1"
                  value={formData.goal_target || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      goal_target: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="e.g., 50"
                />
                <p className="text-xs text-muted-foreground">
                  Number of {formData.goal_type} you want to achieve
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !formData.name}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Campaign'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

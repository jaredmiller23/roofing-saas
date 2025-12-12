'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Gift,
  Plus,
  Trash2,
  CheckCircle,
  DollarSign,
  CreditCard,
  Calendar as CalendarIcon,
  Package
} from 'lucide-react'
import { RewardFormDialog } from './dialogs/RewardFormDialog'
import type { RewardConfigDB } from '@/lib/gamification/types'

// Pre-built reward templates
const REWARD_TEMPLATES = [
  {
    id: 'gift-card-25',
    name: '$25 Gift Card',
    description: 'Amazon or Visa gift card',
    reward_type: 'gift_card' as const,
    points_required: 500,
    reward_value: '$25',
    quantity_available: 10,
    icon: CreditCard,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    id: 'gift-card-50',
    name: '$50 Gift Card',
    description: 'Amazon or Visa gift card',
    reward_type: 'gift_card' as const,
    points_required: 1000,
    reward_value: '$50',
    quantity_available: 5,
    icon: CreditCard,
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    id: 'bonus-100',
    name: '$100 Cash Bonus',
    description: 'Added to next paycheck',
    reward_type: 'bonus' as const,
    points_required: 2000,
    reward_value: '$100',
    quantity_available: 3,
    icon: DollarSign,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50'
  },
  {
    id: 'pto-day',
    name: 'Extra PTO Day',
    description: 'One additional paid day off',
    reward_type: 'time_off' as const,
    points_required: 1500,
    reward_value: '1 day',
    quantity_available: 10,
    icon: CalendarIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    id: 'prize-hoodie',
    name: 'Company Hoodie',
    description: 'Premium branded hoodie',
    reward_type: 'prize' as const,
    points_required: 300,
    reward_value: 'Premium Hoodie',
    quantity_available: 20,
    icon: Package,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50'
  },
  {
    id: 'prize-hat',
    name: 'Company Hat',
    description: 'Branded trucker cap',
    reward_type: 'prize' as const,
    points_required: 150,
    reward_value: 'Trucker Cap',
    quantity_available: 50,
    icon: Package,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50'
  }
]

export function RewardsTab() {
  const [rewards, setRewards] = useState<RewardConfigDB[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingReward, setEditingReward] = useState<RewardConfigDB | null>(null)

  const fetchRewards = useCallback(async () => {
    try {
      const response = await fetch('/api/gamification/rewards')
      if (response.ok) {
        const result = await response.json()
        setRewards(result.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch rewards:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRewards()
  }, [fetchRewards])

  const toggleReward = async (rewardId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/gamification/rewards/${rewardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive })
      })
      if (response.ok) {
        setRewards(prev => prev.map(r =>
          r.id === rewardId ? { ...r, is_active: isActive } : r
        ))
      }
    } catch (error) {
      console.error('Failed to toggle reward:', error)
    }
  }

  const createFromTemplate = async (template: typeof REWARD_TEMPLATES[0]) => {
    setCreating(template.id)
    try {
      const response = await fetch('/api/gamification/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          reward_type: template.reward_type,
          points_required: template.points_required,
          reward_value: template.reward_value,
          quantity_available: template.quantity_available,
          is_active: true
        })
      })
      if (response.ok) {
        await fetchRewards()
      }
    } catch (error) {
      console.error('Failed to create reward:', error)
    } finally {
      setCreating(null)
    }
  }

  const deleteReward = async (rewardId: string) => {
    if (!confirm('Are you sure you want to delete this reward?')) return

    try {
      const response = await fetch(`/api/gamification/rewards/${rewardId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setRewards(prev => prev.filter(r => r.id !== rewardId))
      }
    } catch (error) {
      console.error('Failed to delete reward:', error)
    }
  }

  const isTemplateCreated = (name: string) => {
    return rewards.some(r => r.name === name)
  }

  const handleSaveReward = async () => {
    await fetchRewards()
    setDialogOpen(false)
    setEditingReward(null)
  }

  // Group rewards by type
  const rewardsByType = rewards.reduce((acc, reward) => {
    const type = reward.reward_type
    if (!acc[type]) acc[type] = []
    acc[type].push(reward)
    return acc
  }, {} as Record<string, RewardConfigDB[]>)

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      bonus: 'Cash Bonuses',
      gift_card: 'Gift Cards',
      time_off: 'Time Off',
      prize: 'Prizes'
    }
    return labels[type] || type
  }

  return (
    <div className="space-y-6">
      {/* Quick Start Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reward Catalog Templates</CardTitle>
          <CardDescription>
            One-click setup for popular rewards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {REWARD_TEMPLATES.map(template => {
              const Icon = template.icon
              const isCreated = isTemplateCreated(template.name)

              return (
                <div
                  key={template.id}
                  className={`p-4 rounded-lg border ${template.bgColor} border`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-card ${template.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground text-sm">{template.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {template.points_required} pts
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {template.quantity_available} available
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-3"
                    variant={isCreated ? 'outline' : 'default'}
                    disabled={isCreated || creating === template.id}
                    onClick={() => createFromTemplate(template)}
                  >
                    {creating === template.id ? (
                      'Adding...'
                    ) : isCreated ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Added
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Reward
                      </>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Custom Reward Button */}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={() => {
              setEditingReward(null)
              setDialogOpen(true)
            }}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Custom Reward
          </Button>
        </CardContent>
      </Card>

      {/* Reward Catalog */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Reward Catalog</CardTitle>
              <CardDescription>
                {rewards.length} reward{rewards.length !== 1 ? 's' : ''} available
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading rewards...</div>
          ) : rewards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Gift className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No rewards yet</p>
              <p className="text-sm mt-1">Use the templates above to get started</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(rewardsByType).map(([type, typeRewards]) => (
                <div key={type}>
                  <h4 className="font-medium text-sm text-muted-foreground mb-3">{getTypeLabel(type)}</h4>
                  <div className="space-y-2">
                    {typeRewards.map(reward => {
                      const remaining = (reward.quantity_available || Infinity) - reward.quantity_claimed
                      const isAvailable = remaining > 0 || reward.quantity_available === null

                      return (
                        <div
                          key={reward.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                        >
                          <div className="flex items-center gap-4">
                            <Switch
                              checked={reward.is_active}
                              onCheckedChange={(checked: boolean) => toggleReward(reward.id, checked)}
                            />
                            <div>
                              <h4 className="font-medium text-foreground">{reward.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {reward.points_required} points
                                </Badge>
                                {reward.quantity_available && (
                                  <Badge variant={isAvailable ? 'secondary' : 'destructive'} className="text-xs">
                                    {remaining} left
                                  </Badge>
                                )}
                                {reward.is_active ? (
                                  <span className="text-xs text-green-600">Active</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Inactive</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteReward(reward.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <RewardFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        reward={editingReward}
        onSave={handleSaveReward}
      />
    </div>
  )
}

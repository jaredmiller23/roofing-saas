'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Award,
  Plus,
  Trash2,
  CheckCircle,
  Trophy,
  Star,
  Zap,
  Crown,
  Target,
  TrendingUp,
  Flame,
  Medal
} from 'lucide-react'
import { AchievementFormDialog } from './dialogs/AchievementFormDialog'
import type { AchievementConfigDB } from '@/lib/gamification/types'

// Pre-built achievement templates
const ACHIEVEMENT_TEMPLATES = [
  {
    id: 'first-contact',
    name: 'First Contact',
    description: 'Create your first contact',
    icon: '🎯',
    requirement_type: 'count' as const,
    requirement_value: 1,
    requirement_config: { metric: 'contacts_created' },
    points_reward: 10,
    tier: 'bronze' as const,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    iconComponent: Target
  },
  {
    id: 'deal-maker',
    name: 'Deal Maker',
    description: 'Win your first project',
    icon: '🏆',
    requirement_type: 'count' as const,
    requirement_value: 1,
    requirement_config: { metric: 'projects_won' },
    points_reward: 50,
    tier: 'silver' as const,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    iconComponent: Trophy
  },
  {
    id: 'sales-star',
    name: 'Sales Star',
    description: 'Win 10 projects',
    icon: '⭐',
    requirement_type: 'count' as const,
    requirement_value: 10,
    requirement_config: { metric: 'projects_won' },
    points_reward: 200,
    tier: 'gold' as const,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    iconComponent: Star
  },
  {
    id: 'sales-legend',
    name: 'Sales Legend',
    description: 'Win 50 projects',
    icon: '👑',
    requirement_type: 'count' as const,
    requirement_value: 50,
    requirement_config: { metric: 'projects_won' },
    points_reward: 500,
    tier: 'platinum' as const,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    iconComponent: Crown
  },
  {
    id: 'point-collector',
    name: 'Point Collector',
    description: 'Earn 1,000 points',
    icon: '💎',
    requirement_type: 'points' as const,
    requirement_value: 1000,
    points_reward: 50,
    tier: 'bronze' as const,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    iconComponent: Zap
  },
  {
    id: 'point-master',
    name: 'Point Master',
    description: 'Earn 10,000 points',
    icon: '💫',
    requirement_type: 'points' as const,
    requirement_value: 10000,
    points_reward: 250,
    tier: 'gold' as const,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    iconComponent: Medal
  },
  {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Log activity before 8 AM',
    icon: '🌅',
    requirement_type: 'count' as const,
    requirement_value: 1,
    requirement_config: { metric: 'early_activities' },
    points_reward: 15,
    tier: 'bronze' as const,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    iconComponent: TrendingUp
  },
  {
    id: 'streak-master',
    name: 'Streak Master',
    description: 'Maintain a 7-day activity streak',
    icon: '🔥',
    requirement_type: 'streak' as const,
    requirement_value: 7,
    points_reward: 100,
    tier: 'silver' as const,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    iconComponent: Flame
  }
]

export function AchievementsTab() {
  const [achievements, setAchievements] = useState<AchievementConfigDB[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAchievement, setEditingAchievement] = useState<AchievementConfigDB | null>(null)

  const fetchAchievements = useCallback(async () => {
    try {
      const response = await fetch('/api/gamification/achievements')
      if (response.ok) {
        const result = await response.json()
        setAchievements(result.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch achievements:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAchievements()
  }, [fetchAchievements])

  const toggleAchievement = async (achievementId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/gamification/achievements/${achievementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive })
      })
      if (response.ok) {
        setAchievements(prev => prev.map(a =>
          a.id === achievementId ? { ...a, is_active: isActive } : a
        ))
      }
    } catch (error) {
      console.error('Failed to toggle achievement:', error)
    }
  }

  const createFromTemplate = async (template: typeof ACHIEVEMENT_TEMPLATES[0]) => {
    setCreating(template.id)
    try {
      const response = await fetch('/api/gamification/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          icon: template.icon,
          requirement_type: template.requirement_type,
          requirement_value: template.requirement_value,
          requirement_config: template.requirement_config,
          points_reward: template.points_reward,
          tier: template.tier,
          is_active: true
        })
      })
      if (response.ok) {
        await fetchAchievements()
      }
    } catch (error) {
      console.error('Failed to create achievement:', error)
    } finally {
      setCreating(null)
    }
  }

  const deleteAchievement = async (achievementId: string) => {
    if (!confirm('Are you sure you want to delete this achievement?')) return

    try {
      const response = await fetch(`/api/gamification/achievements/${achievementId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setAchievements(prev => prev.filter(a => a.id !== achievementId))
      }
    } catch (error) {
      console.error('Failed to delete achievement:', error)
    }
  }

  const isTemplateCreated = (name: string) => {
    return achievements.some(a => a.name === name)
  }

  const handleSaveAchievement = async () => {
    await fetchAchievements()
    setDialogOpen(false)
    setEditingAchievement(null)
  }

  const getTierBadgeVariant = (tier?: string) => {
    switch (tier) {
      case 'platinum': return 'default'
      case 'gold': return 'secondary'
      case 'silver': return 'outline'
      default: return 'outline'
    }
  }

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'platinum': return 'text-purple-600'
      case 'gold': return 'text-yellow-600'
      case 'silver': return 'text-gray-600'
      default: return 'text-orange-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* Quick Start Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Achievement Templates</CardTitle>
          <CardDescription>
            One-click setup for common achievements and badges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {ACHIEVEMENT_TEMPLATES.map(template => {
              const Icon = template.iconComponent
              const isCreated = isTemplateCreated(template.name)

              return (
                <div
                  key={template.id}
                  className={`p-4 rounded-lg border ${template.bgColor} border-gray-200`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className={`p-3 rounded-full bg-white ${template.color} mb-3`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="text-2xl mb-2">{template.icon}</div>
                    <h4 className="font-medium text-foreground text-sm">{template.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant={getTierBadgeVariant(template.tier)} className="text-xs capitalize">
                        {template.tier}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        +{template.points_reward} pts
                      </Badge>
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
                        Add
                      </>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Custom Achievement Button */}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={() => {
              setEditingAchievement(null)
              setDialogOpen(true)
            }}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Custom Achievement
          </Button>
        </CardContent>
      </Card>

      {/* Active Achievements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Your Achievements</CardTitle>
              <CardDescription>
                {achievements.length} achievement{achievements.length !== 1 ? 's' : ''} configured
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading achievements...</div>
          ) : achievements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No achievements yet</p>
              <p className="text-sm mt-1">Use the templates above to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map(achievement => (
                <div
                  key={achievement.id}
                  className="p-4 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-3xl">{achievement.icon || '🏆'}</div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={achievement.is_active}
                        onCheckedChange={(checked: boolean) => toggleAchievement(achievement.id, checked)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        onClick={() => deleteAchievement(achievement.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <h4 className="font-medium text-foreground">{achievement.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{achievement.description}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant={getTierBadgeVariant(achievement.tier || undefined)} className={`text-xs capitalize ${getTierColor(achievement.tier || undefined)}`}>
                      {achievement.tier || 'bronze'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      +{achievement.points_reward} pts
                    </Badge>
                    {achievement.is_active ? (
                      <span className="text-xs text-green-600">Active</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Inactive</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <AchievementFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        achievement={editingAchievement}
        onSave={handleSaveAchievement}
      />
    </div>
  )
}

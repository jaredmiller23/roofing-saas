'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  Trophy,
  Target
} from 'lucide-react'
import { ChallengeFormDialog } from './dialogs/ChallengeFormDialog'
import type { ChallengeConfigDB } from '@/lib/gamification/types'
import { format, isAfter, isBefore } from 'date-fns'

// Pre-built challenge templates
const CHALLENGE_TEMPLATES = [
  {
    id: 'weekly-doors',
    title: 'Weekly Door Knocking Challenge',
    description: 'Knock on 100 doors this week',
    challenge_type: 'weekly' as const,
    goal_metric: 'doors_knocked',
    goal_value: 100,
    reward_type: 'points' as const,
    reward_points: 150,
    reward_description: '',
    duration_days: 7,
    icon: '🚪',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    id: 'monthly-sales',
    name: 'Monthly Sales Sprint',
    title: 'Monthly Sales Sprint',
    description: 'Close 5 deals this month',
    challenge_type: 'monthly' as const,
    goal_metric: 'deals_closed',
    goal_value: 5,
    reward_type: 'both' as const,
    reward_points: 500,
    reward_description: '$100 bonus',
    duration_days: 30,
    icon: '💰',
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    id: 'daily-calls',
    title: 'Daily Call Blitz',
    description: 'Make 20 calls today',
    challenge_type: 'daily' as const,
    goal_metric: 'calls_made',
    goal_value: 20,
    reward_type: 'points' as const,
    reward_points: 50,
    reward_description: '',
    duration_days: 1,
    icon: '📞',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    id: 'photo-challenge',
    title: 'Photo Documentation Challenge',
    description: 'Upload 50 property photos this week',
    challenge_type: 'weekly' as const,
    goal_metric: 'photos_uploaded',
    goal_value: 50,
    reward_type: 'points' as const,
    reward_points: 100,
    reward_description: '',
    duration_days: 7,
    icon: '📸',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50'
  }
]

export function ChallengesTab() {
  const [challenges, setChallenges] = useState<ChallengeConfigDB[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChallenge, setEditingChallenge] = useState<ChallengeConfigDB | null>(null)

  const fetchChallenges = useCallback(async () => {
    try {
      const response = await fetch('/api/gamification/challenges')
      if (response.ok) {
        const result = await response.json()
        setChallenges(result.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch challenges:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchChallenges()
  }, [fetchChallenges])

  const toggleChallenge = async (challengeId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/gamification/challenges/${challengeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive })
      })
      if (response.ok) {
        setChallenges(prev => prev.map(c =>
          c.id === challengeId ? { ...c, is_active: isActive } : c
        ))
      }
    } catch (error) {
      console.error('Failed to toggle challenge:', error)
    }
  }

  const createFromTemplate = async (template: typeof CHALLENGE_TEMPLATES[0]) => {
    setCreating(template.id)
    try {
      const startDate = new Date()
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + template.duration_days)

      const response = await fetch('/api/gamification/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: template.title,
          description: template.description,
          challenge_type: template.challenge_type,
          goal_metric: template.goal_metric,
          goal_value: template.goal_value,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          reward_type: template.reward_type,
          reward_points: template.reward_points,
          reward_description: template.reward_description,
          is_active: true
        })
      })
      if (response.ok) {
        await fetchChallenges()
      }
    } catch (error) {
      console.error('Failed to create challenge:', error)
    } finally {
      setCreating(null)
    }
  }

  const deleteChallenge = async (challengeId: string) => {
    if (!confirm('Are you sure you want to delete this challenge?')) return

    try {
      const response = await fetch(`/api/gamification/challenges/${challengeId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setChallenges(prev => prev.filter(c => c.id !== challengeId))
      }
    } catch (error) {
      console.error('Failed to delete challenge:', error)
    }
  }

  const handleSaveChallenge = async () => {
    await fetchChallenges()
    setDialogOpen(false)
    setEditingChallenge(null)
  }

  const getChallengeStatus = (challenge: ChallengeConfigDB) => {
    const now = new Date()
    const start = new Date(challenge.start_date)
    const end = new Date(challenge.end_date)

    if (isBefore(now, start)) return 'upcoming'
    if (isAfter(now, end)) return 'completed'
    return 'active'
  }

  // Group challenges by status
  const activeChallenges = challenges.filter(c => c.is_active && getChallengeStatus(c) === 'active')
  const upcomingChallenges = challenges.filter(c => c.is_active && getChallengeStatus(c) === 'upcoming')
  const completedChallenges = challenges.filter(c => getChallengeStatus(c) === 'completed')

  return (
    <div className="space-y-6">
      {/* Quick Start Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Challenge Templates</CardTitle>
          <CardDescription>
            One-click setup for time-limited competitions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {CHALLENGE_TEMPLATES.map(template => (
              <div
                key={template.id}
                className={`p-4 rounded-lg border ${template.bgColor} border`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="text-3xl mb-2">{template.icon}</div>
                  <h4 className="font-medium text-foreground text-sm">{template.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="outline" className="text-xs capitalize">
                      {template.challenge_type}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {template.reward_points} pts
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full mt-3"
                  disabled={creating === template.id}
                  onClick={() => createFromTemplate(template)}
                >
                  {creating === template.id ? (
                    'Creating...'
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" />
                      Start Challenge
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Challenge Button */}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={() => {
              setEditingChallenge(null)
              setDialogOpen(true)
            }}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Custom Challenge
          </Button>
        </CardContent>
      </Card>

      {/* Active Challenges */}
      {activeChallenges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Challenges</CardTitle>
            <CardDescription>Currently running competitions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeChallenges.map(challenge => (
                <div
                  key={challenge.id}
                  className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200"
                >
                  <div className="flex items-center gap-4">
                    <Switch
                      checked={challenge.is_active}
                      onCheckedChange={(checked: boolean) => toggleChallenge(challenge.id, checked)}
                    />
                    <div>
                      <h4 className="font-medium text-foreground">{challenge.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs capitalize">
                          {challenge.challenge_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Ends {format(new Date(challenge.end_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => deleteChallenge(challenge.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Challenges */}
      {upcomingChallenges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Challenges</CardTitle>
            <CardDescription>Scheduled to start soon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingChallenges.map(challenge => (
                <div
                  key={challenge.id}
                  className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <div className="flex items-center gap-4">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="font-medium text-foreground">{challenge.title}</h4>
                      <span className="text-xs text-muted-foreground">
                        Starts {format(new Date(challenge.start_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => deleteChallenge(challenge.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Challenges Fallback */}
      {loading ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">Loading challenges...</div>
          </CardContent>
        </Card>
      ) : challenges.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No challenges yet</p>
              <p className="text-sm mt-1">Use the templates above to get started</p>
            </div>
          </CardContent>
        </Card>
      ) : activeChallenges.length === 0 && upcomingChallenges.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No active or upcoming challenges</p>
              <p className="text-sm mt-1">{completedChallenges.length} completed</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Dialog */}
      <ChallengeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        challenge={editingChallenge}
        onSave={handleSaveChallenge}
      />
    </div>
  )
}

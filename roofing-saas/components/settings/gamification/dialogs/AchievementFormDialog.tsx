'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { achievementConfigSchema, type AchievementConfig, type AchievementConfigDB } from '@/lib/gamification/types'

interface AchievementFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  achievement?: AchievementConfigDB | null
  onSave: () => void
}

export function AchievementFormDialog({ open, onOpenChange, achievement, onSave }: AchievementFormDialogProps) {
  const form = useForm({
    resolver: zodResolver(achievementConfigSchema),
    defaultValues: {
      name: '',
      description: '',
      icon: '🏆',
      requirement_type: 'points' as const,
      requirement_value: 100,
      requirement_config: undefined,
      custom_sql: undefined,
      points_reward: 50,
      tier: 'bronze' as const,
      is_active: true,
    },
  })

  useEffect(() => {
    if (achievement) {
      form.reset({
        name: achievement.name,
        description: achievement.description || '',
        icon: achievement.icon || '🏆',
        requirement_type: achievement.requirement_type,
        requirement_value: achievement.requirement_value || 100,
        requirement_config: achievement.requirement_config || undefined,
        custom_sql: achievement.custom_sql || undefined,
        points_reward: achievement.points_reward,
        tier: achievement.tier || 'bronze',
        is_active: achievement.is_active,
      })
    } else {
      form.reset({
        name: '',
        description: '',
        icon: '🏆',
        requirement_type: 'points',
        requirement_value: 100,
        requirement_config: undefined,
        custom_sql: undefined,
        points_reward: 50,
        tier: 'bronze',
        is_active: true,
      })
    }
  }, [achievement, form])

  const onSubmit = async (data: AchievementConfig) => {
    try {
      const url = achievement
        ? `/api/gamification/achievements/${achievement.id}`
        : '/api/gamification/achievements'
      const method = achievement ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        onSave()
        form.reset()
      } else {
        const error = await response.json()
        console.error('Failed to save achievement:', error)
      }
    } catch (error) {
      console.error('Failed to save achievement:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{achievement ? 'Edit Achievement' : 'Create Achievement'}</DialogTitle>
          <DialogDescription>
            Define a badge that users can unlock
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., First Sale" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="e.g., Win your first project" rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon (Emoji)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="🏆" maxLength={4} />
                  </FormControl>
                  <FormDescription>
                    Single emoji to represent this achievement
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="requirement_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requirement Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="points">Points</SelectItem>
                        <SelectItem value="count">Count</SelectItem>
                        <SelectItem value="streak">Streak</SelectItem>
                        <SelectItem value="custom_sql">Custom SQL</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requirement_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Value</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tier</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bronze">🥉 Bronze</SelectItem>
                        <SelectItem value="silver">🥈 Silver</SelectItem>
                        <SelectItem value="gold">🥇 Gold</SelectItem>
                        <SelectItem value="platinum">💎 Platinum</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="points_reward"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points Reward</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      Enable this achievement immediately
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                {achievement ? 'Update' : 'Create'} Achievement
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

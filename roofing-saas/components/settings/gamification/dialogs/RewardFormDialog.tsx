'use client'

import { useEffect } from 'react'
import { apiFetch } from '@/lib/api/client'
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
import { rewardConfigSchema, type RewardConfig, type RewardConfigDB } from '@/lib/gamification/types'

interface RewardFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reward?: RewardConfigDB | null
  onSave: () => void
}

export function RewardFormDialog({ open, onOpenChange, reward, onSave }: RewardFormDialogProps) {
  const form = useForm({
    resolver: zodResolver(rewardConfigSchema),
    defaultValues: {
      name: '',
      description: '',
      reward_type: 'gift_card' as const,
      points_required: 500,
      reward_value: '$25',
      quantity_available: 10,
      is_active: true,
    },
  })

  useEffect(() => {
    if (reward) {
      form.reset({
        name: reward.name,
        description: reward.description || '',
        reward_type: reward.reward_type,
        points_required: reward.points_required,
        reward_value: reward.reward_value,
        quantity_available: reward.quantity_available || undefined,
        is_active: reward.is_active,
      })
    } else {
      form.reset({
        name: '',
        description: '',
        reward_type: 'gift_card',
        points_required: 500,
        reward_value: '$25',
        quantity_available: 10,
        is_active: true,
      })
    }
  }, [reward, form])

  const onSubmit = async (data: RewardConfig) => {
    try {
      const url = reward
        ? `/api/gamification/rewards/${reward.id}`
        : '/api/gamification/rewards'
      const method = reward ? 'PATCH' : 'POST'

      await apiFetch(url, { method, body: data })
      onSave()
      form.reset()
    } catch (error) {
      console.error('Failed to save reward:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{reward ? 'Edit Reward' : 'Create Reward'}</DialogTitle>
          <DialogDescription>
            Define a reward that users can claim with points
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
                    <Input {...field} placeholder="e.g., $25 Gift Card" />
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
                    <Textarea {...field} placeholder="e.g., Amazon or Visa gift card" rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reward_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reward Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bonus">💵 Cash Bonus</SelectItem>
                      <SelectItem value="gift_card">🎁 Gift Card</SelectItem>
                      <SelectItem value="time_off">🏖️ Time Off</SelectItem>
                      <SelectItem value="prize">🎉 Prize</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="points_required"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points Required</FormLabel>
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

              <FormField
                control={form.control}
                name="quantity_available"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity Available</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        placeholder="Unlimited"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      Leave empty for unlimited
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reward_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reward Value</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., $25, 1 day, Premium Hoodie" />
                  </FormControl>
                  <FormDescription>
                    Dollar amount, quantity, or description
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      Make this reward available immediately
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
                {reward ? 'Update' : 'Create'} Reward
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { pointRuleConfigSchema, type PointRuleConfig, type PointRuleConfigDB } from '@/lib/gamification/types'

interface PointRuleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule?: PointRuleConfigDB | null
  onSave: () => void
}

export function PointRuleFormDialog({ open, onOpenChange, rule, onSave }: PointRuleFormDialogProps) {
  const form = useForm({
    resolver: zodResolver(pointRuleConfigSchema),
    defaultValues: {
      action_type: '',
      action_name: '',
      points_value: 10,
      category: '',
      is_active: true,
    },
  })

  useEffect(() => {
    if (rule) {
      form.reset({
        action_type: rule.action_type,
        action_name: rule.action_name,
        points_value: rule.points_value,
        category: rule.category || '',
        is_active: rule.is_active,
      })
    } else {
      form.reset({
        action_type: '',
        action_name: '',
        points_value: 10,
        category: '',
        is_active: true,
      })
    }
  }, [rule, form])

  const onSubmit = async (data: PointRuleConfig) => {
    try {
      const url = rule
        ? `/api/gamification/point-rules/${rule.id}`
        : '/api/gamification/point-rules'
      const method = rule ? 'PATCH' : 'POST'

      await apiFetch(url, { method, body: data })
      onSave()
      form.reset()
    } catch (error) {
      console.error('Failed to save point rule:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit Point Rule' : 'Create Point Rule'}</DialogTitle>
          <DialogDescription>
            Define a custom action and how many points it awards
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="action_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Action Type</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., ROOF_INSPECTION"
                      className="uppercase"
                    />
                  </FormControl>
                  <FormDescription>
                    Unique identifier for this action (UPPERCASE_SNAKE_CASE)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="action_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Roof Inspection" />
                  </FormControl>
                  <FormDescription>
                    Friendly name shown to users
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="points_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Points Value</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min="1"
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    How many points to award for this action
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Sales, Field Work" />
                  </FormControl>
                  <FormDescription>
                    Group related actions together
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
                      Enable this point rule immediately
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
                {rule ? 'Update' : 'Create'} Rule
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

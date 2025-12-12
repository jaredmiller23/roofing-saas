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
import { kpiDefinitionSchema, type KpiDefinition, type KpiDefinitionDB } from '@/lib/gamification/types'

interface KpiFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kpi?: KpiDefinitionDB | null
  onSave: () => void
}

export function KpiFormDialog({ open, onOpenChange, kpi, onSave }: KpiFormDialogProps) {
  const form = useForm({
    resolver: zodResolver(kpiDefinitionSchema),
    defaultValues: {
      name: '',
      description: '',
      calculation_type: 'sql_query' as const,
      calculation_config: {},
      format_type: 'number' as const,
      target_value: undefined,
      frequency: 'daily' as const,
      is_active: true,
    },
  })

  useEffect(() => {
    if (kpi) {
      form.reset({
        name: kpi.name,
        description: kpi.description || '',
        calculation_type: kpi.calculation_type,
        calculation_config: kpi.calculation_config,
        format_type: kpi.format_type,
        target_value: kpi.target_value || undefined,
        frequency: kpi.frequency,
        is_active: kpi.is_active,
      })
    } else {
      form.reset({
        name: '',
        description: '',
        calculation_type: 'sql_query',
        calculation_config: {},
        format_type: 'number',
        target_value: undefined,
        frequency: 'daily',
        is_active: true,
      })
    }
  }, [kpi, form])

  const onSubmit = async (data: KpiDefinition) => {
    try {
      const url = kpi
        ? `/api/gamification/kpis/${kpi.id}`
        : '/api/gamification/kpis'
      const method = kpi ? 'PATCH' : 'POST'

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
        console.error('Failed to save KPI:', error)
      }
    } catch (error) {
      console.error('Failed to save KPI:', error)
    }
  }

  const calculationType = form.watch('calculation_type')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{kpi ? 'Edit KPI' : 'Create Custom KPI'}</DialogTitle>
          <DialogDescription>
            Define a metric to track performance
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
                    <Input {...field} placeholder="e.g., Average Response Time" />
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
                    <Textarea {...field} placeholder="What does this metric measure?" rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="calculation_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calculation Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sql_query">SQL Query</SelectItem>
                        <SelectItem value="aggregation">Aggregation</SelectItem>
                        <SelectItem value="formula">Formula</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {calculationType === 'sql_query' && (
              <FormItem>
                <FormLabel>SQL Query</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="SELECT COUNT(*) FROM contacts WHERE created_at >= CURRENT_DATE"
                    rows={4}
                    className="font-mono text-sm"
                    onChange={(e) => {
                      form.setValue('calculation_config', { query: e.target.value })
                    }}
                    defaultValue={(form.getValues('calculation_config') as { query?: string })?.query || ''}
                  />
                </FormControl>
                <FormDescription>
                  SQL query to calculate this metric (read-only access)
                </FormDescription>
              </FormItem>
            )}

            {calculationType === 'aggregation' && (
              <div className="space-y-4">
                <FormItem>
                  <FormLabel>Table</FormLabel>
                  <Input
                    placeholder="e.g., contacts"
                    onChange={(e) => {
                      const config = form.getValues('calculation_config') as Record<string, unknown>
                      form.setValue('calculation_config', { ...config, table: e.target.value })
                    }}
                    defaultValue={(form.getValues('calculation_config') as { table?: string })?.table || ''}
                  />
                </FormItem>
                <div className="grid grid-cols-2 gap-4">
                  <FormItem>
                    <FormLabel>Aggregation</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        const config = form.getValues('calculation_config') as Record<string, unknown>
                        form.setValue('calculation_config', { ...config, aggregation: value })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="count">COUNT</SelectItem>
                        <SelectItem value="sum">SUM</SelectItem>
                        <SelectItem value="avg">AVG</SelectItem>
                        <SelectItem value="min">MIN</SelectItem>
                        <SelectItem value="max">MAX</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                  <FormItem>
                    <FormLabel>Column</FormLabel>
                    <Input
                      placeholder="e.g., id or amount"
                      onChange={(e) => {
                        const config = form.getValues('calculation_config') as Record<string, unknown>
                        form.setValue('calculation_config', { ...config, column: e.target.value })
                      }}
                      defaultValue={(form.getValues('calculation_config') as { column?: string })?.column || ''}
                    />
                  </FormItem>
                </div>
              </div>
            )}

            {calculationType === 'formula' && (
              <FormItem>
                <FormLabel>Formula</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., (completed / total) * 100"
                    onChange={(e) => {
                      form.setValue('calculation_config', { formula: e.target.value })
                    }}
                    defaultValue={(form.getValues('calculation_config') as { formula?: string })?.formula || ''}
                  />
                </FormControl>
                <FormDescription>
                  Mathematical formula using variables
                </FormDescription>
              </FormItem>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="format_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Format Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="currency">Currency</SelectItem>
                        <SelectItem value="duration">Duration</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="target_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Value (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="Goal to reach"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
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
                      Start calculating this KPI immediately
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
                {kpi ? 'Update' : 'Create'} KPI
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import type { Warranty, WarrantyType, WarrantyStatus } from '@/lib/types/warranty'
import { WARRANTY_TYPES, WARRANTY_STATUSES } from '@/lib/types/warranty'

const warrantyFormSchema = z.object({
  project_id: z.string().uuid('Please select a project'),
  warranty_type: z.enum(['manufacturer', 'workmanship', 'material', 'extended'] as const),
  provider: z.string().optional(),
  duration_years: z.number().int().min(1, 'Duration must be at least 1 year'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  terms: z.string().optional(),
  document_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  status: z.enum(['active', 'expired', 'claimed', 'voided'] as const),
})

type WarrantyFormData = z.infer<typeof warrantyFormSchema>

interface Project {
  id: string
  name: string
}

interface WarrantyFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  warranty?: Warranty | null
  projectId?: string
}

export function WarrantyForm({
  open,
  onOpenChange,
  onSuccess,
  warranty,
  projectId,
}: WarrantyFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)

  const isEditing = !!warranty

  const form = useForm<WarrantyFormData>({
    resolver: zodResolver(warrantyFormSchema),
    defaultValues: {
      project_id: warranty?.project_id ?? projectId ?? '',
      warranty_type: (warranty?.warranty_type ?? 'manufacturer') as WarrantyType,
      provider: warranty?.provider ?? '',
      duration_years: warranty?.duration_years ?? 1,
      start_date: warranty?.start_date ?? '',
      end_date: warranty?.end_date ?? '',
      terms: warranty?.terms ?? '',
      document_url: warranty?.document_url ?? '',
      status: (warranty?.status ?? 'active') as WarrantyStatus,
    },
  })

  // Auto-calculate end date when start_date or duration_years change
  const startDate = form.watch('start_date')
  const durationYears = form.watch('duration_years')

  useEffect(() => {
    if (startDate && durationYears && durationYears > 0) {
      const start = new Date(startDate + 'T00:00:00')
      if (!isNaN(start.getTime())) {
        const end = new Date(start)
        end.setFullYear(end.getFullYear() + durationYears)
        const endStr = end.toISOString().split('T')[0]
        form.setValue('end_date', endStr)
      }
    }
  }, [startDate, durationYears, form])

  // Reset form when warranty changes (edit vs create)
  useEffect(() => {
    if (open) {
      form.reset({
        project_id: warranty?.project_id ?? projectId ?? '',
        warranty_type: (warranty?.warranty_type ?? 'manufacturer') as WarrantyType,
        provider: warranty?.provider ?? '',
        duration_years: warranty?.duration_years ?? 1,
        start_date: warranty?.start_date ?? '',
        end_date: warranty?.end_date ?? '',
        terms: warranty?.terms ?? '',
        document_url: warranty?.document_url ?? '',
        status: (warranty?.status ?? 'active') as WarrantyStatus,
      })
    }
  }, [open, warranty, projectId, form])

  // Fetch projects for the dropdown (only when not pre-set)
  useEffect(() => {
    if (!projectId && open) {
      fetchProjects()
    }
  }, [projectId, open])

  async function fetchProjects() {
    try {
      setLoadingProjects(true)
      const data = await apiFetch<{ data: Project[] }>('/api/projects?limit=200')
      // The response may be wrapped differently depending on the route
      if (Array.isArray(data)) {
        setProjects(data as unknown as Project[])
      } else if (data && typeof data === 'object' && 'data' in data) {
        setProjects((data as { data: Project[] }).data)
      }
    } catch {
      // Silently fail - user can type the project ID if needed
    } finally {
      setLoadingProjects(false)
    }
  }

  async function handleSubmit(data: WarrantyFormData) {
    setSubmitting(true)
    try {
      if (isEditing && warranty) {
        await apiFetch(`/api/warranties/${warranty.id}`, {
          method: 'PATCH',
          body: {
            warranty_type: data.warranty_type,
            provider: data.provider || null,
            duration_years: data.duration_years,
            start_date: data.start_date,
            end_date: data.end_date,
            terms: data.terms || null,
            document_url: data.document_url || null,
            status: data.status,
          },
        })
        toast.success('Warranty updated')
      } else {
        await apiFetch('/api/warranties', {
          method: 'POST',
          body: {
            project_id: data.project_id,
            warranty_type: data.warranty_type,
            provider: data.provider || null,
            duration_years: data.duration_years,
            start_date: data.start_date,
            end_date: data.end_date,
            terms: data.terms || null,
            document_url: data.document_url || null,
            status: data.status,
          },
        })
        toast.success('Warranty created')
      }

      form.reset()
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save warranty')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Warranty' : 'Add Warranty'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the warranty details below.'
              : 'Track a new warranty for a project.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Project Selector - only shown if no projectId is pre-set */}
            {!projectId && (
              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isEditing}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingProjects ? 'Loading...' : 'Select a project'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Warranty Type */}
            <FormField
              control={form.control}
              name="warranty_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Warranty Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {WARRANTY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Provider */}
            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider / Manufacturer</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., GAF, Owens Corning, CertainTeed"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Duration & Dates */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="duration_years"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (Years)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {WARRANTY_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Terms */}
            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terms &amp; Conditions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Warranty terms, conditions, and coverage details..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Document URL */}
            <FormField
              control={form.control}
              name="document_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/warranty-doc.pdf"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Update Warranty' : 'Create Warranty'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

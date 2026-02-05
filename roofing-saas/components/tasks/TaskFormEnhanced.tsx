'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from '@/lib/i18n/navigation'
import { useForm, Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createTaskSchema, type CreateTaskInput } from '@/lib/validations/task'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle,
  Calendar,
  Clock,
  User,
  Tag,
  Bell,
  BarChart3
} from 'lucide-react'
import { apiFetch, apiFetchPaginated } from '@/lib/api/client'

interface Task {
  id: string
  title: string
  description: string | null
  priority: string | null
  status: string | null
  due_date: string | null
  start_date: string | null
  project_id: string | null
  contact_id: string | null
  assigned_to: string | null
  parent_task_id: string | null
  progress: number | null
  estimated_hours: number | null
  actual_hours: number | null
  tags: string[] | null
  reminder_enabled: boolean | null
  reminder_date: string | null
  [key: string]: unknown
}

interface TaskFormProps {
  task?: Task
}

// Clean form data before Zod validation
// Converts NaN from empty number inputs to undefined, empty strings to null for UUID fields
function cleanFormData(data: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = { ...data }
  const uuidFields = ['project_id', 'contact_id', 'assigned_to', 'parent_task_id']
  for (const key of Object.keys(cleaned)) {
    const value = cleaned[key]
    if (typeof value === 'number' && isNaN(value)) {
      cleaned[key] = undefined
    }
    if (uuidFields.includes(key) && value === '') {
      cleaned[key] = null
    }
    // Empty date strings → null
    if ((key === 'due_date' || key === 'start_date' || key === 'reminder_date') && value === '') {
      cleaned[key] = null
    }
  }
  return cleaned
}

const taskResolver: Resolver<CreateTaskInput> = async (values, context, options) => {
  const cleanedValues = cleanFormData(values) as CreateTaskInput
  return zodResolver(createTaskSchema)(cleanedValues, context, options)
}

export function TaskFormEnhanced({ task }: TaskFormProps) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [contacts, setContacts] = useState<Array<{ id: string; first_name: string; last_name: string }>>([])
  const [tasks, setTasks] = useState<Array<{ id: string; title: string }>>([])
  const [tagInput, setTagInput] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<CreateTaskInput>({
    resolver: taskResolver,
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      priority: (task?.priority as CreateTaskInput['priority']) || 'medium',
      status: (task?.status as CreateTaskInput['status']) || 'todo',
      due_date: task?.due_date || '',
      start_date: task?.start_date || '',
      project_id: task?.project_id || '',
      contact_id: task?.contact_id || '',
      assigned_to: task?.assigned_to || '',
      parent_task_id: task?.parent_task_id || '',
      progress: task?.progress || 0,
      estimated_hours: task?.estimated_hours || undefined,
      actual_hours: task?.actual_hours || undefined,
      tags: task?.tags || [],
      reminder_enabled: task?.reminder_enabled || false,
      reminder_date: task?.reminder_date || '',
    },
  })

  const tags = watch('tags')
  const reminderEnabled = watch('reminder_enabled')

  const loadData = useCallback(async () => {
    try {
      const [projectsResult, contactsResult, tasksResult] = await Promise.all([
        apiFetchPaginated<Array<{ id: string; name: string }>>('/api/projects?limit=100'),
        apiFetchPaginated<Array<{ id: string; first_name: string; last_name: string }>>('/api/contacts?limit=100'),
        apiFetchPaginated<Array<{ id: string; title: string }>>('/api/tasks?limit=100'),
      ])

      setProjects(projectsResult.data)
      setContacts(contactsResult.data)
      setTasks(tasksResult.data.filter((t) => t.id !== task?.id))
    } catch (err) {
      console.error('Failed to load data:', err)
    }
  }, [task?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const onSubmit = async (data: CreateTaskInput) => {
    setServerError(null)

    try {
      const url = task ? `/api/tasks/${task.id}` : '/api/tasks'
      const method = task ? 'PATCH' : 'POST'

      const payload = {
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        status: data.status,
        due_date: data.due_date || null,
        start_date: data.start_date || null,
        project_id: data.project_id || null,
        contact_id: data.contact_id || null,
        assigned_to: data.assigned_to || null,
        parent_task_id: data.parent_task_id || null,
        progress: data.progress || 0,
        estimated_hours: data.estimated_hours || null,
        actual_hours: data.actual_hours || null,
        tags: data.tags,
        reminder_enabled: data.reminder_enabled,
        reminder_date: data.reminder_date || null,
      }

      await apiFetch(url, {
        method,
        body: payload,
      })

      router.push('/tasks')
      router.refresh()
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setValue('tags', [...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setValue('tags', tags.filter(tag => tag !== tagToRemove))
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <div className="bg-card shadow-sm rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <CheckCircle className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Basic Information</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              {...register('title')}
              placeholder="Enter task title..."
            />
            {errors.title && (
              <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Description
            </label>
            <Textarea
              {...register('description')}
              rows={4}
              placeholder="Describe the task..."
            />
            {errors.description && (
              <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Priority
              </label>
              <select
                {...register('priority')}
                className="w-full px-3 py-2 bg-card text-foreground border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Status
              </label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 bg-card text-foreground border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Progress (%)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  {...register('progress', { valueAsNumber: true })}
                />
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              {errors.progress && (
                <p className="text-sm text-red-500 mt-1">{errors.progress.message}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dates & Time */}
      <div className="bg-card shadow-sm rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Dates & Time Tracking</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Start Date
            </label>
            <Input
              type="date"
              {...register('start_date')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Due Date
            </label>
            <Input
              type="date"
              {...register('due_date')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Estimated Hours
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.5"
                min="0"
                {...register('estimated_hours', { valueAsNumber: true })}
                placeholder="0.0"
              />
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            {errors.estimated_hours && (
              <p className="text-sm text-red-500 mt-1">{errors.estimated_hours.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Actual Hours
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.5"
                min="0"
                {...register('actual_hours', { valueAsNumber: true })}
                placeholder="0.0"
              />
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            {errors.actual_hours && (
              <p className="text-sm text-red-500 mt-1">{errors.actual_hours.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Assignments & Relations */}
      <div className="bg-card shadow-sm rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <User className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Assignments & Relations</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Project
            </label>
            <select
              {...register('project_id')}
              className="w-full px-3 py-2 bg-card text-foreground border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">None</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Contact
            </label>
            <select
              {...register('contact_id')}
              className="w-full px-3 py-2 bg-card text-foreground border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">None</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.first_name} {contact.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Parent Task (Subtask of)
            </label>
            <select
              {...register('parent_task_id')}
              className="w-full px-3 py-2 bg-card text-foreground border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">None</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tags & Reminders */}
      <div className="bg-card shadow-sm rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <Tag className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Tags & Reminders</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add tag and press Enter..."
              />
              <Button type="button" onClick={addTag} variant="outline">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-2"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-primary/80"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="reminder"
              {...register('reminder_enabled')}
              className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
            />
            <label htmlFor="reminder" className="text-sm font-medium text-muted-foreground">
              Enable Reminder
            </label>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </div>

          {reminderEnabled && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Reminder Date
              </label>
              <Input
                type="datetime-local"
                {...register('reminder_date')}
              />
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary hover:bg-primary/90"
        >
          {isSubmitting ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
        </Button>
      </div>
    </form>
  )
}

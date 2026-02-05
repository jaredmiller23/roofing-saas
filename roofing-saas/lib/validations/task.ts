import { z } from 'zod'

/**
 * Zod validation schemas for task data
 *
 * Security note: These schemas ensure clients cannot set server-controlled fields
 * like id, tenant_id, created_by, created_at, etc.
 */

// Task priority enum
const taskPriorityEnum = z.enum(['low', 'medium', 'high'])

// Task status enum
const taskStatusEnum = z.enum(['todo', 'in_progress', 'completed', 'cancelled'])

export const createTaskSchema = z.object({
  // Required field
  title: z.string().min(1, 'Task title is required').max(200),

  // Optional text
  description: z.string().max(5000).optional().nullable(),

  // Enums (defaults set in form defaultValues)
  priority: taskPriorityEnum,
  status: taskStatusEnum,

  // Dates (stored as ISO strings)
  due_date: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),

  // Relations (UUID references)
  project_id: z.string().uuid('Invalid project').optional().nullable(),
  contact_id: z.string().uuid('Invalid contact').optional().nullable(),
  assigned_to: z.string().uuid('Invalid assignee').optional().nullable(),
  parent_task_id: z.string().uuid('Invalid parent task').optional().nullable(),

  // Progress tracking
  progress: z.number().int().min(0).max(100),
  estimated_hours: z.number().positive('Must be positive').optional().nullable(),
  actual_hours: z.number().positive('Must be positive').optional().nullable(),

  // Tags
  tags: z.array(z.string()),

  // Reminders
  reminder_enabled: z.boolean(),
  reminder_date: z.string().optional().nullable(),
})

export const updateTaskSchema = createTaskSchema.partial().extend({
  id: z.string().uuid(),
})

// Type exports
export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>

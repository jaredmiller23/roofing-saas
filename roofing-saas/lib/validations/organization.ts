import { z } from 'zod'

/**
 * Zod validation schemas for organization data
 */

export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(200),
  type: z.enum(['company', 'agency', 'contractor']),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  // Address
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().max(2).optional(),
  address_zip: z.string().max(10).optional(),
  // Additional Details
  industry: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  employee_count: z.number().int().min(1).max(1000000).optional(),
  // Metadata
  tags: z.array(z.string()).optional(),
  custom_fields: z.record(z.string(), z.unknown()).optional(),
})

export const updateOrganizationSchema = createOrganizationSchema.partial().extend({
  id: z.string().uuid(),
})

export const organizationFiltersSchema = z.object({
  search: z.string().optional(),
  type: z.enum(['company', 'agency', 'contractor']).optional(),
  industry: z.string().optional(),
  tags: z.array(z.string()).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(5000).optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
})

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
export type OrganizationFilters = z.infer<typeof organizationFiltersSchema>
import { z } from 'zod'

/**
 * Zod validation schemas for contact data
 */

export const createContactSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  mobile_phone: z.string().optional(),
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().max(2).optional(),
  address_zip: z.string().max(10).optional(),
  type: z.enum(['lead', 'customer', 'prospect']).optional(),
  stage: z.enum([
    'new',
    'contacted',
    'qualified',
    'proposal',
    'negotiation',
    'won',
    'lost',
  ]).optional(),
  source: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
  property_type: z.string().optional(),
  roof_type: z.string().optional(),
  roof_age: z.number().int().min(0).max(200).optional(),
  property_value: z.number().positive().optional(),
  square_footage: z.number().int().positive().optional(),
  stories: z.number().int().min(1).max(10).optional(),
  insurance_carrier: z.string().optional(),
  policy_number: z.string().optional(),
  claim_number: z.string().optional(),
  deductible: z.number().positive().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  tags: z.array(z.string()).optional(),
  custom_fields: z.record(z.string(), z.unknown()).optional(),
})

export const updateContactSchema = createContactSchema.partial().extend({
  id: z.string().uuid(),
})

export const contactFiltersSchema = z.object({
  search: z.string().optional(),
  type: z.enum(['lead', 'customer', 'prospect']).optional(),
  stage: z.enum([
    'new',
    'contacted',
    'qualified',
    'proposal',
    'negotiation',
    'won',
    'lost',
  ]).optional(),
  assigned_to: z.string().uuid().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  tags: z.array(z.string()).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
})

export type CreateContactInput = z.infer<typeof createContactSchema>
export type UpdateContactInput = z.infer<typeof updateContactSchema>
export type ContactFilters = z.infer<typeof contactFiltersSchema>

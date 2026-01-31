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
  // Organization fields
  is_organization: z.boolean().optional(),
  company: z.string().max(200).optional(),
  website: z.string().optional().or(z.literal('')).refine(
    (val) => {
      if (!val || val.trim() === '') return true;
      try {
        new URL(val.startsWith('http') ? val : `https://${val}`);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid URL (e.g., example.com)' }
  ),
  contact_category: z.enum([
    'homeowner',
    'adjuster',
    'insurance_agent',
    'sub_contractor',
    'supplier',
    'real_estate_agent',
    'developer',
    'property_manager',
    'local_business',
    'other',
  ]).optional(),
  // Address
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().max(2).optional(),
  address_zip: z.string().max(10).optional(),
  // Lead management
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
  substatus: z.string().optional(),
  source: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
  // Property details
  property_type: z.string().optional(),
  roof_type: z.string().optional(),
  // Note: NaN values from empty number inputs are handled in form submission
  roof_age: z.number().int().min(0).max(200).optional(),
  property_value: z.number().positive().optional(),
  square_footage: z.number().int().positive().optional(),
  stories: z.number().int().min(1).max(10).optional(),
  // Insurance & Job Details
  insurance_carrier: z.string().optional(),
  policy_number: z.string().optional(),
  claim_number: z.string().optional(),
  deductible: z.number().positive().optional(),
  policy_holder_id: z.string().uuid().optional().nullable(),
  job_type: z.string().optional(),
  // Note: Empty string for customer_type is handled in form submission
  customer_type: z.enum(['insurance', 'retail']).optional(),
  // Communication Consent (TCPA Compliance)
  text_consent: z.boolean().optional(),
  auto_text_consent: z.boolean().optional(),
  auto_call_consent: z.boolean().optional(),
  recording_consent: z.boolean().optional(),
  // Other
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
  contact_category: z.enum([
    'homeowner',
    'adjuster',
    'insurance_agent',
    'sub_contractor',
    'supplier',
    'real_estate_agent',
    'developer',
    'property_manager',
    'local_business',
    'other',
  ]).optional(),
  is_organization: z.boolean().optional(),
  assigned_to: z.string().uuid().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  tags: z.array(z.string()).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(5000).optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
})

export type CreateContactInput = z.infer<typeof createContactSchema>
export type UpdateContactInput = z.infer<typeof updateContactSchema>
export type ContactFilters = z.infer<typeof contactFiltersSchema>

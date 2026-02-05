/**
 * Quote Option Types
 *
 * Types for the multi-option quoting system that allows creating
 * Good/Better/Best proposals for roofing estimates.
 */

export interface QuoteLineItem {
  id: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  total_price: number
  category: 'materials' | 'labor' | 'equipment' | 'permits' | 'other'
}

export interface QuoteOption {
  id: string
  project_id: string
  name: string // e.g., "Good", "Better", "Best" or custom names
  description?: string
  is_recommended: boolean
  display_order: number
  line_items: QuoteLineItem[]
  subtotal: number
  tax_rate?: number
  tax_amount?: number
  total_amount: number
  profit_margin?: number
  created_at: string
  updated_at: string
}

export interface QuoteProposal {
  id: string
  project_id: string
  proposal_number: string
  title: string
  description?: string
  options: QuoteOption[]
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected'
  sent_at?: string
  viewed_at?: string
  responded_at?: string
  selected_option_id?: string
  decline_reason?: string
  valid_until?: string
  created_at: string
  updated_at: string
}

// Form input types
export interface CreateQuoteLineItemInput {
  description: string
  quantity: number
  unit: string
  unit_price: number
  category: 'materials' | 'labor' | 'equipment' | 'permits' | 'other'
}

export interface CreateQuoteOptionInput {
  name: string
  description?: string
  is_recommended?: boolean
  display_order?: number
  line_items: CreateQuoteLineItemInput[]
  tax_rate?: number
}

export interface CreateQuoteProposalInput {
  title: string
  description?: string
  options: CreateQuoteOptionInput[]
  valid_until?: string
}

export interface UpdateQuoteOptionInput extends Partial<CreateQuoteOptionInput> {
  id: string
}

export interface UpdateQuoteProposalInput extends Partial<CreateQuoteProposalInput> {
  id: string
  status?: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected'
  selected_option_id?: string
}

// Display helpers
export const QUOTE_OPTION_PRESETS = {
  GOOD: {
    name: 'Good',
    description: 'Essential quality materials and workmanship'
  },
  BETTER: {
    name: 'Better',
    description: 'Premium materials with enhanced durability'
  },
  BEST: {
    name: 'Best',
    description: 'Top-tier materials and maximum longevity'
  }
} as const

export const LINE_ITEM_CATEGORIES = [
  { value: 'materials', label: 'Materials', icon: '🧱' },
  { value: 'labor', label: 'Labor', icon: '👷' },
  { value: 'equipment', label: 'Equipment', icon: '🚚' },
  { value: 'permits', label: 'Permits', icon: '📋' },
  { value: 'other', label: 'Other', icon: '📦' }
] as const

export const QUOTE_STATUS_DISPLAY = {
  draft: { label: 'Draft', color: 'gray', icon: '✏️' },
  sent: { label: 'Sent', color: 'blue', icon: '📤' },
  viewed: { label: 'Viewed', color: 'yellow', icon: '👀' },
  accepted: { label: 'Accepted', color: 'green', icon: '✅' },
  rejected: { label: 'Rejected', color: 'red', icon: '❌' }
} as const

// Helper functions
export function calculateQuoteOptionTotals(
  lineItems: CreateQuoteLineItemInput[],
  taxRate: number = 0
): {
  subtotal: number
  taxAmount: number
  total: number
} {
  const subtotal = lineItems.reduce((sum, item) => {
    return sum + (item.quantity * item.unit_price)
  }, 0)

  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount

  return { subtotal, taxAmount, total }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export function generateProposalNumber(): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')

  return `PROP-${year}${month}${day}-${random}`
}
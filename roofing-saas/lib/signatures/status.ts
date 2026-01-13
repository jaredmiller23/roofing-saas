/**
 * Signature Document Status Helper
 *
 * Computes meaningful display status from document + signatures data.
 * This provides user-friendly labels like "Awaiting Company" instead of
 * raw database values like "viewed".
 */

export interface SignatureDocumentForStatus {
  status: string
  requires_customer_signature?: boolean
  requires_company_signature?: boolean
  decline_reason?: string | null
  signatures?: Array<{ signer_type: string }>
}

export type StatusColor = 'gray' | 'blue' | 'amber' | 'teal' | 'green' | 'yellow' | 'red'

export interface DisplayStatus {
  label: string
  color: StatusColor
  description: string
}

/**
 * Compute display status from document and signature data
 *
 * Status priority:
 * 1. Terminal states (signed, declined, expired)
 * 2. Partial signature states (awaiting customer/company)
 * 3. Base states (sent, viewed, draft)
 */
export function getDisplayStatus(document: SignatureDocumentForStatus): DisplayStatus {
  const hasCustomerSig = document.signatures?.some(s => s.signer_type === 'customer') ?? false
  const hasCompanySig = document.signatures?.some(s => s.signer_type === 'company') ?? false

  // Terminal states first (order matters)
  if (document.status === 'signed') {
    return {
      label: 'Signed',
      color: 'green',
      description: 'All signatures complete'
    }
  }

  if (document.status === 'declined') {
    return {
      label: 'Declined',
      color: 'red',
      description: document.decline_reason || 'Signer declined to sign'
    }
  }

  if (document.status === 'expired') {
    return {
      label: 'Expired',
      color: 'yellow',
      description: 'Document has expired'
    }
  }

  if (document.status === 'draft') {
    return {
      label: 'Draft',
      color: 'gray',
      description: 'Not yet sent'
    }
  }

  // Partial signature states - check what's needed vs what exists
  if (document.requires_company_signature && hasCustomerSig && !hasCompanySig) {
    return {
      label: 'Awaiting Company',
      color: 'amber',
      description: 'Customer signed, waiting for company signature'
    }
  }

  if (document.requires_customer_signature && hasCompanySig && !hasCustomerSig) {
    return {
      label: 'Awaiting Customer',
      color: 'amber',
      description: 'Company signed, waiting for customer signature'
    }
  }

  // Base states
  if (document.status === 'viewed') {
    return {
      label: 'Viewed',
      color: 'teal',
      description: 'Document has been opened'
    }
  }

  if (document.status === 'sent') {
    return {
      label: 'Sent',
      color: 'blue',
      description: 'Awaiting signatures'
    }
  }

  // Fallback
  return {
    label: document.status.charAt(0).toUpperCase() + document.status.slice(1),
    color: 'gray',
    description: ''
  }
}

/**
 * Get Tailwind CSS classes for status badge based on color
 */
export function getStatusBadgeClasses(color: StatusColor): string {
  const colorMap: Record<StatusColor, string> = {
    gray: 'bg-muted text-muted-foreground',
    blue: 'bg-primary/10 text-primary',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    teal: 'bg-secondary/10 text-secondary',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }
  return colorMap[color]
}

/**
 * Get icon color class for status
 */
export function getStatusIconColor(color: StatusColor): string {
  const colorMap: Record<StatusColor, string> = {
    gray: 'text-muted-foreground',
    blue: 'text-primary',
    amber: 'text-amber-500',
    teal: 'text-secondary',
    green: 'text-green-500',
    yellow: 'text-yellow-500',
    red: 'text-red-500'
  }
  return colorMap[color]
}

'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useCallback } from 'react'
import { Contact, getContactCategoryOptions } from '@/lib/types/contact'
import { createContactSchema, type CreateContactInput } from '@/lib/validations/contact'
import { DuplicateWarningDialog } from './DuplicateWarningDialog'

interface ContactFormProps {
  contact?: Contact
  mode?: 'create' | 'edit'
}

interface DuplicateMatch {
  contact: Contact
  match_reason: string[]
  confidence: 'high' | 'medium' | 'low'
}

export function ContactForm({ contact, mode = 'create' }: ContactFormProps) {
  const router = useRouter()

  // Duplicate checking state
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([])
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [_isCheckingDuplicates, setIsCheckingDuplicates] = useState(false)
  const [duplicateCheckPending, setDuplicateCheckPending] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    watch,
  } = useForm<CreateContactInput>({
    resolver: zodResolver(createContactSchema),
    defaultValues: {
      first_name: contact?.first_name || '',
      last_name: contact?.last_name || '',
      email: contact?.email || '',
      phone: contact?.phone || '',
      mobile_phone: contact?.mobile_phone || '',
      is_organization: contact?.is_organization || false,
      company: contact?.company || '',
      website: contact?.website || '',
      contact_category: contact?.contact_category || 'homeowner',
      address_street: contact?.address_street || '',
      address_city: contact?.address_city || '',
      address_state: contact?.address_state || '',
      address_zip: contact?.address_zip || '',
      type: contact?.type || 'lead',
      stage: contact?.stage || 'new',
      source: contact?.source || '',
      property_type: contact?.property_type || '',
      roof_type: contact?.roof_type || '',
      roof_age: contact?.roof_age || undefined,
      square_footage: contact?.square_footage || undefined,
      stories: contact?.stories || undefined,
      insurance_carrier: contact?.insurance_carrier || '',
      policy_number: contact?.policy_number || '',
      priority: contact?.priority || 'normal',
    },
  })

  const isOrganization = watch('is_organization')

  // Function to check for duplicates
  const checkDuplicates = useCallback(async (fieldType: 'email' | 'phone') => {
    const currentValues = watch()

    // Skip duplicate checking in edit mode
    if (mode === 'edit') return

    // Build the check data based on field type
    const checkData: any = {}

    if (fieldType === 'email' && currentValues.email?.trim()) {
      checkData.email = currentValues.email.trim()
    }

    if (fieldType === 'phone' && currentValues.phone?.trim()) {
      checkData.phone = currentValues.phone.trim()
    }

    // Include name and address for more comprehensive checking
    if (currentValues.first_name?.trim()) {
      checkData.first_name = currentValues.first_name.trim()
    }
    if (currentValues.last_name?.trim()) {
      checkData.last_name = currentValues.last_name.trim()
    }
    if (currentValues.address_street?.trim()) {
      checkData.address_street = currentValues.address_street.trim()
    }
    if (currentValues.address_city?.trim()) {
      checkData.address_city = currentValues.address_city.trim()
    }
    if (currentValues.address_state?.trim()) {
      checkData.address_state = currentValues.address_state.trim()
    }
    if (currentValues.address_zip?.trim()) {
      checkData.address_zip = currentValues.address_zip.trim()
    }

    // Don't check if we don't have meaningful data
    if (!checkData.email && !checkData.phone) {
      return
    }

    setIsCheckingDuplicates(true)
    setDuplicateCheckPending(fieldType)

    try {
      const response = await fetch('/api/contacts/check-duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkData),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data.has_duplicates) {
          setDuplicateMatches(result.data.matches)
          setShowDuplicateDialog(true)
        }
      }
    } catch (error) {
      console.error('Error checking duplicates:', error)
      // Fail silently - don't block form submission
    } finally {
      setIsCheckingDuplicates(false)
      setDuplicateCheckPending(null)
    }
  }, [mode, watch])

  // Handle duplicate dialog actions
  const handleDuplicateDialogClose = () => {
    setShowDuplicateDialog(false)
    setDuplicateMatches([])
  }

  const handleContinueCreating = () => {
    // User chose to continue creating despite duplicates
    // Just close the dialog - they can submit the form normally
  }

  const onSubmit = async (data: CreateContactInput) => {
    try {
      // Prepare data - convert empty strings to undefined for optional fields
      const submitData = {
        ...data,
        email: data.email || undefined,
        phone: data.phone || undefined,
        mobile_phone: data.mobile_phone || undefined,
        company: data.company || undefined,
        website: data.website || undefined,
      }

      const url = mode === 'edit' && contact ? `/api/contacts/${contact.id}` : '/api/contacts'
      const method = mode === 'edit' ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to save contact')
      }

      const result = await response.json()

      // Redirect to contact detail page
      // API returns { success, data: { contact } } structure
      router.push(`/contacts/${result.data.contact.id}`)
      router.refresh()
    } catch (err) {
      setError('root', {
        type: 'manual',
        message: err instanceof Error ? err.message : 'An error occurred',
      })
    }
  }

  // Helper to get input class with error styling
  const getInputClass = (fieldName: keyof CreateContactInput) => {
    const baseClass = 'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2'
    return errors[fieldName]
      ? `${baseClass} border-red-500 focus:ring-red-500`
      : `${baseClass} border-input focus:ring-primary`
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {errors.root && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
          {errors.root.message}
        </div>
      )}

      {/* Basic Information */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-muted-foreground mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="first_name"
              {...register('first_name')}
              className={getInputClass('first_name')}
            />
            {errors.first_name && (
              <p className="mt-1 text-sm text-red-500">{errors.first_name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-muted-foreground mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="last_name"
              {...register('last_name')}
              className={getInputClass('last_name')}
            />
            {errors.last_name && (
              <p className="mt-1 text-sm text-red-500">{errors.last_name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1">
              Email
              {duplicateCheckPending === 'email' && (
                <span className="ml-2 text-xs text-primary">Checking for duplicates...</span>
              )}
            </label>
            <input
              type="email"
              id="email"
              {...register('email')}
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  checkDuplicates('email')
                }
              }}
              className={getInputClass('email')}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-muted-foreground mb-1">
              Phone
              {duplicateCheckPending === 'phone' && (
                <span className="ml-2 text-xs text-primary">Checking for duplicates...</span>
              )}
            </label>
            <input
              type="tel"
              id="phone"
              {...register('phone')}
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  checkDuplicates('phone')
                }
              }}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="mobile_phone" className="block text-sm font-medium text-muted-foreground mb-1">
              Mobile Phone
            </label>
            <input
              type="tel"
              id="mobile_phone"
              {...register('mobile_phone')}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_organization"
                {...register('is_organization')}
                className="h-4 w-4 text-primary focus:ring-primary border-input rounded"
              />
              <label htmlFor="is_organization" className="ml-2 block text-sm font-medium text-muted-foreground">
                This is a company/organization (not an individual)
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-medium text-muted-foreground mb-1">
              Company Name
            </label>
            <input
              type="text"
              id="company"
              {...register('company')}
              placeholder={isOrganization ? "Company name" : "Employer (optional)"}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {isOrganization
                ? "The name of the organization"
                : "Optional: The company this person works for"}
            </p>
          </div>

          <div>
            <label htmlFor="website" className="block text-sm font-medium text-muted-foreground mb-1">
              Website
            </label>
            <input
              type="url"
              id="website"
              {...register('website')}
              placeholder="https://example.com"
              className={getInputClass('website')}
            />
            {errors.website && (
              <p className="mt-1 text-sm text-red-500">{errors.website.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="contact_category" className="block text-sm font-medium text-muted-foreground mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="contact_category"
              {...register('contact_category')}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {getContactCategoryOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-muted-foreground mb-1">
              Sales Stage
            </label>
            <select
              id="type"
              {...register('type')}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="lead">Lead</option>
              <option value="prospect">Prospect</option>
              <option value="customer">Customer</option>
            </select>
          </div>

          <div>
            <label htmlFor="stage" className="block text-sm font-medium text-muted-foreground mb-1">
              Stage
            </label>
            <select
              id="stage"
              {...register('stage')}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="proposal">Proposal</option>
              <option value="negotiation">Negotiation</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-muted-foreground mb-1">
              Priority
            </label>
            <select
              id="priority"
              {...register('priority')}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="source" className="block text-sm font-medium text-muted-foreground mb-1">
              Source
            </label>
            <input
              type="text"
              id="source"
              {...register('source')}
              placeholder="e.g., Door knocking, Referral, Website"
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Address</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="address_street" className="block text-sm font-medium text-muted-foreground mb-1">
              Street Address
            </label>
            <input
              type="text"
              id="address_street"
              {...register('address_street')}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="address_city" className="block text-sm font-medium text-muted-foreground mb-1">
              City
            </label>
            <input
              type="text"
              id="address_city"
              {...register('address_city')}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="address_state" className="block text-sm font-medium text-muted-foreground mb-1">
              State
            </label>
            <input
              type="text"
              id="address_state"
              {...register('address_state')}
              maxLength={2}
              placeholder="TN"
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="address_zip" className="block text-sm font-medium text-muted-foreground mb-1">
              ZIP Code
            </label>
            <input
              type="text"
              id="address_zip"
              {...register('address_zip')}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Property Details */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Property Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="property_type" className="block text-sm font-medium text-muted-foreground mb-1">
              Property Type
            </label>
            <input
              type="text"
              id="property_type"
              {...register('property_type')}
              placeholder="e.g., Single Family, Condo"
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="roof_type" className="block text-sm font-medium text-muted-foreground mb-1">
              Roof Type
            </label>
            <input
              type="text"
              id="roof_type"
              {...register('roof_type')}
              placeholder="e.g., Asphalt Shingle, Metal"
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="roof_age" className="block text-sm font-medium text-muted-foreground mb-1">
              Roof Age (years)
            </label>
            <input
              type="number"
              id="roof_age"
              {...register('roof_age', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="square_footage" className="block text-sm font-medium text-muted-foreground mb-1">
              Square Footage
            </label>
            <input
              type="number"
              id="square_footage"
              {...register('square_footage', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="stories" className="block text-sm font-medium text-muted-foreground mb-1">
              Stories
            </label>
            <input
              type="number"
              id="stories"
              {...register('stories', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Insurance */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Insurance Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="insurance_carrier" className="block text-sm font-medium text-muted-foreground mb-1">
              Insurance Carrier
            </label>
            <input
              type="text"
              id="insurance_carrier"
              {...register('insurance_carrier')}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="policy_number" className="block text-sm font-medium text-muted-foreground mb-1">
              Policy Number
            </label>
            <input
              type="text"
              id="policy_number"
              {...register('policy_number')}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-4 border-t">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Update Contact' : 'Create Contact'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="px-6 py-2 border border-input text-muted-foreground rounded-md hover:bg-accent disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      {/* Duplicate Warning Dialog */}
      <DuplicateWarningDialog
        isOpen={showDuplicateDialog}
        matches={duplicateMatches}
        onClose={handleDuplicateDialogClose}
        onContinue={handleContinueCreating}
      />
    </form>
  )
}

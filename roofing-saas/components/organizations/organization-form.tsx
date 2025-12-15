'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Organization, getOrganizationTypeOptions } from '@/lib/types/organization'
import { createOrganizationSchema, type CreateOrganizationInput } from '@/lib/validations/organization'

interface OrganizationFormProps {
  organization?: Organization
  mode?: 'create' | 'edit'
}

export function OrganizationForm({ organization, mode = 'create' }: OrganizationFormProps) {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: organization?.name || '',
      type: organization?.type || 'company',
      website: organization?.website || '',
      phone: organization?.phone || '',
      email: organization?.email || '',
      address_street: organization?.address_street || '',
      address_city: organization?.address_city || '',
      address_state: organization?.address_state || '',
      address_zip: organization?.address_zip || '',
      industry: organization?.industry || '',
      description: organization?.description || '',
      employee_count: organization?.employee_count || undefined,
    },
  })

  const onSubmit = async (data: CreateOrganizationInput) => {
    try {
      // Prepare data - convert empty strings to undefined for optional fields
      const submitData = {
        ...data,
        website: data.website || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        industry: data.industry || undefined,
        description: data.description || undefined,
        employee_count: data.employee_count || undefined,
      }

      const url = mode === 'edit' && organization ? `/api/organizations/${organization.id}` : '/api/organizations'
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
        throw new Error(errorData.error?.message || 'Failed to save organization')
      }

      const result = await response.json()

      // Redirect to organization detail page
      // API returns { success, data: { organization } } structure
      router.push(`/organizations/${result.data.organization.id}`)
      router.refresh()
    } catch (err) {
      setError('root', {
        type: 'manual',
        message: err instanceof Error ? err.message : 'An error occurred',
      })
    }
  }

  // Helper to get input class with error styling
  const getInputClass = (fieldName: keyof CreateOrganizationInput) => {
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
            <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-1">
              Organization Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              {...register('name')}
              className={getInputClass('name')}
              placeholder="e.g., ABC Construction Company"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-muted-foreground mb-1">
              Organization Type <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              {...register('type')}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {getOrganizationTypeOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.type && (
              <p className="mt-1 text-sm text-red-500">{errors.type.message}</p>
            )}
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
            <label htmlFor="phone" className="block text-sm font-medium text-muted-foreground mb-1">
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              {...register('phone')}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              {...register('email')}
              className={getInputClass('email')}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-muted-foreground mb-1">
              Industry
            </label>
            <input
              type="text"
              id="industry"
              {...register('industry')}
              placeholder="e.g., Construction, Insurance"
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

      {/* Additional Information */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Additional Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="employee_count" className="block text-sm font-medium text-muted-foreground mb-1">
              Employee Count
            </label>
            <input
              type="number"
              id="employee_count"
              {...register('employee_count', { valueAsNumber: true })}
              min={1}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-muted-foreground mb-1">
              Description
            </label>
            <textarea
              id="description"
              {...register('description')}
              rows={3}
              placeholder="Brief description of the organization"
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
          {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Update Organization' : 'Create Organization'}
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
    </form>
  )
}
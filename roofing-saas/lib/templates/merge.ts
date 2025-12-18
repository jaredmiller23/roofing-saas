/**
 * Template merge utilities for HTML template processing
 * Handles placeholder replacement and data merging for PDF generation
 */

interface ContactData {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
}

interface ProjectData {
  id?: string
  name?: string
  description?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  status?: string
  created_at?: string
}

interface CompanyData {
  name?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  phone?: string
  email?: string
  website?: string
  license_number?: string
}

interface TemplateData {
  // Contact information
  contact?: ContactData
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  property_address?: string
  property_city?: string
  property_state?: string
  property_zip?: string

  // Project information
  project?: ProjectData
  project_name?: string
  project_description?: string
  contract_amount?: string

  // Company information
  company?: CompanyData
  company_name?: string
  company_address?: string
  company_phone?: string
  company_website?: string
  license_number?: string

  // Document metadata
  current_date?: string
  document_title?: string
  document_type?: string

  // Custom fields
  [key: string]: unknown
}

/**
 * Merge template data with HTML template
 * Replaces {{placeholder}} syntax with actual values
 *
 * @param htmlTemplate - HTML template with {{placeholder}} syntax
 * @param data - Data object to merge
 * @returns HTML content with placeholders replaced
 */
export function mergeTemplateWithData(htmlTemplate: string, data: TemplateData): string {
  // Create a comprehensive data object with flattened structure
  const mergedData = prepareTemplateData(data)

  // Replace all {{placeholder}} patterns
  return htmlTemplate.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, placeholder) => {
    const value = getNestedValue(mergedData, placeholder)

    // Handle missing values gracefully
    if (value === undefined || value === null) {
      return '' // Return empty string for missing values
    }

    // Convert to string and escape HTML if needed
    return String(value)
  })
}

/**
 * Prepare template data by flattening nested objects and adding defaults
 */
function prepareTemplateData(data: TemplateData): Record<string, unknown> {
  const prepared: Record<string, unknown> = {}

  // Add current date if not provided
  if (!data.current_date) {
    prepared.current_date = new Date().toLocaleDateString()
  }

  // Flatten contact data
  if (data.contact) {
    prepared.customer_name = `${data.contact.first_name || ''} ${data.contact.last_name || ''}`.trim()
    prepared.customer_email = data.contact.email || ''
    prepared.customer_phone = data.contact.phone || ''
    prepared.property_address = data.contact.address || ''
    prepared.property_city = data.contact.city || ''
    prepared.property_state = data.contact.state || ''
    prepared.property_zip = data.contact.zip || ''
  }

  // Flatten project data
  if (data.project) {
    prepared.project_name = data.project.name || ''
    prepared.project_description = data.project.description || ''
    // Use project address if available, fallback to contact address
    if (data.project.address) {
      prepared.property_address = data.project.address
      prepared.property_city = data.project.city || ''
      prepared.property_state = data.project.state || ''
      prepared.property_zip = data.project.zip || ''
    }
  }

  // Flatten company data
  if (data.company) {
    prepared.company_name = data.company.name || ''
    prepared.company_address = data.company.address || ''
    prepared.company_phone = data.company.phone || ''
    prepared.company_website = data.company.website || ''
    prepared.license_number = data.company.license_number || ''
  }

  // Add all other data directly
  Object.keys(data).forEach(key => {
    if (!['contact', 'project', 'company'].includes(key)) {
      prepared[key] = data[key]
    }
  })

  return prepared
}

/**
 * Get nested value from object using dot notation
 * Example: getNestedValue({contact: {name: 'John'}}, 'contact.name') => 'John'
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    return current && typeof current === 'object' && current !== null && key in current
      ? (current as Record<string, unknown>)[key]
      : undefined
  }, obj)
}

/**
 * Extract placeholders from HTML template
 * Returns array of unique placeholder names found in template
 */
export function extractPlaceholders(htmlTemplate: string): string[] {
  const matches = htmlTemplate.match(/\{\{(\w+(?:\.\w+)*)\}\}/g) || []
  return Array.from(new Set(matches.map(match => match.slice(2, -2))))
}

/**
 * Validate that all required placeholders have values
 * Returns array of missing placeholder names
 */
export function validateTemplateData(htmlTemplate: string, data: TemplateData): string[] {
  const placeholders = extractPlaceholders(htmlTemplate)
  const mergedData = prepareTemplateData(data)

  return placeholders.filter(placeholder => {
    const value = getNestedValue(mergedData, placeholder)
    return value === undefined || value === null || value === ''
  })
}

/**
 * Preview template with sample data
 * Useful for testing and template development
 */
export function previewTemplate(htmlTemplate: string): string {
  const sampleData: TemplateData = {
    customer_name: 'John Smith',
    customer_email: 'john@example.com',
    customer_phone: '(555) 123-4567',
    property_address: '123 Main Street',
    property_city: 'Nashville',
    property_state: 'TN',
    property_zip: '37201',
    project_name: 'Roof Replacement - Smith Residence',
    project_description: 'Complete tear-off and replacement of residential shingle roof',
    contract_amount: '$15,500.00',
    company_name: 'Tennessee Roofing Company',
    company_address: '456 Business Blvd, Nashville, TN 37203',
    company_phone: '(615) 555-0123',
    company_website: 'www.tennesseeroof.com',
    license_number: 'TN-12345',
    current_date: new Date().toLocaleDateString(),
    document_title: 'Sample Contract',
    document_type: 'contract',
  }

  return mergeTemplateWithData(htmlTemplate, sampleData)
}

/**
 * Get default company data from environment or configuration
 * This would typically come from a database or configuration
 */
export function getDefaultCompanyData(): CompanyData {
  return {
    name: process.env.COMPANY_NAME || 'Tennessee Roofing Company',
    address: process.env.COMPANY_ADDRESS || '456 Business Blvd',
    city: process.env.COMPANY_CITY || 'Nashville',
    state: process.env.COMPANY_STATE || 'TN',
    zip: process.env.COMPANY_ZIP || '37203',
    phone: process.env.COMPANY_PHONE || '(615) 555-0123',
    email: process.env.COMPANY_EMAIL || 'info@tennesseeroof.com',
    website: process.env.COMPANY_WEBSITE || 'www.tennesseeroof.com',
    license_number: process.env.COMPANY_LICENSE || 'TN-12345',
  }
}

/**
 * Merge template with contact and project data
 * Convenience function for common use case
 */
export function mergeTemplateWithContactAndProject(
  htmlTemplate: string,
  contact: ContactData | null,
  project: ProjectData | null,
  additionalData: Partial<TemplateData> = {}
): string {
  const templateData: TemplateData = {
    ...additionalData,
    contact: contact || undefined,
    project: project || undefined,
    company: getDefaultCompanyData(),
    current_date: new Date().toLocaleDateString(),
  }

  return mergeTemplateWithData(htmlTemplate, templateData)
}
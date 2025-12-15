'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'

interface CreateExpenseResult {
  success?: boolean
  error?: string
}

export async function createExpenseAction(formData: FormData): Promise<CreateExpenseResult> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { error: 'Unauthorized' }
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return { error: 'No tenant found' }
    }

    const projectId = formData.get('project_id') as string
    if (!projectId) {
      return { error: 'Project ID is required' }
    }

    const supabase = await createClient()

    // Validate project belongs to tenant
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .single()

    if (!project) {
      return { error: 'Project not found' }
    }

    // Parse form data
    const expenseType = formData.get('expense_type') as string
    const category = formData.get('category') as string | null
    const description = formData.get('description') as string
    const amount = parseFloat(formData.get('amount') as string)
    const quantity = formData.get('quantity') ? parseFloat(formData.get('quantity') as string) : null
    const unitPrice = formData.get('unit_price') ? parseFloat(formData.get('unit_price') as string) : null
    const vendorName = formData.get('vendor_name') as string | null
    const invoiceNumber = formData.get('invoice_number') as string | null
    const expenseDate = formData.get('expense_date') as string
    const paidDate = formData.get('paid_date') as string | null
    const notes = formData.get('notes') as string | null

    // Validate required fields
    if (!expenseType || !description || !amount || !expenseDate) {
      return { error: 'Missing required fields' }
    }

    // Create expense
    const { error } = await supabase
      .from('job_expenses')
      .insert({
        tenant_id: tenantId,
        project_id: projectId,
        expense_type: expenseType,
        category,
        description,
        amount,
        quantity,
        unit_price: unitPrice,
        vendor_name: vendorName,
        invoice_number: invoiceNumber,
        expense_date: expenseDate,
        paid_date: paidDate,
        notes,
        created_by: user.id,
        is_approved: false,
      })

    if (error) {
      console.error('Error creating expense:', error)
      return { error: 'Failed to create expense' }
    }

    // Revalidate the costing page
    revalidatePath(`/projects/${projectId}/costing`)

    return { success: true }
  } catch (err) {
    console.error('Unexpected error creating expense:', err)
    return { error: 'An unexpected error occurred' }
  }
}

export async function deleteExpenseAction(expenseId: string, projectId: string): Promise<CreateExpenseResult> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { error: 'Unauthorized' }
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return { error: 'No tenant found' }
    }

    const supabase = await createClient()

    // Delete expense (RLS will ensure it belongs to tenant)
    const { error } = await supabase
      .from('job_expenses')
      .delete()
      .eq('id', expenseId)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Error deleting expense:', error)
      return { error: 'Failed to delete expense' }
    }

    // Revalidate the costing page
    revalidatePath(`/projects/${projectId}/costing`)

    return { success: true }
  } catch (err) {
    console.error('Unexpected error deleting expense:', err)
    return { error: 'An unexpected error occurred' }
  }
}

export async function approveExpenseAction(expenseId: string, projectId: string): Promise<CreateExpenseResult> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { error: 'Unauthorized' }
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return { error: 'No tenant found' }
    }

    const supabase = await createClient()

    // Approve expense
    const { error } = await supabase
      .from('job_expenses')
      .update({
        is_approved: true,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', expenseId)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Error approving expense:', error)
      return { error: 'Failed to approve expense' }
    }

    // Revalidate the costing page
    revalidatePath(`/projects/${projectId}/costing`)

    return { success: true }
  } catch (err) {
    console.error('Unexpected error approving expense:', err)
    return { error: 'An unexpected error occurred' }
  }
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'

interface CommissionActionResult {
  success?: boolean
  error?: string
}

export async function createCommissionAction(formData: FormData): Promise<CommissionActionResult> {
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

    // Parse form data
    const commissionPlanId = formData.get('commission_plan_id') as string
    const commissionType = formData.get('commission_type') as string
    const userEmail = formData.get('user_email') as string
    const baseAmount = parseFloat(formData.get('base_amount') as string)
    const projectId = formData.get('project_id') as string | null
    const notes = formData.get('notes') as string | null

    // Validate required fields
    if (!commissionPlanId || !commissionType || !userEmail || !baseAmount) {
      return { error: 'Missing required fields' }
    }

    // Find user by email
    const { data: targetUser } = await supabase
      .from('tenant_users')
      .select('user_id')
      .eq('tenant_id', tenantId)
      .limit(1)
      .single()

    if (!targetUser) {
      return { error: 'User not found in your organization' }
    }

    // Get commission plan
    const { data: plan } = await supabase
      .from('commission_plans')
      .select('*')
      .eq('id', commissionPlanId)
      .eq('tenant_id', tenantId)
      .single()

    if (!plan) {
      return { error: 'Commission plan not found' }
    }

    // Calculate commission using the database function
    const { data: rawCommissionAmount, error: calcError } = await supabase
      .rpc('calculate_commission', {
        p_plan_id: commissionPlanId,
        p_base_amount: baseAmount
      })

    if (calcError) {
      console.error('Error calculating commission:', calcError)
      return { error: 'Failed to calculate commission' }
    }

    const commissionAmount = Number(rawCommissionAmount) || 0

    // Create commission record
    const { error } = await supabase
      .from('commission_records')
      .insert({
        tenant_id: tenantId,
        user_id: targetUser.user_id,
        amount: commissionAmount,
        commission_plan_id: commissionPlanId,
        project_id: projectId || null,
        commission_type: commissionType,
        base_amount: baseAmount,
        commission_rate: plan.base_rate,
        commission_amount: commissionAmount,
        adjustment_amount: 0,
        status: 'pending',
        notes,
        created_by: user.id,
      })

    if (error) {
      console.error('Error creating commission:', error)
      return { error: 'Failed to create commission' }
    }

    revalidatePath('/financial/commissions')

    return { success: true }
  } catch (err) {
    console.error('Unexpected error creating commission:', err)
    return { error: 'An unexpected error occurred' }
  }
}

export async function approveCommissionAction(commissionId: string): Promise<CommissionActionResult> {
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

    const { error } = await supabase
      .from('commission_records')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', commissionId)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Error approving commission:', error)
      return { error: 'Failed to approve commission' }
    }

    revalidatePath('/financial/commissions')

    return { success: true }
  } catch (err) {
    console.error('Unexpected error approving commission:', err)
    return { error: 'An unexpected error occurred' }
  }
}

export async function markCommissionPaidAction(
  commissionId: string,
  paymentDate: string,
  paymentMethod: string
): Promise<CommissionActionResult> {
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

    const { error } = await supabase
      .from('commission_records')
      .update({
        status: 'paid',
        payment_date: paymentDate,
        payment_method: paymentMethod,
      })
      .eq('id', commissionId)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Error marking commission as paid:', error)
      return { error: 'Failed to mark commission as paid' }
    }

    revalidatePath('/financial/commissions')

    return { success: true }
  } catch (err) {
    console.error('Unexpected error marking commission as paid:', err)
    return { error: 'An unexpected error occurred' }
  }
}

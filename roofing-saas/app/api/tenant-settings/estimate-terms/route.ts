import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { AuthenticationError, AuthorizationError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

const DEFAULT_TERMS =
  'This estimate is valid for 30 days from the date of issue. All work includes a manufacturer warranty on materials and a workmanship warranty. Payment terms: 50% deposit upon acceptance, balance due upon completion. Any changes to the scope of work may result in additional charges. Permits and inspections are included where required by local code.'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) throw AuthenticationError()

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) throw AuthorizationError('No tenant found')

    const supabase = await createClient()

    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('custom_settings')
      .eq('tenant_id', tenantId)
      .single()

    const customSettings = settings?.custom_settings as Record<string, string> | null
    const terms = customSettings?.estimate_terms || DEFAULT_TERMS

    return successResponse({ terms, isDefault: !customSettings?.estimate_terms })
  } catch (error) {
    return errorResponse(error as Error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) throw AuthenticationError()

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) throw AuthorizationError('No tenant found')

    const body = await request.json()
    const { terms } = body

    if (typeof terms !== 'string') {
      return successResponse({ error: 'terms must be a string' }, 400)
    }

    const supabase = await createClient()

    // Read current custom_settings to merge
    const { data: current } = await supabase
      .from('tenant_settings')
      .select('custom_settings')
      .eq('tenant_id', tenantId)
      .single()

    const currentSettings = (current?.custom_settings as Record<string, unknown>) || {}
    const updatedSettings = { ...currentSettings, estimate_terms: terms || undefined }

    // Remove the key entirely if terms is empty (revert to default)
    if (!terms) {
      delete updatedSettings.estimate_terms
    }

    const { error } = await supabase
      .from('tenant_settings')
      .update({ custom_settings: updatedSettings })
      .eq('tenant_id', tenantId)

    if (error) {
      throw error
    }

    return successResponse({ terms: terms || DEFAULT_TERMS, isDefault: !terms })
  } catch (error) {
    return errorResponse(error as Error)
  }
}

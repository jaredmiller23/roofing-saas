import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CallLogForm } from '@/components/call-logs/call-log-form'
import Link from 'next/link'

/**
 * Edit call log page
 */
export default async function EditCallLogPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const tenantId = await getUserTenantId(user.id)
  if (!tenantId) {
    redirect('/dashboard')
  }

  const { id } = await params
  const supabase = await createClient()

  const { data: call, error } = await supabase
    .from('call_logs')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)
    .single()

  if (error || !call) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Call Log Not Found</h2>
            <p className="text-red-700 mb-4">The call log you are trying to edit does not exist.</p>
            <Link href="/call-logs" className="text-red-600 hover:text-red-900 underline">
              Back to Call Logs
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Edit Call Log</h1>
          <p className="text-muted-foreground mt-1">
            Update call: {call.phone_number}
          </p>
        </div>

        <CallLogForm call={call} />
      </div>
    </div>
  )
}

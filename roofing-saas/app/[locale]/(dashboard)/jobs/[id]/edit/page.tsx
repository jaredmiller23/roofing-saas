import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { JobForm } from '@/components/jobs/job-form'
import Link from 'next/link'

/**
 * Edit job page
 */
export default async function EditJobPage({
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

  const { data: job, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)
    .single()

  if (error || !job) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-red-400 mb-2">Job Not Found</h2>
            <p className="text-red-300 mb-4">The job you are trying to edit does not exist.</p>
            <Link href="/jobs" className="text-red-400 hover:text-red-300 underline">
              Back to Jobs
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
          <h1 className="text-3xl font-bold text-foreground">Edit Job</h1>
          <p className="text-muted-foreground mt-1">
            Update job: {job.job_number}
          </p>
        </div>

        <JobForm job={job} />
      </div>
    </div>
  )
}

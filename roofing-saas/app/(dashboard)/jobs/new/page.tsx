import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { JobForm } from '@/components/jobs/job-form'

/**
 * New job page
 */
export default async function NewJobPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Schedule New Job</h1>
          <p className="text-gray-600 mt-1">
            Create a new production job and assign crew
          </p>
        </div>

        <JobForm />
      </div>
    </div>
  )
}

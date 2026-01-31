import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { JobForm } from '@/components/jobs/job-form'

interface NewJobPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

/**
 * New job page
 */
export default async function NewJobPage({ searchParams }: NewJobPageProps) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const params = await searchParams
  const initialProjectId = typeof params.project_id === 'string' ? params.project_id : undefined

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Schedule New Job</h1>
          <p className="text-muted-foreground mt-1">
            Create a new production job and assign crew
          </p>
        </div>

        <JobForm initialProjectId={initialProjectId} />
      </div>
    </div>
  )
}

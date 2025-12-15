import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { ProjectFileForm } from '@/components/project-files/project-file-form'

/**
 * Create new project file page
 */
export default async function NewProjectFilePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">Upload File</h1>
        <ProjectFileForm />
      </div>
    </div>
  )
}

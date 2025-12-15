import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProjectFileForm } from '@/components/project-files/project-file-form'
import Link from 'next/link'

/**
 * Edit project file page
 */
export default async function EditProjectFilePage({
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

  const { data: file, error } = await supabase
    .from('project_files')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)
    .single()

  if (error || !file) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-red-900 mb-2">File Not Found</h2>
            <p className="text-red-700 mb-4">The file you are trying to edit does not exist.</p>
            <Link href="/project-files" className="text-red-600 hover:text-red-900 underline">
              Back to Files
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
          <h1 className="text-3xl font-bold text-foreground">Edit File</h1>
          <p className="text-muted-foreground mt-1">
            Update file: {file.file_name}
          </p>
        </div>

        <ProjectFileForm file={file} />
      </div>
    </div>
  )
}

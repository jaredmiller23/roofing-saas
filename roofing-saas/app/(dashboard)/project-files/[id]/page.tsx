import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileText, Image as ImageIcon } from 'lucide-react'

/**
 * Project file detail page
 */
export default async function ProjectFileDetailPage({
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
            <p className="text-red-700 mb-4">The file you are looking for does not exist.</p>
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
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 h-16 w-16 bg-blue-100 rounded-lg flex items-center justify-center">
              {file.file_type === 'photo' ? (
                <ImageIcon className="h-8 w-8 text-blue-600" />
              ) : (
                <FileText className="h-8 w-8 text-blue-600" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {file.file_name}
              </h1>
              <p className="text-muted-foreground mt-1">
                {file.file_type} {file.file_category && `• ${file.file_category}`}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/project-files/${file.id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Edit
            </Link>
            <Link
              href="/project-files"
              className="px-4 py-2 border border-gray-300 text-muted-foreground rounded-lg hover:bg-background"
            >
              Back
            </Link>
          </div>
        </div>

        {/* File Preview/Link */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">File</h2>
          <a
            href={file.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {file.file_url}
          </a>
        </div>

        {/* Description */}
        {file.description && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Description</h2>
            <p className="text-foreground whitespace-pre-wrap">{file.description}</p>
          </div>
        )}
      </div>
    </div>
  )
}

import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { PipelineBoard } from '@/components/pipeline/pipeline-board'

/**
 * Pipeline page - Kanban view for managing contacts through sales stages
 */
export default async function PipelinePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 bg-white border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900">Sales Pipeline</h1>
          <p className="text-gray-600 mt-1">
            Drag contacts between stages to manage your sales process
          </p>
        </div>

        {/* Pipeline Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden bg-gray-100">
          <PipelineBoard />
        </div>
      </div>
    </div>
  )
}

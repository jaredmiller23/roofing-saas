import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { KnockLogger } from '@/components/knocks/KnockLogger'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

/**
 * Mobile knock logging page - optimized for field reps
 *
 * Features:
 * - GPS location capture
 * - Quick disposition buttons
 * - Minimal typing required
 * - <30 second logging time
 * - Works offline (queued sync)
 */
export default async function NewKnockPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link
            href="/knocks"
            className="p-2 -ml-2 hover:bg-muted rounded-md transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">Log Knock</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-w-2xl mx-auto">
        <KnockLogger />
      </div>
    </div>
  )
}

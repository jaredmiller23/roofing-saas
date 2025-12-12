import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { MessagesSplitView } from '@/components/messages'
import Link from 'next/link'
import { MessageSquare, Plus } from 'lucide-react'

/**
 * Messages Page - iMessage-like SMS interface
 *
 * Features:
 * - Desktop: Split-pane view (conversations left, thread right)
 * - Mobile: Responsive full-page navigation
 * - Real-time message updates
 * - Unread badge tracking
 * - Search/filter conversations
 */
export default async function MessagesPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Desktop: Split-pane view */}
      <div className="hidden md:flex md:flex-col flex-1">
        {/* Header */}
        <div className="p-4 border-b border-border bg-background">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Messages</h1>
            </div>
            <Link
              href="/contacts"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium text-sm"
            >
              <Plus className="h-4 w-4" />
              New Conversation
            </Link>
          </div>
        </div>

        {/* Split-pane content */}
        <div className="flex-1 overflow-hidden">
          <MessagesSplitView />
        </div>
      </div>

      {/* Mobile: Redirect to mobile-specific implementation */}
      <div className="md:hidden flex-1 flex items-center justify-center p-8 text-center">
        <div>
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Messages</h2>
          <p className="text-muted-foreground mb-4">
            Mobile view coming soon. Please use desktop for now.
          </p>
          <Link
            href="/contacts"
            className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            View Contacts
          </Link>
        </div>
      </div>
    </div>
  )
}

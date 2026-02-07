import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { MobileThreadClient } from './MobileThreadClient'

/**
 * Mobile Thread Page
 *
 * Full-screen mobile thread view for a specific contact's SMS conversation.
 * On desktop, the main /messages page handles thread display via split-pane.
 * This page is the deep-link target when navigating to a specific conversation
 * from mobile (e.g., notifications, contact cards).
 *
 * The client component handles:
 * - Fetching contact info (name, phone) from the API
 * - Rendering the MessageThread with full-screen layout
 * - Back navigation to the messages list
 */
export default async function MobileThreadPage({
  params,
}: {
  params: Promise<{ contactId: string; locale: string }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const { contactId } = await params

  return <MobileThreadClient contactId={contactId} />
}

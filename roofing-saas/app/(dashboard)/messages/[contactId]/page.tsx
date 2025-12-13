import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

/**
 * Mobile Thread Page
 * Placeholder for future mobile-specific thread view
 * For now, redirects to main messages page
 */
export default async function MobileThreadPage({
  params: _params,
}: {
  params: Promise<{ contactId: string }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // For now, redirect to main messages page
  // TODO: Implement full-screen mobile thread view
  redirect('/messages')
}

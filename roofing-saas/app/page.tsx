import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

/**
 * Root page - redirects to dashboard if authenticated, or login if not
 */
export default async function HomePage() {
  const user = await getCurrentUser()

  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}

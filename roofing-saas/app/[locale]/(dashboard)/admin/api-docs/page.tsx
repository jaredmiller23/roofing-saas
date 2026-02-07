import { getCurrentUser, isAdmin } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { ApiDocsClient } from '@/components/admin/api-docs'

export default async function ApiDocsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const userIsAdmin = await isAdmin(user.id)
  if (!userIsAdmin) {
    redirect('/settings')
  }

  return <ApiDocsClient />
}

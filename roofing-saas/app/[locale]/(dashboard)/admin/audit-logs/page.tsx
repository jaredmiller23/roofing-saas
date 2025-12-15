import { getCurrentUser, isAdmin } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { AuditLogsTable } from '@/components/admin/AuditLogsTable'

export default async function AuditLogsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Verify user is admin
  const userIsAdmin = await isAdmin(user.id)
  if (!userIsAdmin) {
    redirect('/settings')
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Impersonation Audit Logs
        </h1>
        <p className="text-muted-foreground">
          View and track all admin impersonation sessions for security and compliance
        </p>
      </div>

      <AuditLogsTable />
    </div>
  )
}

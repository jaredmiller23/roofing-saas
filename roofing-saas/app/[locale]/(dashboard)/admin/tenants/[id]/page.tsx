import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { TenantDetail } from '@/components/admin/tenant-detail'

interface TenantDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminTenantDetailPage({ params }: TenantDetailPageProps) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const { id } = await params

  return <TenantDetail tenantId={id} />
}

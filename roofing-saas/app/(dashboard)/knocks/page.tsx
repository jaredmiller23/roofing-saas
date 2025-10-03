import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

/**
 * Knocks page - displays door-knocking activities (Enzy-style data)
 *
 * Shows all door knock activities with:
 * - Date/time
 * - Contact info
 * - Address
 * - Disposition/result
 * - User who logged the knock
 */
export default async function KnocksPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const tenantId = await getUserTenantId(user.id)
  if (!tenantId) {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  // Get all door knock activities
  const { data: knocks, error } = await supabase
    .from('activities')
    .select(`
      id,
      created_at,
      type,
      subject,
      description,
      contact_id,
      contacts (
        first_name,
        last_name,
        address_street,
        address_city,
        address_state,
        address_zip
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('type', 'door_knock')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching knocks:', error)
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Door Knocks</h1>
            <p className="text-gray-600 mt-2">
              Track all door-knocking activities and results
            </p>
          </div>
          <Link href="/knocks/new">
            <Button size="lg" className="h-12">
              <Plus className="h-5 w-5 mr-2" />
              Log Knock
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Knocks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{knocks?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {knocks?.filter(k => {
                  const knockDate = new Date(k.created_at)
                  const today = new Date()
                  return knockDate.toDateString() === today.toDateString()
                }).length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {knocks?.filter(k => {
                  const knockDate = new Date(k.created_at)
                  const weekAgo = new Date()
                  weekAgo.setDate(weekAgo.getDate() - 7)
                  return knockDate >= weekAgo
                }).length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {knocks?.filter(k => {
                  const knockDate = new Date(k.created_at)
                  const monthAgo = new Date()
                  monthAgo.setDate(monthAgo.getDate() - 30)
                  return knockDate >= monthAgo
                }).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Knocks List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Knocks</CardTitle>
            <CardDescription>
              Most recent door-knocking activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!knocks || knocks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No door knocks recorded yet</p>
                <p className="text-sm text-gray-400 mt-2">
                  Start logging your door-knocking activities
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {knocks.map((knock: any) => (
                  <div
                    key={knock.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">
                            {knock.contacts?.first_name} {knock.contacts?.last_name}
                          </h3>
                          <span className="text-sm text-gray-500">
                            {new Date(knock.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {knock.contacts && (
                          <p className="text-sm text-gray-600 mt-1">
                            {knock.contacts.address_street}
                            {knock.contacts.address_city && `, ${knock.contacts.address_city}`}
                            {knock.contacts.address_state && `, ${knock.contacts.address_state}`}
                            {knock.contacts.address_zip && ` ${knock.contacts.address_zip}`}
                          </p>
                        )}

                        {knock.subject && (
                          <p className="text-sm font-medium text-gray-700 mt-2">
                            {knock.subject}
                          </p>
                        )}

                        {knock.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {knock.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

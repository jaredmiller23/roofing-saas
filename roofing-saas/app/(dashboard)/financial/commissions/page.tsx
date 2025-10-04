import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DollarSign, Users, CheckCircle, Clock } from 'lucide-react'
import { AddCommissionButton } from './add-commission-button'
import { CommissionsList } from './commissions-list'

export default async function CommissionsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const tenantId = await getUserTenantId(user.id)
  if (!tenantId) {
    redirect('/register')
  }

  const supabase = await createClient()

  // Fetch commission summary by user
  const { data: summaryData } = await supabase
    .from('commission_summary_by_user')
    .select('*')
    .eq('tenant_id', tenantId)

  // Fetch recent commission records
  const { data: commissions } = await supabase
    .from('commission_records')
    .select(`
      id,
      user_id,
      commission_type,
      base_amount,
      commission_amount,
      final_amount,
      status,
      created_at,
      project:projects (
        id,
        name,
        project_number
      )
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  // Fetch commission plans
  const { data: plans } = await supabase
    .from('commission_plans')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  // Calculate totals
  const totalEarned = summaryData?.reduce((sum, user) => sum + (user.total_earned || 0), 0) || 0
  const totalPending = summaryData?.reduce((sum, user) => sum + (user.pending_amount || 0), 0) || 0
  const totalPaid = summaryData?.reduce((sum, user) => sum + (user.paid_amount || 0), 0) || 0
  const totalUsers = summaryData?.length || 0

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value)
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/financial/reports"
                className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
              >
                ← Back to Reports
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Commission Tracking</h1>
              <p className="text-gray-600 mt-1">Manage sales rep and canvasser commissions</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/financial/commissions/plans"
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Manage Plans
              </Link>
              <AddCommissionButton plans={plans || []} />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Earned Card */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Total Earned</h3>
              <DollarSign className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalEarned)}</p>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </div>

          {/* Pending Commissions Card */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Pending</h3>
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPending)}</p>
            <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
          </div>

          {/* Paid Commissions Card */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Paid</h3>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPaid)}</p>
            <p className="text-xs text-gray-500 mt-1">Successfully paid</p>
          </div>

          {/* Active Users Card */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Active Users</h3>
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
            <p className="text-xs text-gray-500 mt-1">With commissions</p>
          </div>
        </div>

        {/* Team Performance Table */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Team Performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team Member</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Earned</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pending</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Commissions</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {summaryData && summaryData.length > 0 ? (
                  summaryData.map((userSummary) => (
                    <tr key={userSummary.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {userSummary.user_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500">{userSummary.user_email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                        {formatCurrency(userSummary.total_earned || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 text-right">
                        {formatCurrency(userSummary.pending_amount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">
                        {formatCurrency(userSummary.paid_amount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {userSummary.total_commissions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No commission data yet. Add commissions to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Commissions */}
        <CommissionsList commissions={commissions || []} />
      </div>
    </div>
  )
}

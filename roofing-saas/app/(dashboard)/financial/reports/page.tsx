import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DollarSign, TrendingUp, TrendingDown, Briefcase, Calendar } from 'lucide-react'
import { RevenueChart } from './revenue-chart'
import { MarginByTypeChart } from './margin-by-type-chart'
import { TopPerformersTable } from './top-performers-table'

export default async function FinancialReportsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const tenantId = await getUserTenantId(user.id)
  if (!tenantId) {
    redirect('/register')
  }

  const supabase = await createClient()

  // Fetch company-wide P&L data using the view
  const { data: plData } = await supabase
    .from('project_profit_loss')
    .select('*')
    .eq('tenant_id', tenantId)

  // Calculate company-wide totals
  const totalRevenue = plData?.reduce((sum, p) => sum + (p.revenue || 0), 0) || 0
  const totalEstimatedCost = plData?.reduce((sum, p) => sum + (p.total_estimated_cost || 0), 0) || 0
  const totalActualCost = plData?.reduce((sum, p) => sum + (p.total_actual_cost || 0), 0) || 0
  const totalGrossProfit = plData?.reduce((sum, p) => sum + (p.gross_profit || 0), 0) || 0
  const avgMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0

  // Active projects count
  const activeProjects = plData?.filter(p => p.status === 'active' || p.status === 'proposal').length || 0

  // Calculate month-over-month data for trend
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  const thisMonthRevenue = plData?.filter(p => {
    if (!p.actual_completion) return false
    const completionDate = new Date(p.actual_completion)
    return completionDate.getMonth() === currentMonth && completionDate.getFullYear() === currentYear
  }).reduce((sum, p) => sum + (p.revenue || 0), 0) || 0

  const lastMonth = new Date(currentYear, currentMonth - 1)
  const lastMonthRevenue = plData?.filter(p => {
    if (!p.actual_completion) return false
    const completionDate = new Date(p.actual_completion)
    return completionDate.getMonth() === lastMonth.getMonth() && completionDate.getFullYear() === lastMonth.getFullYear()
  }).reduce((sum, p) => sum + (p.revenue || 0), 0) || 0

  const revenueGrowth = lastMonthRevenue > 0
    ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : 0

  // Group by project type for analysis
  const byType: Record<string, { revenue: number; cost: number; profit: number; count: number }> = {}
  plData?.forEach(p => {
    const type = p.project_name?.includes('Residential') ? 'Residential' :
                 p.project_name?.includes('Commercial') ? 'Commercial' : 'Other'

    if (!byType[type]) {
      byType[type] = { revenue: 0, cost: 0, profit: 0, count: 0 }
    }

    byType[type].revenue += p.revenue || 0
    byType[type].cost += p.total_actual_cost || 0
    byType[type].profit += p.gross_profit || 0
    byType[type].count += 1
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Financial Reports</h1>
              <p className="text-muted-foreground mt-1">Company-wide profit & loss analysis</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/financial/analytics"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Advanced Analytics
              </Link>
              <Link
                href="/financial/commissions"
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Commissions
              </Link>
              <Link
                href="/financial/export"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Export Reports
              </Link>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue Card */}
          <div className="bg-card rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Total Revenue</h3>
              <DollarSign className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
            <div className={`text-sm mt-2 flex items-center gap-1 ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {revenueGrowth >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {Math.abs(revenueGrowth).toFixed(1)}% vs last month
            </div>
          </div>

          {/* Total Profit Card */}
          <div className={`bg-card rounded-lg shadow p-6 border-l-4 ${totalGrossProfit >= 0 ? 'border-green-500' : 'border-red-500'}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Gross Profit</h3>
              {totalGrossProfit >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
            </div>
            <p className={`text-2xl font-bold ${totalGrossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalGrossProfit)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Margin: {avgMargin.toFixed(1)}%
            </p>
          </div>

          {/* Active Projects Card */}
          <div className="bg-card rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Active Projects</h3>
              <Briefcase className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{activeProjects}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Total: {plData?.length || 0} projects
            </p>
          </div>

          {/* Cost Variance Card */}
          <div className="bg-card rounded-lg shadow p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Cost Performance</h3>
              <Calendar className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(totalActualCost - totalEstimatedCost)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Variance from estimate
            </p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Trend Chart */}
          <RevenueChart projects={plData || []} />

          {/* Margin by Type Chart */}
          <MarginByTypeChart typeData={byType} />
        </div>

        {/* Performance Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Profitable Projects */}
          <TopPerformersTable
            title="Most Profitable Projects"
            projects={plData?.sort((a, b) => (b.gross_profit || 0) - (a.gross_profit || 0)).slice(0, 10) || []}
            metricKey="gross_profit"
            metricLabel="Profit"
          />

          {/* Highest Margin Projects */}
          <TopPerformersTable
            title="Highest Margin Projects"
            projects={plData?.sort((a, b) => (b.profit_margin_percent || 0) - (a.profit_margin_percent || 0)).slice(0, 10) || []}
            metricKey="profit_margin_percent"
            metricLabel="Margin %"
          />
        </div>

        {/* Job Type Breakdown */}
        <div className="bg-card rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border">
            <h2 className="text-xl font-semibold text-foreground">Performance by Job Type</h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Projects</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Revenue</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Cost</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Profit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Object.entries(byType).map(([type, data]) => {
                    const margin = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0
                    return (
                      <tr key={type} className="hover:bg-background">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground text-right">{data.count}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground text-right">{formatCurrency(data.revenue)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground text-right">{formatCurrency(data.cost)}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${data.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(data.profit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground text-right">{margin.toFixed(1)}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

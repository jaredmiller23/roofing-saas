import { getCurrentUser } from '@/lib/auth/session'
import { getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'

export default async function FinancialsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const tenantId = await getUserTenantId(user.id)
  if (!tenantId) {
    redirect('/register')
  }

  const supabase = await createClient()

  // Fetch P&L data
  const { data: profitLoss } = await supabase
    .from('project_profit_loss')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('actual_start', { ascending: false })

  // Calculate summary metrics
  const summary = (profitLoss || []).reduce(
    (acc, item) => {
      acc.total_revenue += Number(item.revenue) || 0
      acc.total_cost += Number(item.total_actual_cost) || 0
      acc.total_profit += Number(item.gross_profit) || 0
      acc.project_count += 1

      // Track profitable vs loss projects
      if (Number(item.gross_profit) > 0) {
        acc.profitable_projects += 1
      } else if (Number(item.gross_profit) < 0) {
        acc.loss_projects += 1
      }

      return acc
    },
    {
      total_revenue: 0,
      total_cost: 0,
      total_profit: 0,
      project_count: 0,
      profitable_projects: 0,
      loss_projects: 0,
    }
  )

  const profitMargin = summary.total_revenue > 0
    ? ((summary.total_profit / summary.total_revenue) * 100).toFixed(2)
    : '0.00'

  // Cost variance analysis (for future chart)
  const _varianceData = (profitLoss || []).map(project => ({
    name: project.project_name,
    variance: Number(project.cost_variance) || 0,
    margin: Number(project.profit_margin_percent) || 0,
  }))

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Financial Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Profit & Loss reporting and job costing analysis
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.total_revenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {summary.project_count} projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.total_cost)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Actual project costs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
            <TrendingUp className={`h-4 w-4 ${summary.total_profit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.total_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary.total_profit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {profitMargin}% profit margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project Performance</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.profitable_projects}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Profitable projects ({summary.loss_projects} losses)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* P&L Table */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Project Profit & Loss</CardTitle>
          <CardDescription>
            Detailed P&L breakdown by project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Project</th>
                  <th className="text-right py-3 px-4">Revenue</th>
                  <th className="text-right py-3 px-4">Labor</th>
                  <th className="text-right py-3 px-4">Materials</th>
                  <th className="text-right py-3 px-4">Equipment</th>
                  <th className="text-right py-3 px-4">Other</th>
                  <th className="text-right py-3 px-4">Total Cost</th>
                  <th className="text-right py-3 px-4">Profit</th>
                  <th className="text-right py-3 px-4">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {(profitLoss || []).map((project) => (
                  <tr key={project.project_id} className="border-b hover:bg-background">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{project.project_name}</div>
                        <div className="text-sm text-muted-foreground">{project.project_number}</div>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">
                      {formatCurrency(Number(project.revenue) || 0)}
                    </td>
                    <td className="text-right py-3 px-4 text-muted-foreground">
                      {formatCurrency(Number(project.actual_labor) || 0)}
                    </td>
                    <td className="text-right py-3 px-4 text-muted-foreground">
                      {formatCurrency(Number(project.actual_materials) || 0)}
                    </td>
                    <td className="text-right py-3 px-4 text-muted-foreground">
                      {formatCurrency(Number(project.actual_equipment) || 0)}
                    </td>
                    <td className="text-right py-3 px-4 text-muted-foreground">
                      {formatCurrency(Number(project.actual_other) || 0)}
                    </td>
                    <td className="text-right py-3 px-4 font-medium">
                      {formatCurrency(Number(project.total_actual_cost) || 0)}
                    </td>
                    <td className={`text-right py-3 px-4 font-semibold ${
                      Number(project.gross_profit) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(Number(project.gross_profit) || 0)}
                    </td>
                    <td className={`text-right py-3 px-4 ${
                      Number(project.profit_margin_percent) >= 20 ? 'text-green-600' :
                      Number(project.profit_margin_percent) >= 10 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {Number(project.profit_margin_percent || 0).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Variance Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Variance Analysis</CardTitle>
          <CardDescription>
            Estimated vs Actual cost comparison
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(profitLoss || []).slice(0, 5).map((project) => {
              const variance = Number(project.cost_variance) || 0
              const variancePercent = project.total_estimated_cost > 0
                ? (variance / Number(project.total_estimated_cost) * 100).toFixed(1)
                : '0.0'

              return (
                <div key={project.project_id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{project.project_name}</div>
                    <div className="text-sm text-muted-foreground">
                      Est: {formatCurrency(Number(project.total_estimated_cost) || 0)} |
                      Actual: {formatCurrency(Number(project.total_actual_cost) || 0)}
                    </div>
                  </div>
                  <div className={`text-right ${variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    <div className="font-semibold">
                      {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                    </div>
                    <div className="text-sm">
                      {variance > 0 ? '+' : ''}{variancePercent}%
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

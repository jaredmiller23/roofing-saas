import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, DollarSign, AlertTriangle, Package, BarChart3 } from 'lucide-react'
import { RevenueForecast } from './revenue-forecast'
import { CashFlowProjection } from './cash-flow-projection'
import { CostTrendAnalysis } from './cost-trend-analysis'
import { MarginAnalysis } from './margin-analysis'
import { MaterialWasteTracking } from './material-waste-tracking'

export default async function FinancialAnalyticsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const tenantId = await getUserTenantId(user.id)
  if (!tenantId) {
    redirect('/register')
  }

  const supabase = await createClient()

  // Fetch projects with financial data
  const { data: projects } = await supabase
    .from('project_profit_loss')
    .select('*')
    .eq('tenant_id', tenantId)

  // Fetch job expenses for cost analysis
  const { data: expenses } = await supabase
    .from('job_expenses')
    .select(`
      id,
      project_id,
      expense_type,
      category,
      amount,
      expense_date,
      vendor_name
    `)
    .eq('tenant_id', tenantId)
    .order('expense_date', { ascending: false })
    .limit(500)

  // Fetch material purchases for waste analysis
  const { data: materials } = await supabase
    .from('material_purchases')
    .select('*')
    .eq('tenant_id', tenantId)
    .limit(100)

  // Fetch financial configuration for configurable ratios
  const { data: financialConfig } = await supabase
    .from('financial_configs')
    .select('forecast_blend_historical, forecast_blend_pipeline, cost_rate, margin_excellent, margin_good, margin_fair, margin_target, seasonal_adjustments')
    .eq('tenant_id', tenantId)
    .single()

  // Calculate pipeline data for forecasting
  const pipelineProjects = projects?.filter(p =>
    p.status === 'prospect' || p.status === 'quote_sent' || p.status === 'negotiation'
  ) || []

  const completedProjects = projects?.filter(p =>
    p.status === 'won' && p.actual_completion
  ) || []

  // Calculate close rate
  const totalOpportunities = projects?.filter(p =>
    p.status === 'won' || p.status === 'lost'
  ).length || 0
  const wonOpportunities = projects?.filter(p => p.status === 'won').length || 0
  const closeRate = totalOpportunities > 0 ? (wonOpportunities / totalOpportunities) * 100 : 0

  // AR aging analysis
  const today = new Date()
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000)
  const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)

  const arAging = {
    current: 0,
    days30: 0,
    days60: 0,
    days90plus: 0,
  }

  completedProjects.forEach(project => {
    const balanceDue = (project.revenue || 0) - ((project as { payments_received?: number }).payments_received || 0)
    if (balanceDue <= 0) return

    const completionDate = new Date(project.actual_completion!)

    if (completionDate > thirtyDaysAgo) {
      arAging.current += balanceDue
    } else if (completionDate > sixtyDaysAgo) {
      arAging.days30 += balanceDue
    } else if (completionDate > ninetyDaysAgo) {
      arAging.days60 += balanceDue
    } else {
      arAging.days90plus += balanceDue
    }
  })

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/financial/reports"
                className="text-sm text-primary hover:text-primary/80 mb-2 inline-block"
              >
                ← Back to Reports
              </Link>
              <h1 className="text-3xl font-bold text-foreground">Advanced Analytics</h1>
              <p className="text-muted-foreground mt-1">Forecasting, trends, and predictive insights</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-card rounded-lg shadow p-4 border-l-4 border-primary">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-medium text-muted-foreground">Close Rate</h3>
            </div>
            <p className="text-xl font-bold text-foreground">{closeRate.toFixed(1)}%</p>
          </div>

          <div className="bg-card rounded-lg shadow p-4 border-l-4 border-secondary">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-secondary" />
              <h3 className="text-xs font-medium text-muted-foreground">Pipeline</h3>
            </div>
            <p className="text-xl font-bold text-foreground">{pipelineProjects.length}</p>
          </div>

          <div className="bg-card rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-green-500" />
              <h3 className="text-xs font-medium text-muted-foreground">AR Current</h3>
            </div>
            <p className="text-xl font-bold text-foreground">
              ${(arAging.current / 1000).toFixed(0)}K
            </p>
          </div>

          <div className="bg-card rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <h3 className="text-xs font-medium text-muted-foreground">AR 30-60</h3>
            </div>
            <p className="text-xl font-bold text-foreground">
              ${(arAging.days30 / 1000).toFixed(0)}K
            </p>
          </div>

          <div className="bg-card rounded-lg shadow p-4 border-l-4 border-red-500">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-red-500" />
              <h3 className="text-xs font-medium text-muted-foreground">AR 90+</h3>
            </div>
            <p className="text-xl font-bold text-foreground">
              ${(arAging.days90plus / 1000).toFixed(0)}K
            </p>
          </div>
        </div>

        {/* Revenue Forecasting */}
        <RevenueForecast
          pipelineProjects={pipelineProjects}
          completedProjects={completedProjects}
          closeRate={closeRate}
          financialSettings={financialConfig ? {
            forecastBlendHistorical: Number(financialConfig.forecast_blend_historical),
            forecastBlendPipeline: Number(financialConfig.forecast_blend_pipeline),
            seasonalAdjustments: financialConfig.seasonal_adjustments as Record<string, number> | undefined,
          } : undefined}
        />

        {/* Cash Flow Projection */}
        <CashFlowProjection
          projects={completedProjects}
          arAging={arAging}
          costRate={financialConfig ? Number(financialConfig.cost_rate) : undefined}
        />

        {/* Cost Trend Analysis */}
        <CostTrendAnalysis expenses={expenses || []} />

        {/* Margin Analysis */}
        <MarginAnalysis
          projects={projects || []}
          marginThresholds={financialConfig ? {
            excellent: Number(financialConfig.margin_excellent),
            good: Number(financialConfig.margin_good),
            fair: Number(financialConfig.margin_fair),
            target: Number(financialConfig.margin_target),
          } : undefined}
        />

        {/* Material Waste Tracking */}
        <MaterialWasteTracking materials={materials || []} />
      </div>
    </div>
  )
}

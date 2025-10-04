import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { AddExpenseButton } from './add-expense-button'
import { ExpensesList } from './expenses-list'

interface CostingPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectCostingPage({ params }: CostingPageProps) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const tenantId = await getUserTenantId(user.id)
  if (!tenantId) {
    redirect('/register')
  }

  const { id } = await params
  const supabase = await createClient()

  // Fetch project with cost data
  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      project_number,
      status,
      estimated_labor_cost,
      actual_labor_cost,
      estimated_material_cost,
      actual_material_cost,
      estimated_equipment_cost,
      actual_equipment_cost,
      estimated_other_cost,
      actual_other_cost,
      total_revenue,
      final_value,
      approved_value,
      estimated_value
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)
    .single()

  if (error || !project) {
    notFound()
  }

  // Fetch job expenses for detailed breakdown
  const { data: expenses } = await supabase
    .from('job_expenses')
    .select(`
      id,
      expense_type,
      category,
      description,
      amount,
      vendor_name,
      expense_date,
      is_approved
    `)
    .eq('project_id', id)
    .eq('tenant_id', tenantId)
    .order('expense_date', { ascending: false })

  // Calculate totals
  const revenue = project.total_revenue || project.final_value || project.approved_value || project.estimated_value || 0

  const estimatedLabor = project.estimated_labor_cost || 0
  const actualLabor = project.actual_labor_cost || 0
  const estimatedMaterials = project.estimated_material_cost || 0
  const actualMaterials = project.actual_material_cost || 0
  const estimatedEquipment = project.estimated_equipment_cost || 0
  const actualEquipment = project.actual_equipment_cost || 0
  const estimatedOther = project.estimated_other_cost || 0
  const actualOther = project.actual_other_cost || 0

  const totalEstimatedCost = estimatedLabor + estimatedMaterials + estimatedEquipment + estimatedOther
  const totalActualCost = actualLabor + actualMaterials + actualEquipment + actualOther

  const estimatedProfit = revenue - totalEstimatedCost
  const actualProfit = revenue - totalActualCost
  const estimatedMargin = revenue > 0 ? (estimatedProfit / revenue) * 100 : 0
  const actualMargin = revenue > 0 ? (actualProfit / revenue) * 100 : 0

  const costVariance = totalActualCost - totalEstimatedCost

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value)
  }

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-red-600' // Over budget is bad
    if (variance < 0) return 'text-green-600' // Under budget is good
    return 'text-gray-600'
  }

  const getProfitColor = (profit: number) => {
    if (profit > 0) return 'text-green-600'
    if (profit < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const categories = [
    {
      name: 'Labor',
      estimated: estimatedLabor,
      actual: actualLabor,
      variance: actualLabor - estimatedLabor,
      color: 'blue'
    },
    {
      name: 'Materials',
      estimated: estimatedMaterials,
      actual: actualMaterials,
      variance: actualMaterials - estimatedMaterials,
      color: 'purple'
    },
    {
      name: 'Equipment',
      estimated: estimatedEquipment,
      actual: actualEquipment,
      variance: actualEquipment - estimatedEquipment,
      color: 'orange'
    },
    {
      name: 'Other',
      estimated: estimatedOther,
      actual: actualOther,
      variance: actualOther - estimatedOther,
      color: 'gray'
    },
  ]

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/projects/${id}`}
            className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to Project
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Job Costing</h1>
              <p className="text-sm text-gray-500 mt-1">
                {project.name} • Project #{project.project_number}
              </p>
            </div>
            <AddExpenseButton projectId={id} />
          </div>
        </div>

        {/* P&L Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Revenue Card */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Revenue</h3>
              <DollarSign className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(revenue)}</p>
          </div>

          {/* Estimated Cost Card */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gray-400">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Estimated Cost</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalEstimatedCost)}</p>
            <p className="text-sm text-gray-500 mt-1">
              Margin: {estimatedMargin.toFixed(1)}%
            </p>
          </div>

          {/* Actual Cost Card */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Actual Cost</h3>
              <AlertCircle className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalActualCost)}</p>
            <p className={`text-sm mt-1 ${getVarianceColor(costVariance)}`}>
              {costVariance >= 0 ? '+' : ''}{formatCurrency(costVariance)} variance
            </p>
          </div>

          {/* Profit Card */}
          <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${actualProfit >= 0 ? 'border-green-500' : 'border-red-500'}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Actual Profit</h3>
              {actualProfit >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
            </div>
            <p className={`text-2xl font-bold ${getProfitColor(actualProfit)}`}>
              {formatCurrency(actualProfit)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Margin: {actualMargin.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Budget vs Actual Breakdown */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Budget vs Actual Breakdown</h2>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {categories.map((category) => {
                const percentActual = category.estimated > 0
                  ? (category.actual / category.estimated) * 100
                  : 0
                const isOverBudget = category.variance > 0

                return (
                  <div key={category.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{category.name}</h3>
                        <p className="text-xs text-gray-500">
                          Budget: {formatCurrency(category.estimated)} •
                          Actual: {formatCurrency(category.actual)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${getVarianceColor(category.variance)}`}>
                          {category.variance >= 0 ? '+' : ''}{formatCurrency(category.variance)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {percentActual.toFixed(0)}% of budget
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative pt-1">
                      <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                        <div
                          style={{ width: `${Math.min(percentActual, 100)}%` }}
                          className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                            isOverBudget ? 'bg-red-500' : 'bg-green-500'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Total Row */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Total</h3>
                    <p className="text-sm text-gray-500">
                      Budget: {formatCurrency(totalEstimatedCost)} •
                      Actual: {formatCurrency(totalActualCost)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${getVarianceColor(costVariance)}`}>
                      {costVariance >= 0 ? '+' : ''}{formatCurrency(costVariance)}
                    </p>
                    <p className="text-sm text-gray-500">Total Variance</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expenses List */}
        <ExpensesList expenses={expenses || []} projectId={id} />
      </div>
    </div>
  )
}

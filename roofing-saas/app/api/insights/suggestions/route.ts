import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { type QuerySuggestion } from '@/lib/ai/query-types'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const role = url.searchParams.get('role') || 'user'
    const tenantId = url.searchParams.get('tenant')

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get data context for personalized suggestions
    const [contactsResult, projectsResult, revenueResult] = await Promise.allSettled([
      supabase.from('contacts').select('status', { count: 'exact' }).eq('tenant_id', tenantId),
      supabase.from('projects').select('status', { count: 'exact' }).eq('tenant_id', tenantId),
      supabase.from('project_profit_loss').select('revenue', { count: 'exact' }).eq('tenant_id', tenantId)
    ])

    const hasContacts = contactsResult.status === 'fulfilled' && (contactsResult.value.count || 0) > 0
    const hasProjects = projectsResult.status === 'fulfilled' && (projectsResult.value.count || 0) > 0
    const hasRevenue = revenueResult.status === 'fulfilled' && (revenueResult.value.count || 0) > 0

    // Base suggestions available to all roles
    const baseSuggestions: QuerySuggestion[] = []

    // Add suggestions based on available data
    if (hasContacts) {
      baseSuggestions.push(
        {
          id: 'leads-this-month',
          title: 'New Leads This Month',
          description: 'Count of new leads generated this month',
          query: 'How many leads did we get this month?',
          category: 'Leads',
          icon: 'search',
          estimatedTime: 1,
          popularity: 90
        },
        {
          id: 'leads-by-source',
          title: 'Lead Sources',
          description: 'Breakdown of leads by their source',
          query: 'Show me leads by source',
          category: 'Leads',
          icon: 'search',
          estimatedTime: 2,
          popularity: 77
        },
        {
          id: 'conversion-rate',
          title: 'Lead Conversion Rate',
          description: 'Percentage of leads that became customers',
          query: 'What is our lead conversion rate?',
          category: 'Leads',
          icon: 'search',
          estimatedTime: 3,
          popularity: 82
        }
      )
    }

    if (hasProjects) {
      baseSuggestions.push(
        {
          id: 'active-projects',
          title: 'Active Projects',
          description: 'Count of currently active projects',
          query: 'How many active projects do we have?',
          category: 'Projects',
          icon: 'sparkles',
          estimatedTime: 1,
          popularity: 92
        },
        {
          id: 'overdue-projects',
          title: 'Overdue Projects',
          description: 'Find projects that are past their due date',
          query: 'Show me overdue projects',
          category: 'Projects',
          icon: 'sparkles',
          estimatedTime: 2,
          popularity: 85
        },
        {
          id: 'projects-by-status',
          title: 'Projects by Status',
          description: 'Breakdown of projects by their current status',
          query: 'Show me projects by status',
          category: 'Projects',
          icon: 'sparkles',
          estimatedTime: 2,
          popularity: 78
        }
      )
    }

    if (hasRevenue) {
      baseSuggestions.push(
        {
          id: 'revenue-this-month',
          title: 'Revenue This Month',
          description: 'See total revenue generated this month',
          query: 'What was our total revenue this month?',
          category: 'Revenue',
          icon: 'trending',
          estimatedTime: 2,
          popularity: 95
        },
        {
          id: 'revenue-growth',
          title: 'Revenue Growth',
          description: 'Compare this month vs last month revenue',
          query: 'Compare this month vs last month revenue',
          category: 'Revenue',
          icon: 'trending',
          estimatedTime: 3,
          popularity: 88
        },
        {
          id: 'avg-project-value',
          title: 'Average Project Value',
          description: 'What is the average value of our projects?',
          query: 'What is our average project value?',
          category: 'Revenue',
          icon: 'trending',
          estimatedTime: 2,
          popularity: 75
        },
        {
          id: 'top-performers',
          title: 'Top Performing Projects',
          description: 'Projects with highest profit margins',
          query: 'Which projects are most profitable?',
          category: 'Performance',
          icon: 'trending',
          estimatedTime: 2,
          popularity: 71
        }
      )
    }

    // Role-specific suggestions
    const roleSuggestions: QuerySuggestion[] = []

    switch (role.toLowerCase()) {
      case 'admin':
      case 'manager':
        if (hasRevenue) {
          roleSuggestions.push(
            {
              id: 'quarterly-performance',
              title: 'Quarterly Performance',
              description: 'Revenue and profit analysis for this quarter',
              query: 'What is our revenue growth this quarter?',
              category: 'Performance',
              icon: 'trending',
              estimatedTime: 4,
              popularity: 65
            },
            {
              id: 'cost-analysis',
              title: 'Cost Analysis',
              description: 'Breakdown of costs vs revenue this month',
              query: 'Show me cost analysis for this month',
              category: 'Financial',
              icon: 'trending',
              estimatedTime: 3,
              popularity: 60
            }
          )
        }
        if (hasProjects) {
          roleSuggestions.push({
            id: 'team-performance',
            title: 'Team Performance',
            description: 'Compare performance across team members',
            query: 'Which team member has the highest performance?',
            category: 'Performance',
            icon: 'trending',
            estimatedTime: 3,
            popularity: 68
          })
        }
        break

      case 'sales':
      case 'salesperson':
        if (hasContacts) {
          roleSuggestions.push(
            {
              id: 'my-leads',
              title: 'My Lead Generation',
              description: 'Leads generated by me this month',
              query: 'How many leads did I generate this month?',
              category: 'Personal',
              icon: 'search',
              estimatedTime: 2,
              popularity: 85
            },
            {
              id: 'my-conversion',
              title: 'My Conversion Rate',
              description: 'My personal conversion rate',
              query: 'What is my conversion rate?',
              category: 'Personal',
              icon: 'search',
              estimatedTime: 2,
              popularity: 80
            }
          )
        }
        if (hasRevenue) {
          roleSuggestions.push({
            id: 'pipeline-value',
            title: 'Pipeline Value',
            description: 'Total value in my sales pipeline',
            query: 'Show me my pipeline value',
            category: 'Personal',
            icon: 'trending',
            estimatedTime: 2,
            popularity: 75
          })
        }
        break

      case 'operations':
      case 'project_manager':
        if (hasProjects) {
          roleSuggestions.push(
            {
              id: 'behind-schedule',
              title: 'Behind Schedule',
              description: 'Projects that are behind their scheduled timeline',
              query: 'Which projects are behind schedule?',
              category: 'Operations',
              icon: 'sparkles',
              estimatedTime: 2,
              popularity: 88
            },
            {
              id: 'completion-rate',
              title: 'Completion Rate',
              description: 'Project completion rate this month',
              query: 'What is our project completion rate?',
              category: 'Operations',
              icon: 'sparkles',
              estimatedTime: 2,
              popularity: 70
            },
            {
              id: 'resource-utilization',
              title: 'Resource Utilization',
              description: 'How efficiently are we using our resources',
              query: 'Show me resource utilization',
              category: 'Operations',
              icon: 'sparkles',
              estimatedTime: 3,
              popularity: 65
            }
          )
        }
        break
    }

    // Combine and sort suggestions
    const allSuggestions = [...baseSuggestions, ...roleSuggestions]
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))

    // Add some general data exploration suggestions if we have any data
    const hasAnyData = hasContacts || hasProjects || hasRevenue
    if (hasAnyData) {
      allSuggestions.push(
        {
          id: 'data-summary',
          title: 'Data Summary',
          description: 'Get an overview of all your data',
          query: 'Give me a summary of our business data',
          category: 'Overview',
          icon: 'sparkles',
          estimatedTime: 3,
          popularity: 50
        },
        {
          id: 'this-month-overview',
          title: 'This Month Overview',
          description: 'Key metrics for the current month',
          query: 'Show me key metrics for this month',
          category: 'Overview',
          icon: 'trending',
          estimatedTime: 4,
          popularity: 55
        }
      )
    }

    // If no data, suggest getting started
    if (!hasAnyData) {
      allSuggestions.push({
        id: 'getting-started',
        title: 'Getting Started',
        description: 'Learn what data you can explore',
        query: 'What data do I have access to?',
        category: 'Getting Started',
        icon: 'sparkles',
        estimatedTime: 1,
        popularity: 100
      })
    }

    return NextResponse.json({
      suggestions: allSuggestions,
      hasData: {
        contacts: hasContacts,
        projects: hasProjects,
        revenue: hasRevenue
      },
      role
    })

  } catch (error) {
    console.error('Failed to generate suggestions:', error)

    return NextResponse.json({
      suggestions: [
        {
          id: 'fallback-query',
          title: 'Ask a Question',
          description: 'Try asking about your leads, projects, or revenue',
          query: 'How many active projects do we have?',
          category: 'General',
          icon: 'sparkles',
          estimatedTime: 2,
          popularity: 50
        }
      ],
      hasData: { contacts: false, projects: false, revenue: false },
      role: 'user'
    })
  }
}
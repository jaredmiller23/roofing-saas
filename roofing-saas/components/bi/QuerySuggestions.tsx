'use client'

import * as React from 'react'
import {
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Target,
  BarChart3,
  PieChart,
  Activity,
  Clock,
  Star,
  Zap,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { type QuerySuggestion } from '@/lib/ai/query-types'

interface QuerySuggestionsProps {
  suggestions?: QuerySuggestion[]
  onQuerySelect: (query: string) => void
  userRole?: string
  isLoading?: boolean
}

// Default suggestions based on common business intelligence needs
const DEFAULT_SUGGESTIONS: QuerySuggestion[] = [
  // Performance & Revenue
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

  // Projects & Operations
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
  },

  // Leads & Customers
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
    id: 'conversion-rate',
    title: 'Lead Conversion Rate',
    description: 'Percentage of leads that became customers',
    query: 'What is our lead conversion rate?',
    category: 'Leads',
    icon: 'search',
    estimatedTime: 3,
    popularity: 82
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

  // Performance Analysis
  {
    id: 'top-performers',
    title: 'Top Performing Projects',
    description: 'Projects with highest profit margins',
    query: 'Which projects are most profitable?',
    category: 'Performance',
    icon: 'trending',
    estimatedTime: 2,
    popularity: 71
  },
  {
    id: 'sales-rep-performance',
    title: 'Sales Rep Performance',
    description: 'Compare performance across sales team',
    query: 'Which sales rep has the highest close rate?',
    category: 'Performance',
    icon: 'trending',
    estimatedTime: 3,
    popularity: 68
  }
]

const CATEGORY_ICONS = {
  'Revenue': DollarSign,
  'Projects': Target,
  'Leads': Users,
  'Performance': TrendingUp,
  'Analytics': BarChart3,
  'Time': Calendar
} as const

const SUGGESTION_ICONS = {
  'trending': TrendingUp,
  'search': Users,
  'sparkles': Zap
} as const

export function QuerySuggestions({
  suggestions = DEFAULT_SUGGESTIONS,
  onQuerySelect,
  userRole = 'user',
  isLoading = false
}: QuerySuggestionsProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null)

  // Group suggestions by category
  const categorizedSuggestions = React.useMemo(() => {
    const groups: Record<string, QuerySuggestion[]> = {}
    suggestions.forEach(suggestion => {
      if (!groups[suggestion.category]) {
        groups[suggestion.category] = []
      }
      groups[suggestion.category].push(suggestion)
    })

    // Sort each category by popularity
    Object.keys(groups).forEach(category => {
      groups[category].sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    })

    return groups
  }, [suggestions])

  const filteredSuggestions = selectedCategory
    ? { [selectedCategory]: categorizedSuggestions[selectedCategory] }
    : categorizedSuggestions

  const categories = Object.keys(categorizedSuggestions)

  if (isLoading) {
    return <SuggestionsSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Explore Your Data</h2>
        <p className="text-muted-foreground">
          Get insights with these popular questions, or ask anything in natural language.
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          All Categories
        </Button>
        {categories.map((category) => {
          const Icon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || Activity
          return (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="flex items-center gap-1"
            >
              <Icon className="h-4 w-4" />
              {category}
            </Button>
          )
        })}
      </div>

      {/* Suggestions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(filteredSuggestions).map(([category, categorySuggestions]) =>
          categorySuggestions.slice(0, selectedCategory ? 20 : 6).map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onSelect={() => onQuerySelect(suggestion.query)}
            />
          ))
        )}
      </div>

      {/* Popular Queries Section */}
      {!selectedCategory && (
        <div className="bg-muted/30 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-foreground">Most Popular This Week</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions
              .filter(s => (s.popularity || 0) >= 85)
              .slice(0, 4)
              .map((suggestion) => (
                <Button
                  key={suggestion.id}
                  variant="ghost"
                  className="justify-between h-auto p-3 text-left"
                  onClick={() => onQuerySelect(suggestion.query)}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{suggestion.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {suggestion.description}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              ))}
          </div>
        </div>
      )}

      {/* Quick Actions for Role */}
      {userRole && (
        <RoleBasedQuickActions
          role={userRole}
          onQuerySelect={onQuerySelect}
        />
      )}
    </div>
  )
}

function SuggestionCard({
  suggestion,
  onSelect
}: {
  suggestion: QuerySuggestion
  onSelect: () => void
}) {
  const Icon = suggestion.icon
    ? SUGGESTION_ICONS[suggestion.icon as keyof typeof SUGGESTION_ICONS]
    : Activity

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={onSelect}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Icon className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {suggestion.estimatedTime && (
              <>
                <Clock className="h-3 w-3" />
                <span>{suggestion.estimatedTime}s</span>
              </>
            )}
          </div>
        </div>
        <CardTitle className="text-sm">{suggestion.title}</CardTitle>
        <CardDescription className="text-xs">
          {suggestion.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            {suggestion.category}
          </Badge>
          {suggestion.popularity && suggestion.popularity >= 80 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 text-yellow-500 fill-current" />
              <span>Popular</span>
            </div>
          )}
        </div>
        <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" className="w-full">
            Ask This Question
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function RoleBasedQuickActions({
  role,
  onQuerySelect
}: {
  role: string
  onQuerySelect: (query: string) => void
}) {
  const quickActions = React.useMemo(() => {
    switch (role.toLowerCase()) {
      case 'admin':
      case 'manager':
        return [
          'What is our revenue growth this quarter?',
          'Which team member has the highest performance?',
          'Show me cost analysis for this month',
          'What are our top 5 most profitable projects?'
        ]
      case 'sales':
      case 'salesperson':
        return [
          'How many leads did I generate this month?',
          'What is my conversion rate?',
          'Show me my pipeline value',
          'Which prospects should I follow up with?'
        ]
      case 'operations':
      case 'project_manager':
        return [
          'Which projects are behind schedule?',
          'Show me resource utilization',
          'What is our project completion rate?',
          'Which projects need attention?'
        ]
      default:
        return [
          'What is our current revenue?',
          'How many active projects do we have?',
          'Show me recent leads',
          'What is our team performance?'
        ]
    }
  }, [role])

  return (
    <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">
          Quick Actions for {role.charAt(0).toUpperCase() + role.slice(1)}
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {quickActions.map((action, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="justify-start text-left h-auto p-3"
            onClick={() => onQuerySelect(action)}
          >
            <span className="truncate">{action}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}

function SuggestionsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 bg-muted rounded w-48 mb-2" />
        <div className="h-4 bg-muted rounded w-96" />
      </div>

      <div className="flex gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 bg-muted rounded w-20" />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex justify-between">
                <div className="h-5 w-5 bg-muted rounded" />
                <div className="h-3 w-8 bg-muted rounded" />
              </div>
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-full" />
            </CardHeader>
            <CardContent>
              <div className="h-6 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
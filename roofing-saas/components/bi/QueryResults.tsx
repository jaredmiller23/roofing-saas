'use client'

import * as React from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import {
  Download,
  Star,
  StarOff,
  Clock,
  Database,
  AlertCircle,
  Eye,
  Copy,
  MoreVertical
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { type QueryResult, type VisualizationType } from '@/lib/ai/query-types'

interface QueryResultsProps {
  result: QueryResult | null
  query: string
  isLoading?: boolean
  isFavorite?: boolean
  onToggleFavorite?: () => void
  onExportCSV?: () => void
  onExportPDF?: () => void
  onViewSQL?: () => void
}

// Chart color palette
const CHART_COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#06B6D4', // cyan-500
  '#84CC16', // lime-500
  '#F97316', // orange-500
]

export function QueryResults({
  result,
  query,
  isLoading = false,
  isFavorite = false,
  onToggleFavorite,
  onExportCSV,
  onExportPDF,
  onViewSQL
}: QueryResultsProps) {
  if (isLoading) {
    return <QueryResultsSkeleton query={query} />
  }

  if (!result) {
    return null
  }

  if (!result.success) {
    return <QueryError error={result.error || 'Unknown error occurred'} query={query} />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-1">Results for: &quot;{query}&quot;</h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              <span>{result.data.length.toLocaleString()} rows</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{result.metadata.executionTime}ms</span>
            </div>
            {result.metadata.fromCache && (
              <Badge variant="outline" className="text-green-600">
                Cached
              </Badge>
            )}
            <Badge
              variant={result.metadata.riskLevel === 'LOW' ? 'default' : 'destructive'}
              className={
                result.metadata.riskLevel === 'LOW' ? 'bg-green-100 text-green-700' :
                result.metadata.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }
            >
              {result.metadata.riskLevel} Risk
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleFavorite}
            className="flex items-center gap-1"
          >
            {isFavorite ? (
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
            ) : (
              <StarOff className="h-4 w-4" />
            )}
            {isFavorite ? 'Favorited' : 'Add to Favorites'}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportPDF}>
                <Download className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onViewSQL}>
                <Eye className="h-4 w-4 mr-2" />
                View SQL
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(query)}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Query
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Visualization */}
      <div className="bg-card rounded-lg border p-6">
        {result.data.length === 0 ? (
          <div className="py-12 text-center">
            <Database className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No data found for this query.</p>
          </div>
        ) : (
          <QueryVisualization
            data={result.data}
            columns={result.columns}
            visualization={result.visualization}
          />
        )}
      </div>
    </div>
  )
}

function QueryVisualization({
  data,
  columns,
  visualization
}: {
  data: Record<string, unknown>[]
  columns: Array<{ name: string; type: string; description?: string; format?: string }>
  visualization: VisualizationType
}) {
  const chartData = React.useMemo(() => {
    return data.map((row, index) => ({
      ...row,
      _index: index
    }))
  }, [data])

  switch (visualization) {
    case 'number':
      return <NumberVisualization data={data} columns={columns} />

    case 'bar':
      return <BarVisualization data={chartData} columns={columns} />

    case 'line':
      return <LineVisualization data={chartData} columns={columns} />

    case 'pie':
      return <PieVisualization data={chartData} columns={columns} />

    case 'area':
      return <AreaVisualization data={chartData} columns={columns} />

    case 'table':
    default:
      return <TableVisualization data={data} columns={columns} />
  }
}

function NumberVisualization({ data, columns }: { data: Record<string, unknown>[], columns: Array<{ name: string; type: string; description?: string }> }) {
  const numericColumn = columns.find(col => col.type === 'number')
  const value = data[0]?.[numericColumn?.name || Object.keys(data[0] || {})[0]] || 0

  return (
    <div className="text-center py-8">
      <div className="text-4xl font-bold text-primary mb-2">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-muted-foreground">
        {numericColumn?.description || numericColumn?.name || 'Result'}
      </div>
    </div>
  )
}

function BarVisualization({ data, columns }: { data: Record<string, unknown>[], columns: Array<{ name: string; type: string }> }) {
  const stringColumn = columns.find(col => col.type === 'string')?.name || Object.keys(data[0] || {})[0]
  const numericColumn = columns.find(col => col.type === 'number')?.name || Object.keys(data[0] || {})[1]

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.slice(0, 20)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey={stringColumn}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis />
          <Tooltip />
          <Bar dataKey={numericColumn} fill={CHART_COLORS[0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function LineVisualization({ data, columns }: { data: Record<string, unknown>[], columns: Array<{ name: string; type: string }> }) {
  const xColumn = columns.find(col => col.type === 'date' || col.type === 'string')?.name || Object.keys(data[0] || {})[0]
  const yColumn = columns.find(col => col.type === 'number')?.name || Object.keys(data[0] || {})[1]

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.slice(0, 50)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xColumn} />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey={yColumn}
            stroke={CHART_COLORS[0]}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function PieVisualization({ data, columns }: { data: Record<string, unknown>[], columns: Array<{ name: string; type: string }> }) {
  const labelColumn = columns.find(col => col.type === 'string')?.name || Object.keys(data[0] || {})[0]
  const valueColumn = columns.find(col => col.type === 'number')?.name || Object.keys(data[0] || {})[1]

  const pieData = data.slice(0, 8).map((item, index) => ({
    name: item[labelColumn],
    value: item[valueColumn],
    fill: CHART_COLORS[index % CHART_COLORS.length]
  }))

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) => `${entry.name}: ${(entry.percent * 100).toFixed(0)}%`}
            outerRadius={80}
            dataKey="value"
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function AreaVisualization({ data, columns }: { data: Record<string, unknown>[], columns: Array<{ name: string; type: string }> }) {
  const xColumn = columns.find(col => col.type === 'date' || col.type === 'string')?.name || Object.keys(data[0] || {})[0]
  const yColumn = columns.find(col => col.type === 'number')?.name || Object.keys(data[0] || {})[1]

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.slice(0, 50)} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xColumn} />
          <YAxis />
          <Tooltip />
          <Area
            type="monotone"
            dataKey={yColumn}
            stroke={CHART_COLORS[2]}
            fill={CHART_COLORS[2]}
            fillOpacity={0.6}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function TableVisualization({ data, columns }: { data: Record<string, unknown>[], columns: Array<{ name: string; type: string; format?: string }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            {columns.map((column) => (
              <th key={column.name} className="text-left p-2 font-medium">
                {column.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 100).map((row, index) => (
            <tr key={index} className="border-b hover:bg-muted/50">
              {columns.map((column) => (
                <td key={column.name} className="p-2">
                  {formatCellValue(row[column.name], column.type, column.format)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 100 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          Showing first 100 rows of {data.length.toLocaleString()} total
        </div>
      )}
    </div>
  )
}

function formatCellValue(value: unknown, type: string, _format?: string): string {
  if (value == null) return ''

  switch (type) {
    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : String(value)
    case 'date':
      return value ? new Date(String(value)).toLocaleDateString() : ''
    default:
      return String(value)
  }
}

function QueryResultsSkeleton({ query }: { query: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-1">Analyzing: &quot;{query}&quot;</h3>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Processing your query...</span>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-32 bg-muted rounded" />
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </div>
      </div>
    </div>
  )
}

function QueryError({ error, query }: { error: string, query: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-1">Error for: &quot;{query}&quot;</h3>
        </div>
      </div>

      <div className="bg-destructive/10 border border-destructive rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-destructive mb-1">Query Failed</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Try rephrasing your question or check that the data you&apos;re asking about exists.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
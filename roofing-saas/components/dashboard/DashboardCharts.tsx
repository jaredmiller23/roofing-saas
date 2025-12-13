'use client'

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

// Theme-compliant tooltip styles
const tooltipStyle = {
  contentStyle: {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  itemStyle: {
    color: 'hsl(var(--foreground))',
  },
  labelStyle: {
    color: 'hsl(var(--foreground))',
    fontWeight: 600,
  },
}

// Theme colors
const chartColors = {
  primary: 'hsl(var(--primary))',      // Coral
  secondary: 'hsl(var(--secondary))',  // Teal
  tertiary: '#8b5cf6',                 // Purple accent for variety
}

interface RevenueChartProps {
  data: { month: string; revenue: number }[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
        <YAxis stroke="hsl(var(--muted-foreground))" />
        <Tooltip
          formatter={(value) => `$${value.toLocaleString()}`}
          contentStyle={tooltipStyle.contentStyle}
          itemStyle={tooltipStyle.itemStyle}
          labelStyle={tooltipStyle.labelStyle}
        />
        <Line type="monotone" dataKey="revenue" stroke={chartColors.primary} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface PipelineChartProps {
  data: { status: string; count: number; value: number }[]
}

export function PipelineChart({ data }: PipelineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="status" stroke="hsl(var(--muted-foreground))" />
        <YAxis stroke="hsl(var(--muted-foreground))" />
        <Tooltip
          contentStyle={tooltipStyle.contentStyle}
          itemStyle={tooltipStyle.itemStyle}
          labelStyle={tooltipStyle.labelStyle}
        />
        <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
        <Bar dataKey="count" fill={chartColors.secondary} name="Count" />
        <Bar dataKey="value" fill={chartColors.primary} name="Value ($)" />
      </BarChart>
    </ResponsiveContainer>
  )
}

interface ActivityChartProps {
  data: {
    date: string
    count: number
    doorKnocks: number
    calls: number
    emails: number
  }[]
}

export function ActivityChart({ data }: ActivityChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
        <YAxis stroke="hsl(var(--muted-foreground))" />
        <Tooltip
          contentStyle={tooltipStyle.contentStyle}
          itemStyle={tooltipStyle.itemStyle}
          labelStyle={tooltipStyle.labelStyle}
        />
        <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
        <Bar dataKey="doorKnocks" fill="#10b981" name="Door Knocks" stackId="a" />
        <Bar dataKey="calls" fill={chartColors.primary} name="Calls" stackId="a" />
        <Bar dataKey="emails" fill={chartColors.tertiary} name="Emails" stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  )
}

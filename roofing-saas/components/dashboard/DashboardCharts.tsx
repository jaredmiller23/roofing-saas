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

// Theme-compliant tooltip styles (using actual color values for Recharts compatibility)
const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#222834',  // --card
    border: '1px solid #404854', // --border
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
  },
  itemStyle: {
    color: '#ffffff',  // --foreground
  },
  labelStyle: {
    color: '#ffffff',  // --foreground
    fontWeight: 600,
  },
}

// Theme colors (actual values for Recharts)
const chartColors = {
  primary: '#FF8243',    // Coral - --primary
  secondary: '#2D7A7A',  // Teal - --secondary
  tertiary: '#8b5cf6',   // Purple accent
  muted: '#9ca3af',      // --muted-foreground
  border: '#404854',     // --border
}

interface RevenueChartProps {
  data: { month: string; revenue: number }[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border} />
        <XAxis dataKey="month" stroke={chartColors.muted} fontSize={12} />
        <YAxis stroke={chartColors.muted} fontSize={12} />
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
        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border} />
        <XAxis dataKey="status" stroke={chartColors.muted} fontSize={12} />
        <YAxis stroke={chartColors.muted} fontSize={12} />
        <Tooltip
          contentStyle={tooltipStyle.contentStyle}
          itemStyle={tooltipStyle.itemStyle}
          labelStyle={tooltipStyle.labelStyle}
        />
        <Legend wrapperStyle={{ color: '#ffffff' }} />
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
        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border} />
        <XAxis dataKey="date" stroke={chartColors.muted} fontSize={12} />
        <YAxis stroke={chartColors.muted} fontSize={12} />
        <Tooltip
          contentStyle={tooltipStyle.contentStyle}
          itemStyle={tooltipStyle.itemStyle}
          labelStyle={tooltipStyle.labelStyle}
        />
        <Legend wrapperStyle={{ color: '#ffffff' }} />
        <Bar dataKey="doorKnocks" fill="#10b981" name="Door Knocks" stackId="a" />
        <Bar dataKey="calls" fill={chartColors.primary} name="Calls" stackId="a" />
        <Bar dataKey="emails" fill={chartColors.tertiary} name="Emails" stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  )
}

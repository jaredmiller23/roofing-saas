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

interface RevenueChartProps {
  data: { month: string; revenue: number }[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
        <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
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
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="status" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="count" fill="#8b5cf6" name="Count" />
        <Bar dataKey="value" fill="#3b82f6" name="Value ($)" />
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
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="doorKnocks" fill="#10b981" name="Door Knocks" stackId="a" />
        <Bar dataKey="calls" fill="#3b82f6" name="Calls" stackId="a" />
        <Bar dataKey="emails" fill="#8b5cf6" name="Emails" stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  )
}

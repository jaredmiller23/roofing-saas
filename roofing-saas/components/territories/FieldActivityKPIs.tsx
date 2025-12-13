'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PointsDisplay } from '@/components/gamification/PointsDisplay'
import { Leaderboard } from '@/components/gamification/Leaderboard'
import { Achievements } from '@/components/gamification/Achievements'
import { Target, Calendar, CalendarDays, CalendarRange } from 'lucide-react'

interface KnockStats {
  total: number
  today: number
  week: number
  month: number
}

interface FieldActivityKPIsProps {
  knockStats: KnockStats
}

/**
 * Field Activity KPIs view with gamification components.
 * Shows knock statistics, points progress, leaderboard, and achievements.
 */
export function FieldActivityKPIs({ knockStats }: FieldActivityKPIsProps) {
  return (
    <div className="space-y-6">
      {/* Knock Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Knocks
            </CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {knockStats.total.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today
            </CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {knockStats.today.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Week
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {knockStats.week.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month
            </CardTitle>
            <CalendarRange className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {knockStats.month.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gamification Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PointsDisplay />
        <Leaderboard
          period="weekly"
          limit={5}
          type="knocks"
          title="Top Knockers"
          metricLabel="knocks"
        />
      </div>

      {/* Achievements */}
      <Achievements />
    </div>
  )
}

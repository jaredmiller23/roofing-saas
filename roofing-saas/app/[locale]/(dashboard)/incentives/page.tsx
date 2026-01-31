import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { Leaderboard } from '@/components/gamification/Leaderboard'
import { PointsDisplay } from '@/components/gamification/PointsDisplay'
import { Achievements } from '@/components/gamification/Achievements'
import { WeeklyChallengeWidget } from '@/components/dashboard/WeeklyChallengeWidget'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, Target, TrendingUp, Award } from 'lucide-react'

/**
 * Incentives page - gamification hub for door knocking
 *
 * Features:
 * - Knock and sales leaderboards
 * - Points and achievements
 * - Weekly challenges
 * - Rewards and prizes
 */
export default async function IncentivesPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Incentives & Gamification</h1>
          <p className="text-muted-foreground mt-2">
            Track your performance, compete with teammates, and earn rewards
          </p>
        </div>

        {/* Points and Challenge Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PointsDisplay />
          <WeeklyChallengeWidget />
        </div>

        {/* Achievements - fetched from API */}
        <Achievements />

        {/* Rewards Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-secondary" />
              Current Rewards & Prizes
            </CardTitle>
            <CardDescription>
              What you can earn with your points
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border-2 border-secondary/30 rounded-lg bg-secondary/10">
                <div className="flex items-center justify-between mb-2">
                  <Trophy className="h-8 w-8 text-secondary" />
                  <span className="text-2xl font-bold text-secondary">1st</span>
                </div>
                <h3 className="font-semibold text-foreground mb-1">Weekly Winner</h3>
                <p className="text-sm text-muted-foreground mb-3">$500 bonus + paid day off</p>
                <div className="text-xs text-secondary font-medium">Most knocks this week</div>
              </div>

              <div className="p-4 border-2 border-primary/30 rounded-lg bg-primary/10">
                <div className="flex items-center justify-between mb-2">
                  <Target className="h-8 w-8 text-primary" />
                  <span className="text-2xl font-bold text-primary">2nd</span>
                </div>
                <h3 className="font-semibold text-foreground mb-1">Sales Champion</h3>
                <p className="text-sm text-muted-foreground mb-3">$300 bonus + gift card</p>
                <div className="text-xs text-primary font-medium">Most sales this week</div>
              </div>

              <div className="p-4 border-2 border-green-500/30 rounded-lg bg-green-500/10">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <span className="text-2xl font-bold text-green-600">3rd</span>
                </div>
                <h3 className="font-semibold text-foreground mb-1">Consistency Award</h3>
                <p className="text-sm text-muted-foreground mb-3">$150 bonus</p>
                <div className="text-xs text-green-600 font-medium">Hit daily goals all week</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboards */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Team Leaderboards
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Leaderboard
              period="weekly"
              limit={10}
              type="knocks"
              title="🚪 Knock Leaderboard"
              metricLabel="knocks"
            />
            <Leaderboard
              period="weekly"
              limit={10}
              type="sales"
              title="💰 Sales Leaderboard"
              metricLabel="deals"
            />
          </div>
        </div>

        {/* Points Leaderboard */}
        <div className="grid grid-cols-1 gap-6">
          <Leaderboard
            period="weekly"
            limit={15}
            type="points"
            title="⭐ Overall Points Leaderboard"
            metricLabel="points"
          />
        </div>
      </div>
    </div>
  )
}

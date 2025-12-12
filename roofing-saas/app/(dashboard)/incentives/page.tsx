import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { Leaderboard } from '@/components/gamification/Leaderboard'
import { PointsDisplay } from '@/components/gamification/PointsDisplay'
import { WeeklyChallengeWidget } from '@/components/dashboard/WeeklyChallengeWidget'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, Target, Zap, Award, TrendingUp } from 'lucide-react'

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PointsDisplay />
          <WeeklyChallengeWidget />

          {/* Achievements Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-600" />
                Achievements
              </CardTitle>
              <CardDescription>
                Your recent accomplishments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 bg-yellow-50 rounded-lg">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Top Performer</p>
                    <p className="text-xs text-muted-foreground">Ranked #1 this week</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                  <Target className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Goal Crusher</p>
                    <p className="text-xs text-muted-foreground">Hit weekly target</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 bg-blue-500/10 rounded-lg">
                  <Zap className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Streak Master</p>
                    <p className="text-xs text-muted-foreground">5 days in a row</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rewards Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-600" />
              Current Rewards & Prizes
            </CardTitle>
            <CardDescription>
              What you can earn with your points
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border-2 border-purple-500/30 rounded-lg bg-purple-500/10">
                <div className="flex items-center justify-between mb-2">
                  <Trophy className="h-8 w-8 text-purple-600" />
                  <span className="text-2xl font-bold text-purple-900">1st</span>
                </div>
                <h3 className="font-semibold text-foreground mb-1">Weekly Winner</h3>
                <p className="text-sm text-muted-foreground mb-3">$500 bonus + paid day off</p>
                <div className="text-xs text-purple-600 font-medium">Most knocks this week</div>
              </div>

              <div className="p-4 border-2 border-blue-500/30 rounded-lg bg-blue-500/10">
                <div className="flex items-center justify-between mb-2">
                  <Target className="h-8 w-8 text-blue-600" />
                  <span className="text-2xl font-bold text-blue-900">2nd</span>
                </div>
                <h3 className="font-semibold text-foreground mb-1">Sales Champion</h3>
                <p className="text-sm text-muted-foreground mb-3">$300 bonus + gift card</p>
                <div className="text-xs text-blue-600 font-medium">Most sales this week</div>
              </div>

              <div className="p-4 border-2 border-green-200 rounded-lg bg-green-50">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <span className="text-2xl font-bold text-green-900">3rd</span>
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

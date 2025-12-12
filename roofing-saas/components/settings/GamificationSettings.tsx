/**
 * Gamification Settings Component
 * Admin UI for custom incentives and KPI configuration
 */

'use client'

import { useState } from 'react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Trophy, Target, Award, Calendar, Gift, TrendingUp } from 'lucide-react'
import { PointRulesTab } from './gamification/PointRulesTab'
import { AchievementsTab } from './gamification/AchievementsTab'
import { ChallengesTab } from './gamification/ChallengesTab'
import { RewardsTab } from './gamification/RewardsTab'
import { KpisTab } from './gamification/KpisTab'

export function GamificationSettings() {
  const [activeTab, setActiveTab] = useState('point-rules')

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <CardTitle>Gamification Settings</CardTitle>
          </div>
          <CardDescription>
            Configure custom incentives, achievements, challenges, rewards, and KPIs
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger
            value="point-rules"
            className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white px-4 py-3"
          >
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Point Rules</span>
          </TabsTrigger>
          <TabsTrigger
            value="achievements"
            className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white px-4 py-3"
          >
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Achievements</span>
          </TabsTrigger>
          <TabsTrigger
            value="challenges"
            className="flex items-center gap-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white px-4 py-3"
          >
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Challenges</span>
          </TabsTrigger>
          <TabsTrigger
            value="rewards"
            className="flex items-center gap-2 data-[state=active]:bg-pink-600 data-[state=active]:text-white px-4 py-3"
          >
            <Gift className="h-4 w-4" />
            <span className="hidden sm:inline">Rewards</span>
          </TabsTrigger>
          <TabsTrigger
            value="kpis"
            className="flex items-center gap-2 data-[state=active]:bg-green-600 data-[state=active]:text-white px-4 py-3"
          >
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">KPIs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="point-rules">
          <PointRulesTab />
        </TabsContent>

        <TabsContent value="achievements">
          <AchievementsTab />
        </TabsContent>

        <TabsContent value="challenges">
          <ChallengesTab />
        </TabsContent>

        <TabsContent value="rewards">
          <RewardsTab />
        </TabsContent>

        <TabsContent value="kpis">
          <KpisTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Gamification Settings Component
 * Admin UI for custom incentives and KPI configuration
 *
 * NOTE: This is Phase 1 - Backend complete, UI placeholder
 * Full UI implementation with tabs, forms, and dialogs to come in Phase 2
 */

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, Target, Award, Calendar, Gift, TrendingUp, Sparkles } from 'lucide-react'

export function GamificationSettings() {
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

      {/* Phase 1 Complete - Backend Ready */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-900">🎉 Backend Complete</CardTitle>
          </div>
          <CardDescription className="text-green-700">
            All APIs and database tables are ready. Full admin UI coming soon!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-green-800">
              <strong>✅ What's Ready:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Database: 8 tables with RLS policies and indexes</li>
                <li>APIs: 10 REST endpoints for CRUD operations</li>
                <li>Types: Full TypeScript + Zod validation</li>
                <li>Integration: Dynamic point lookup system</li>
              </ul>
            </div>

            <div className="text-sm text-green-800 mt-4">
              <strong>🚧 Coming Next (Phase 2):</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Point Rules Tab - Create custom point-earning actions</li>
                <li>Achievements Tab - Design badges and unlock conditions</li>
                <li>Challenges Tab - Set up time-limited competitions</li>
                <li>Rewards Tab - Define prizes users can claim</li>
                <li>KPIs Tab - Configure pre-built + custom metrics</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Cards - Preview of Coming UI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Point Rules */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Point Rules</CardTitle>
            </div>
            <CardDescription>Define custom point-earning actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p>API: <code className="text-xs">/api/gamification/point-rules</code></p>
              <p className="mt-2">Table: <code className="text-xs">point_rule_configs</code></p>
              <p className="mt-2 text-xs">✓ CRUD operations ready</p>
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-lg">Achievements</CardTitle>
            </div>
            <CardDescription>Create badges with unlock requirements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p>API: <code className="text-xs">/api/gamification/achievements</code></p>
              <p className="mt-2">Table: <code className="text-xs">achievement_configs</code></p>
              <p className="mt-2 text-xs">✓ CRUD operations ready</p>
            </div>
          </CardContent>
        </Card>

        {/* Challenges */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-lg">Challenges</CardTitle>
            </div>
            <CardDescription>Time-limited competitions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p>API: <code className="text-xs">/api/gamification/challenges</code></p>
              <p className="mt-2">Table: <code className="text-xs">challenge_configs</code></p>
              <p className="mt-2 text-xs">✓ CRUD operations ready</p>
            </div>
          </CardContent>
        </Card>

        {/* Rewards */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-pink-600" />
              <CardTitle className="text-lg">Rewards</CardTitle>
            </div>
            <CardDescription>Prizes users can claim</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p>API: <code className="text-xs">/api/gamification/rewards</code></p>
              <p className="mt-2">Table: <code className="text-xs">reward_configs</code></p>
              <p className="mt-2 text-xs">✓ CRUD operations ready</p>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">KPIs</CardTitle>
            </div>
            <CardDescription>Pre-built + custom metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p>API: <code className="text-xs">/api/gamification/kpis</code></p>
              <p className="mt-2">Table: <code className="text-xs">kpi_definitions</code></p>
              <p className="mt-2 text-xs">✓ CRUD operations ready</p>
              <p className="mt-2 text-xs">✓ 6 roofing KPIs seeded</p>
            </div>
          </CardContent>
        </Card>

        {/* Freestyle Capability */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-lg text-yellow-900">Freestyle Mode</CardTitle>
            </div>
            <CardDescription className="text-yellow-700">
              JSON conditions, custom SQL, unlimited extensibility
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Built-in flexibility:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Custom conditions (JSONB)</li>
                <li>Custom SQL queries</li>
                <li>Dynamic formulas</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Technical Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Technical Implementation</CardTitle>
          <CardDescription>For developers and technical admins</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Database Tables (8 total):</h4>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <code>point_rule_configs</code>
                <code>achievement_configs</code>
                <code>challenge_configs</code>
                <code>challenge_progress</code>
                <code>reward_configs</code>
                <code>reward_claims</code>
                <code>kpi_definitions</code>
                <code>kpi_values</code>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Security:</h4>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Row Level Security (RLS) enabled on all tables</li>
                <li>Organization isolation (org_id)</li>
                <li>Admin-only write access for configs</li>
                <li>User-level read access</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Integration:</h4>
              <p className="text-muted-foreground">
                Dynamic point lookup system allows awarding points based on custom rules without code changes.
                Falls back to hardcoded values for backwards compatibility.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

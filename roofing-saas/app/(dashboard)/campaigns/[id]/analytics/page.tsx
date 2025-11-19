'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Mail, MessageSquare, CheckCircle, TrendingUp, Users, Loader2 } from 'lucide-react'
import type { Campaign, CampaignEnrollment } from '@/lib/campaigns/types'

export default function CampaignAnalyticsPage() {
  const router = useRouter()
  const params = useParams()
  const campaignId = params?.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [enrollments, setEnrollments] = useState<CampaignEnrollment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (campaignId) {
      fetchAnalyticsData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])

  const fetchAnalyticsData = async () => {
    setLoading(true)
    try {
      // Fetch campaign
      const campaignRes = await fetch(`/api/campaigns/${campaignId}`)
      if (!campaignRes.ok) throw new Error('Failed to fetch campaign')
      const campaignData = await campaignRes.json()
      setCampaign(campaignData.campaign)

      // Fetch enrollments
      const enrollmentsRes = await fetch(
        `/api/campaigns/${campaignId}/enrollments`
      )
      if (!enrollmentsRes.ok) throw new Error('Failed to fetch enrollments')
      const enrollmentsData = await enrollmentsRes.json()
      setEnrollments(enrollmentsData.enrollments || [])
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="container mx-auto p-6">
        <p>Campaign not found</p>
      </div>
    )
  }

  // Calculate metrics
  const totalEnrolled = campaign.total_enrolled
  const totalCompleted = campaign.total_completed
  const activeEnrollments = enrollments.filter((e) => e.status === 'active').length
  const completionRate = totalEnrolled > 0
    ? ((totalCompleted / totalEnrolled) * 100).toFixed(1)
    : '0'

  const totalEmailsSent = enrollments.reduce((sum, e) => sum + e.emails_sent, 0)
  const totalEmailsOpened = enrollments.reduce((sum, e) => sum + e.emails_opened, 0)
  const emailOpenRate = totalEmailsSent > 0
    ? ((totalEmailsOpened / totalEmailsSent) * 100).toFixed(1)
    : '0'

  const totalSmsSent = enrollments.reduce((sum, e) => sum + e.sms_sent, 0)
  const totalSmsReplied = enrollments.reduce((sum, e) => sum + e.sms_replied, 0)
  const smsReplyRate = totalSmsSent > 0
    ? ((totalSmsReplied / totalSmsSent) * 100).toFixed(1)
    : '0'

  const goalsAchieved = enrollments.filter((e) => e.goal_achieved).length
  const goalAchievementRate = totalEnrolled > 0
    ? ((goalsAchieved / totalEnrolled) * 100).toFixed(1)
    : '0'

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/campaigns/${campaignId}/builder`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Builder
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Campaign Analytics</h1>
            <p className="text-muted-foreground">{campaign.name}</p>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Enrolled
            </CardDescription>
            <CardTitle className="text-3xl">{totalEnrolled}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {activeEnrollments} currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Completion Rate
            </CardDescription>
            <CardTitle className="text-3xl">{completionRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {totalCompleted} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Goal Achievement
            </CardDescription>
            <CardTitle className="text-3xl">{goalAchievementRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {goalsAchieved} goals achieved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Revenue</CardDescription>
            <CardTitle className="text-3xl">
              ${campaign.total_revenue.toFixed(0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              ${totalEnrolled > 0 ? (campaign.total_revenue / totalEnrolled).toFixed(2) : '0'} per enrollment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Performance
            </CardTitle>
            <CardDescription>Email engagement metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Emails Sent</span>
              <span className="text-2xl font-bold">{totalEmailsSent}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Emails Opened</span>
              <span className="text-2xl font-bold">{totalEmailsOpened}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-sm font-medium">Open Rate</span>
              <span className="text-2xl font-bold text-primary">
                {emailOpenRate}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Clicked Links
              </span>
              <span className="text-lg font-semibold">
                {enrollments.reduce((sum, e) => sum + e.emails_clicked, 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              SMS Performance
            </CardTitle>
            <CardDescription>SMS engagement metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">SMS Sent</span>
              <span className="text-2xl font-bold">{totalSmsSent}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Replies</span>
              <span className="text-2xl font-bold">{totalSmsReplied}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-sm font-medium">Reply Rate</span>
              <span className="text-2xl font-bold text-primary">
                {smsReplyRate}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enrollment Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Enrollment Status</CardTitle>
          <CardDescription>Breakdown by enrollment status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {['active', 'completed', 'exited', 'paused', 'failed'].map((status) => {
              const count = enrollments.filter((e) => e.status === status).length
              const percentage = totalEnrolled > 0
                ? ((count / totalEnrolled) * 100).toFixed(1)
                : '0'

              return (
                <div key={status} className="text-center">
                  <p className="text-3xl font-bold">{count}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {status}
                  </p>
                  <p className="text-xs text-muted-foreground">{percentage}%</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Enrollments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Enrollments</CardTitle>
          <CardDescription>Latest contacts enrolled in this campaign</CardDescription>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No enrollments yet
            </p>
          ) : (
            <div className="space-y-2">
              {enrollments.slice(0, 10).map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div>
                    <p className="font-medium">Contact {enrollment.contact_id.slice(0, 8)}...</p>
                    <p className="text-sm text-muted-foreground">
                      Enrolled {new Date(enrollment.enrolled_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium capitalize">{enrollment.status}</p>
                    <p className="text-xs text-muted-foreground">
                      {enrollment.steps_completed} steps completed
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

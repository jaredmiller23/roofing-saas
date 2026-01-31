/**
 * ARIA Customer Intelligence Functions - Phase 3: Deep Customer Intelligence
 *
 * Provides ARIA with deep customer knowledge:
 * - Full interaction history (calls, texts, emails, visits)
 * - Customer sentiment analysis
 * - Customer lifetime value and payment patterns
 * - Predictive needs based on project age and seasonality
 * - Similar customer discovery
 */

import { ariaFunctionRegistry } from '../function-registry'
import { logger } from '@/lib/logger'

// =============================================================================
// get_customer_history - Full timeline of all interactions
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_customer_history',
  category: 'intelligence',
  description: 'Get complete interaction history for a customer',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_customer_history',
    description: 'Get the complete history of all interactions with a customer including calls, texts, emails, notes, and appointments.',
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'Contact ID to get history for',
        },
        include_types: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by activity types: call, sms, email, note, meeting, task, status_change (default: all)',
        },
        days_back: {
          type: 'number',
          description: 'Number of days of history to retrieve (default: 90)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of items to return (default: 50)',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const {
      contact_id,
      include_types,
      days_back = 90,
      limit = 50,
    } = args as {
      contact_id?: string
      include_types?: string[]
      days_back?: number
      limit?: number
    }

    const targetContactId = contact_id || context.contact?.id
    if (!targetContactId) {
      return { success: false, error: 'No contact specified. Please provide a contact_id or ensure context has a contact.' }
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days_back)

    // Fetch activities
    let activitiesQuery = context.supabase
      .from('activities')
      .select('id, type, subject, content, direction, created_at, metadata, created_by')
      .eq('tenant_id', context.tenantId)
      .eq('contact_id', targetContactId)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit)

    if (include_types && include_types.length > 0) {
      activitiesQuery = activitiesQuery.in('type', include_types)
    }

    const { data: activities, error: activitiesError } = await activitiesQuery

    if (activitiesError) {
      logger.error('[Intelligence] Error fetching customer history:', { error: activitiesError })
      return { success: false, error: activitiesError.message }
    }

    // Fetch events (appointments)
    const { data: events, error: eventsError } = await context.supabase
      .from('events')
      .select('id, title, start_at, end_at, event_type, status, outcome, location')
      .eq('tenant_id', context.tenantId)
      .eq('contact_id', targetContactId)
      .eq('is_deleted', false)
      .gte('start_at', cutoffDate.toISOString())
      .order('start_at', { ascending: false })
      .limit(20)

    if (eventsError) {
      logger.warn('[Intelligence] Error fetching events:', { error: eventsError })
    }

    // Fetch projects
    const { data: projects, error: projectsError } = await context.supabase
      .from('projects')
      .select('id, name, stage, status, created_at, custom_fields')
      .eq('tenant_id', context.tenantId)
      .eq('contact_id', targetContactId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(10)

    if (projectsError) {
      logger.warn('[Intelligence] Error fetching projects:', { error: projectsError })
    }

    // Build unified timeline
    interface TimelineItem {
      date: string
      type: string
      summary: string
      direction?: string
      details?: string
    }

    const timeline: TimelineItem[] = []

    // Add activities
    for (const activity of activities || []) {
      timeline.push({
        date: activity.created_at,
        type: activity.type,
        summary: activity.subject || activity.content?.substring(0, 100) || `${activity.type} activity`,
        direction: activity.direction,
        details: activity.content?.substring(0, 200),
      })
    }

    // Add events
    for (const event of events || []) {
      timeline.push({
        date: event.start_at,
        type: 'appointment',
        summary: `${event.title} (${event.status})`,
        details: event.location || undefined,
      })
    }

    // Sort by date descending
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Calculate stats
    const stats = {
      totalActivities: activities?.length || 0,
      totalEvents: events?.length || 0,
      totalProjects: projects?.length || 0,
      callCount: activities?.filter(a => a.type === 'call').length || 0,
      smsCount: activities?.filter(a => a.type === 'sms').length || 0,
      emailCount: activities?.filter(a => a.type === 'email').length || 0,
      inboundCount: activities?.filter(a => a.direction === 'inbound').length || 0,
      outboundCount: activities?.filter(a => a.direction === 'outbound').length || 0,
    }

    // Format message
    const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    let message = `Customer History (last ${days_back} days):\n`
    message += `📊 ${stats.totalActivities} activities, ${stats.totalEvents} appointments, ${stats.totalProjects} projects\n`
    message += `📞 ${stats.callCount} calls | 💬 ${stats.smsCount} texts | 📧 ${stats.emailCount} emails\n\n`

    if (timeline.length > 0) {
      message += 'Recent Timeline:\n'
      const recentItems = timeline.slice(0, 10)
      for (const item of recentItems) {
        const icon = item.type === 'call' ? '📞' : item.type === 'sms' ? '💬' : item.type === 'email' ? '📧' : item.type === 'appointment' ? '📅' : '📝'
        const dir = item.direction === 'inbound' ? '←' : item.direction === 'outbound' ? '→' : ''
        message += `${icon} ${formatDate(item.date)} ${dir} ${item.summary}\n`
      }
    } else {
      message += 'No recent activity found.'
    }

    return {
      success: true,
      data: {
        timeline: timeline.slice(0, limit),
        activities,
        events,
        projects,
        stats,
      },
      message,
    }
  },
})

// =============================================================================
// get_customer_sentiment - Analyze recent interactions for sentiment
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_customer_sentiment',
  category: 'intelligence',
  description: 'Analyze customer sentiment from recent interactions',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_customer_sentiment',
    description: 'Analyze recent interactions to understand customer sentiment and satisfaction level.',
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'Contact ID to analyze',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { contact_id } = args as { contact_id?: string }

    const targetContactId = contact_id || context.contact?.id
    if (!targetContactId) {
      return { success: false, error: 'No contact specified' }
    }

    // Fetch recent activities with content
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: activities, error } = await context.supabase
      .from('activities')
      .select('id, type, subject, content, direction, created_at, metadata')
      .eq('tenant_id', context.tenantId)
      .eq('contact_id', targetContactId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      return { success: false, error: error.message }
    }

    // Analyze sentiment indicators
    const indicators = {
      positive: 0,
      negative: 0,
      neutral: 0,
      urgentRequests: 0,
      complaints: 0,
      compliments: 0,
      responseRate: 0,
    }

    const positiveWords = ['thank', 'great', 'excellent', 'happy', 'pleased', 'appreciate', 'wonderful', 'perfect', 'awesome', 'love']
    const negativeWords = ['unhappy', 'disappointed', 'frustrated', 'angry', 'terrible', 'awful', 'bad', 'worst', 'hate', 'never']
    const urgentWords = ['urgent', 'asap', 'emergency', 'immediately', 'right now', 'leak', 'damage']
    const complaintWords = ['complaint', 'issue', 'problem', 'wrong', 'broken', 'failed', 'not working']

    for (const activity of activities || []) {
      const content = ((activity.content || '') + ' ' + (activity.subject || '')).toLowerCase()

      // Count positive/negative words
      for (const word of positiveWords) {
        if (content.includes(word)) indicators.positive++
      }
      for (const word of negativeWords) {
        if (content.includes(word)) indicators.negative++
      }
      for (const word of urgentWords) {
        if (content.includes(word)) indicators.urgentRequests++
      }
      for (const word of complaintWords) {
        if (content.includes(word)) indicators.complaints++
      }
    }

    // Calculate response rate (outbound responses to inbound)
    const inbound = activities?.filter(a => a.direction === 'inbound').length || 0
    const outbound = activities?.filter(a => a.direction === 'outbound').length || 0
    indicators.responseRate = inbound > 0 ? Math.round((outbound / inbound) * 100) : 100

    // Determine overall sentiment
    let sentiment: 'positive' | 'neutral' | 'negative' | 'at_risk'
    let score: number

    if (indicators.complaints > 2 || indicators.negative > indicators.positive * 2) {
      sentiment = 'at_risk'
      score = 25
    } else if (indicators.negative > indicators.positive) {
      sentiment = 'negative'
      score = 40
    } else if (indicators.positive > indicators.negative * 2) {
      sentiment = 'positive'
      score = 85
    } else {
      sentiment = 'neutral'
      score = 60
    }

    // Adjust for response rate
    if (indicators.responseRate < 50) score -= 10
    if (indicators.urgentRequests > 0 && indicators.complaints > 0) score -= 15

    score = Math.max(0, Math.min(100, score))

    // Build insights
    const insights: string[] = []
    if (indicators.complaints > 0) {
      insights.push(`⚠️ ${indicators.complaints} complaint indicator(s) detected`)
    }
    if (indicators.urgentRequests > 0) {
      insights.push(`🚨 ${indicators.urgentRequests} urgent request(s) noted`)
    }
    if (indicators.positive > indicators.negative) {
      insights.push(`✅ Generally positive communication tone`)
    }
    if (indicators.responseRate < 50) {
      insights.push(`📉 Low response rate (${indicators.responseRate}%) - may feel neglected`)
    }
    if (outbound === 0 && inbound > 0) {
      insights.push(`❗ Customer has reached out but received no response`)
    }

    const sentimentEmoji = sentiment === 'positive' ? '😊' : sentiment === 'neutral' ? '😐' : sentiment === 'negative' ? '😟' : '🚨'

    let message = `${sentimentEmoji} Customer Sentiment: ${sentiment.toUpperCase()} (Score: ${score}/100)\n\n`
    message += `📊 Analysis (last 30 days):\n`
    message += `• ${activities?.length || 0} interactions analyzed\n`
    message += `• ${inbound} inbound / ${outbound} outbound\n`
    message += `• Response rate: ${indicators.responseRate}%\n\n`

    if (insights.length > 0) {
      message += `💡 Insights:\n${insights.join('\n')}`
    }

    return {
      success: true,
      data: {
        sentiment,
        score,
        indicators,
        insights,
        activityCount: activities?.length || 0,
      },
      message,
    }
  },
})

// =============================================================================
// get_customer_value - Lifetime value and payment patterns
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_customer_value',
  category: 'intelligence',
  description: 'Get customer lifetime value and payment history',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_customer_value',
    description: 'Calculate customer lifetime value and analyze payment patterns.',
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'Contact ID to analyze',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { contact_id } = args as { contact_id?: string }

    const targetContactId = contact_id || context.contact?.id
    if (!targetContactId) {
      return { success: false, error: 'No contact specified' }
    }

    // Fetch all projects for this contact
    const { data: projects, error: projectsError } = await context.supabase
      .from('projects')
      .select('id, name, stage, status, created_at, custom_fields')
      .eq('tenant_id', context.tenantId)
      .eq('contact_id', targetContactId)
      .eq('is_deleted', false)

    if (projectsError) {
      return { success: false, error: projectsError.message }
    }

    // Calculate metrics from projects
    const metrics = {
      totalProjects: projects?.length || 0,
      wonProjects: 0,
      lostProjects: 0,
      activeProjects: 0,
      totalValue: 0,
      avgProjectValue: 0,
      firstProjectDate: null as string | null,
      lastProjectDate: null as string | null,
      daysSinceLastProject: 0,
    }

    for (const project of projects || []) {
      const stage = project.stage?.toLowerCase() || ''
      const status = project.status?.toLowerCase() || ''

      if (stage === 'won' || status === 'won' || stage === 'completed') {
        metrics.wonProjects++
        // Try to get value from custom_fields
        const value = project.custom_fields?.contract_value || project.custom_fields?.estimate_total || 0
        if (typeof value === 'number') {
          metrics.totalValue += value
        }
      } else if (stage === 'lost' || status === 'lost') {
        metrics.lostProjects++
      } else {
        metrics.activeProjects++
      }

      // Track dates
      if (!metrics.firstProjectDate || project.created_at < metrics.firstProjectDate) {
        metrics.firstProjectDate = project.created_at
      }
      if (!metrics.lastProjectDate || project.created_at > metrics.lastProjectDate) {
        metrics.lastProjectDate = project.created_at
      }
    }

    if (metrics.wonProjects > 0) {
      metrics.avgProjectValue = Math.round(metrics.totalValue / metrics.wonProjects)
    }

    if (metrics.lastProjectDate) {
      metrics.daysSinceLastProject = Math.floor(
        (Date.now() - new Date(metrics.lastProjectDate).getTime()) / (1000 * 60 * 60 * 24)
      )
    }

    // Calculate customer tier
    let tier: 'platinum' | 'gold' | 'silver' | 'bronze' | 'new'
    if (metrics.totalValue >= 50000 || metrics.wonProjects >= 5) {
      tier = 'platinum'
    } else if (metrics.totalValue >= 20000 || metrics.wonProjects >= 3) {
      tier = 'gold'
    } else if (metrics.totalValue >= 10000 || metrics.wonProjects >= 2) {
      tier = 'silver'
    } else if (metrics.wonProjects >= 1) {
      tier = 'bronze'
    } else {
      tier = 'new'
    }

    // Calculate win rate
    const totalDecided = metrics.wonProjects + metrics.lostProjects
    const winRate = totalDecided > 0 ? Math.round((metrics.wonProjects / totalDecided) * 100) : null

    // Referral potential (based on value and engagement)
    const referralScore = Math.min(100, (metrics.wonProjects * 20) + (metrics.totalValue / 1000))

    const tierEmoji = tier === 'platinum' ? '💎' : tier === 'gold' ? '🥇' : tier === 'silver' ? '🥈' : tier === 'bronze' ? '🥉' : '🆕'

    let message = `${tierEmoji} Customer Value Analysis:\n\n`
    message += `💰 Lifetime Value: $${metrics.totalValue.toLocaleString()}\n`
    message += `📊 Tier: ${tier.toUpperCase()}\n\n`
    message += `Projects:\n`
    message += `• Total: ${metrics.totalProjects}\n`
    message += `• Won: ${metrics.wonProjects} | Lost: ${metrics.lostProjects} | Active: ${metrics.activeProjects}\n`
    if (winRate !== null) {
      message += `• Win Rate: ${winRate}%\n`
    }
    message += `• Avg Value: $${metrics.avgProjectValue.toLocaleString()}\n\n`

    if (metrics.lastProjectDate) {
      message += `📅 Last project: ${metrics.daysSinceLastProject} days ago\n`
    }
    message += `⭐ Referral potential: ${Math.round(referralScore)}%`

    return {
      success: true,
      data: {
        tier,
        metrics,
        winRate,
        referralScore: Math.round(referralScore),
      },
      message,
    }
  },
})

// =============================================================================
// predict_customer_needs - Predict needs based on history and seasonality
// =============================================================================

ariaFunctionRegistry.register({
  name: 'predict_customer_needs',
  category: 'intelligence',
  description: 'Predict what a customer might need based on their history',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'predict_customer_needs',
    description: 'Predict customer needs based on project history, seasonality, and roof age.',
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'Contact ID to predict needs for',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const { contact_id } = args as { contact_id?: string }

    const targetContactId = contact_id || context.contact?.id
    if (!targetContactId) {
      return { success: false, error: 'No contact specified' }
    }

    // Get contact details
    const { data: contact, error: contactError } = await context.supabase
      .from('contacts')
      .select('id, first_name, last_name, custom_fields, created_at')
      .eq('id', targetContactId)
      .single()

    if (contactError || !contact) {
      return { success: false, error: 'Contact not found' }
    }

    // Get project history
    const { data: projects } = await context.supabase
      .from('projects')
      .select('id, name, stage, status, created_at, custom_fields')
      .eq('tenant_id', context.tenantId)
      .eq('contact_id', targetContactId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    // Get recent activities
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: recentActivities } = await context.supabase
      .from('activities')
      .select('type, content, created_at')
      .eq('tenant_id', context.tenantId)
      .eq('contact_id', targetContactId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .limit(20)

    // Build predictions
    const predictions: Array<{
      need: string
      confidence: 'high' | 'medium' | 'low'
      reason: string
      suggestedAction: string
    }> = []

    const currentMonth = new Date().getMonth()
    const isStormSeason = currentMonth >= 2 && currentMonth <= 8 // March-August

    // Check roof age from custom fields
    const roofAge = contact.custom_fields?.roof_age || contact.custom_fields?.roofAge
    if (roofAge && typeof roofAge === 'number') {
      if (roofAge >= 20) {
        predictions.push({
          need: 'Roof Replacement',
          confidence: 'high',
          reason: `Roof is ${roofAge} years old (typical lifespan: 20-25 years)`,
          suggestedAction: 'Schedule a free inspection to assess replacement options',
        })
      } else if (roofAge >= 15) {
        predictions.push({
          need: 'Roof Inspection',
          confidence: 'medium',
          reason: `Roof is ${roofAge} years old, approaching end of warranty period`,
          suggestedAction: 'Offer preventive inspection to catch issues early',
        })
      }
    }

    // Check for recent storm in area (simplified - would integrate with weather data)
    if (isStormSeason) {
      predictions.push({
        need: 'Storm Damage Inspection',
        confidence: 'medium',
        reason: 'Storm season - many homeowners have unreported damage',
        suggestedAction: 'Reach out about free storm damage assessment',
      })
    }

    // Check last project timing
    const lastWonProject = projects?.find(p =>
      p.stage?.toLowerCase() === 'won' || p.status?.toLowerCase() === 'won'
    )

    if (lastWonProject) {
      const projectDate = new Date(lastWonProject.created_at)
      const monthsSince = Math.floor((Date.now() - projectDate.getTime()) / (1000 * 60 * 60 * 24 * 30))

      if (monthsSince >= 12) {
        predictions.push({
          need: 'Maintenance Check',
          confidence: 'medium',
          reason: `${monthsSince} months since last service`,
          suggestedAction: 'Offer annual maintenance inspection',
        })
      }
    }

    // Check for abandoned estimates
    const pendingProjects = projects?.filter(p =>
      !['won', 'lost', 'completed'].includes(p.stage?.toLowerCase() || '') &&
      !['won', 'lost'].includes(p.status?.toLowerCase() || '')
    )

    if (pendingProjects && pendingProjects.length > 0) {
      const oldestPending = pendingProjects[pendingProjects.length - 1]
      const daysSince = Math.floor(
        (Date.now() - new Date(oldestPending.created_at).getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysSince > 30) {
        predictions.push({
          need: 'Follow-up on Estimate',
          confidence: 'high',
          reason: `Pending estimate from ${daysSince} days ago: "${oldestPending.name}"`,
          suggestedAction: 'Re-engage with updated pricing or special offer',
        })
      }
    }

    // Check if customer has had insurance claim work
    const hasClaimWork = projects?.some(p =>
      p.custom_fields?.insurance_claim ||
      p.name?.toLowerCase().includes('insurance') ||
      p.name?.toLowerCase().includes('claim')
    )

    if (hasClaimWork) {
      predictions.push({
        need: 'Referral Opportunity',
        confidence: 'medium',
        reason: 'Customer has experience with insurance claims process',
        suggestedAction: 'Ask for referrals to neighbors who may have storm damage',
      })
    }

    // Default if no predictions
    if (predictions.length === 0) {
      predictions.push({
        need: 'Relationship Building',
        confidence: 'low',
        reason: 'No specific needs identified',
        suggestedAction: 'Send seasonal maintenance tips or company newsletter',
      })
    }

    // Format message
    let message = `🔮 Predicted Needs for ${contact.first_name} ${contact.last_name}:\n\n`

    for (const pred of predictions) {
      const confIcon = pred.confidence === 'high' ? '🎯' : pred.confidence === 'medium' ? '📊' : '💡'
      message += `${confIcon} ${pred.need} (${pred.confidence} confidence)\n`
      message += `   Reason: ${pred.reason}\n`
      message += `   Action: ${pred.suggestedAction}\n\n`
    }

    return {
      success: true,
      data: {
        contactName: `${contact.first_name} ${contact.last_name}`,
        predictions,
        projectCount: projects?.length || 0,
        recentActivityCount: recentActivities?.length || 0,
      },
      message,
    }
  },
})

// =============================================================================
// get_similar_customers - Find customers with similar characteristics
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_similar_customers',
  category: 'intelligence',
  description: 'Find customers with similar characteristics',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_similar_customers',
    description: 'Find other customers with similar characteristics like insurance carrier, location, or project type.',
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'Reference contact ID to find similar customers',
        },
        criteria: {
          type: 'string',
          enum: ['insurance_carrier', 'location', 'project_type', 'roof_type'],
          description: 'What criteria to match on',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of similar customers to return (default: 10)',
        },
      },
      required: ['criteria'],
    },
  },
  execute: async (args, context) => {
    const { contact_id, criteria, limit = 10 } = args as {
      contact_id?: string
      criteria: string
      limit?: number
    }

    const targetContactId = contact_id || context.contact?.id
    if (!targetContactId) {
      return { success: false, error: 'No contact specified' }
    }

    // Get reference contact
    const { data: refContact, error: refError } = await context.supabase
      .from('contacts')
      .select('id, first_name, last_name, address_city, address_state, address_zip, custom_fields')
      .eq('id', targetContactId)
      .single()

    if (refError || !refContact) {
      return { success: false, error: 'Reference contact not found' }
    }

    let similarContacts: Array<{
      id: string
      first_name: string
      last_name: string
      address_city?: string
      address_state?: string
      matchReason: string
    }> = []

    switch (criteria) {
      case 'insurance_carrier': {
        const carrier = refContact.custom_fields?.insurance_carrier
        if (!carrier) {
          return { success: false, error: 'Reference contact has no insurance carrier on file' }
        }

        const { data: contacts } = await context.supabase
          .from('contacts')
          .select('id, first_name, last_name, address_city, address_state, custom_fields')
          .eq('tenant_id', context.tenantId)
          .eq('is_deleted', false)
          .neq('id', targetContactId)
          .limit(limit * 2) // Fetch extra to filter

        similarContacts = (contacts || [])
          .filter(c => c.custom_fields?.insurance_carrier === carrier)
          .slice(0, limit)
          .map(c => ({
            id: c.id,
            first_name: c.first_name,
            last_name: c.last_name,
            address_city: c.address_city,
            address_state: c.address_state,
            matchReason: `Same insurance carrier: ${carrier}`,
          }))
        break
      }

      case 'location': {
        const zip = refContact.address_zip
        const city = refContact.address_city

        if (!zip && !city) {
          return { success: false, error: 'Reference contact has no location on file' }
        }

        let query = context.supabase
          .from('contacts')
          .select('id, first_name, last_name, address_city, address_state, address_zip')
          .eq('tenant_id', context.tenantId)
          .eq('is_deleted', false)
          .neq('id', targetContactId)
          .limit(limit)

        if (zip) {
          query = query.eq('address_zip', zip)
        } else if (city) {
          query = query.eq('address_city', city)
        }

        const { data: contacts } = await query

        similarContacts = (contacts || []).map(c => ({
          id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
          address_city: c.address_city,
          address_state: c.address_state,
          matchReason: zip ? `Same ZIP code: ${zip}` : `Same city: ${city}`,
        }))
        break
      }

      case 'roof_type': {
        const roofType = refContact.custom_fields?.roof_type || refContact.custom_fields?.roofType
        if (!roofType) {
          return { success: false, error: 'Reference contact has no roof type on file' }
        }

        const { data: contacts } = await context.supabase
          .from('contacts')
          .select('id, first_name, last_name, address_city, address_state, custom_fields')
          .eq('tenant_id', context.tenantId)
          .eq('is_deleted', false)
          .neq('id', targetContactId)
          .limit(limit * 2)

        similarContacts = (contacts || [])
          .filter(c =>
            c.custom_fields?.roof_type === roofType ||
            c.custom_fields?.roofType === roofType
          )
          .slice(0, limit)
          .map(c => ({
            id: c.id,
            first_name: c.first_name,
            last_name: c.last_name,
            address_city: c.address_city,
            address_state: c.address_state,
            matchReason: `Same roof type: ${roofType}`,
          }))
        break
      }

      case 'project_type': {
        // Get reference contact's projects
        const { data: refProjects } = await context.supabase
          .from('projects')
          .select('name, custom_fields')
          .eq('tenant_id', context.tenantId)
          .eq('contact_id', targetContactId)
          .limit(5)

        // Determine project type from names
        const hasInsuranceClaim = refProjects?.some(p =>
          p.name?.toLowerCase().includes('insurance') ||
          p.name?.toLowerCase().includes('claim') ||
          p.custom_fields?.is_insurance_claim
        )

        if (hasInsuranceClaim) {
          // Find other customers with insurance projects
          const { data: projects } = await context.supabase
            .from('projects')
            .select('contact_id, contacts:contact_id(id, first_name, last_name, city, state)')
            .eq('tenant_id', context.tenantId)
            .eq('is_deleted', false)
            .neq('contact_id', targetContactId)
            .ilike('name', '%insurance%')
            .limit(limit)

          const seenIds = new Set<string>()
          similarContacts = (projects || [])
            .filter(p => {
              const c = Array.isArray(p.contacts) ? p.contacts[0] : p.contacts
              if (!c || seenIds.has(c.id)) return false
              seenIds.add(c.id)
              return true
            })
            .map(p => {
              const c = Array.isArray(p.contacts) ? p.contacts[0] : p.contacts
              return {
                id: c.id,
                first_name: c.first_name,
                last_name: c.last_name,
                city: c.city,
                state: c.state,
                matchReason: 'Has insurance claim project',
              }
            })
        } else {
          return { success: false, error: 'Could not determine project type for comparison' }
        }
        break
      }

      default:
        return { success: false, error: `Unknown criteria: ${criteria}` }
    }

    if (similarContacts.length === 0) {
      return {
        success: true,
        data: { similarContacts: [] },
        message: `No similar customers found matching "${criteria}" criteria.`,
      }
    }

    let message = `Found ${similarContacts.length} similar customer(s) by ${criteria}:\n\n`
    for (const c of similarContacts) {
      const loc = c.address_city && c.address_state ? ` (${c.address_city}, ${c.address_state})` : ''
      message += `• ${c.first_name} ${c.last_name}${loc}\n  ${c.matchReason}\n`
    }

    return {
      success: true,
      data: {
        referenceContact: `${refContact.first_name} ${refContact.last_name}`,
        criteria,
        similarContacts,
        count: similarContacts.length,
      },
      message,
    }
  },
})

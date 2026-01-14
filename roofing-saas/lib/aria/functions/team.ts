/**
 * ARIA Team & Dispatch Intelligence Functions (Phase 9)
 *
 * Provides ARIA with team management capabilities:
 * - Team availability checking
 * - Technician location tracking
 * - Route optimization for jobs
 * - Job reassignment
 * - Performance metrics
 * - Team notifications
 */

import { ariaFunctionRegistry } from '../function-registry'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { planCanvassingRoute, type RouteWaypoint } from '@/lib/maps/routes'
import { sendSMS, sendBulkSMS } from '@/lib/twilio/sms'

// =============================================================================
// Type Definitions for Supabase Query Results
// =============================================================================

interface ProjectJoin {
  id: string
  name: string
  address_street?: string
  address_city?: string
  address_state?: string
  address_zip?: string
  latitude?: number
  longitude?: number
}

interface _JobWithProject {
  id: string
  job_number: string
  scheduled_date: string
  scheduled_start_time?: string
  scheduled_end_time?: string
  estimated_duration_hours?: number
  crew_lead?: string
  crew_members?: string[]
  status: string
  projects: ProjectJoin
}

interface LeaderboardEntry {
  name: string
  total_jobs?: number
  completed_jobs?: number
  in_progress_jobs?: number
  scheduled_jobs?: number
  cancelled_jobs?: number
  avg_quality_score?: number
  total_weather_delays?: number
  avg_completion_percentage?: number
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Calculate time ago string
 */
function timeAgo(minutesAgo: number): string {
  if (minutesAgo < 1) return 'just now'
  if (minutesAgo < 60) return `${Math.round(minutesAgo)} minutes ago`
  const hours = Math.round(minutesAgo / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

// =============================================================================
// get_team_availability - "Who's free tomorrow?"
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_team_availability',
  category: 'team',
  description: 'Check team member availability for a specific date or date range',
  riskLevel: 'low',
  enabledByDefault: true,

  voiceDefinition: {
    type: 'function',
    name: 'get_team_availability',
    description: 'Check which team members are available on a given date. Returns crew members with their scheduled jobs and available time slots.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date to check availability for (ISO format YYYY-MM-DD). Defaults to today.',
        },
        role: {
          type: 'string',
          description: 'Filter by role: foreman, journeyman, apprentice, project_manager',
          enum: ['foreman', 'journeyman', 'apprentice', 'master', 'project_manager', 'subcontractor'],
        },
      },
      required: [],
    },
  },

  execute: async (args, context) => {
    try {
      const supabase = await createAdminClient()
      const targetDate = args.date ? new Date(args.date as string) : new Date()
      const dateStr = targetDate.toISOString().split('T')[0]

      // Get all active crew members
      let crewQuery = supabase
        .from('crew_members')
        .select('id, user_id, first_name, last_name, role, phone, hourly_rate')
        .eq('tenant_id', context.tenantId)
        .eq('is_active', true)

      if (args.role) {
        crewQuery = crewQuery.eq('role', args.role as string)
      }

      const { data: crewMembers, error: crewError } = await crewQuery

      if (crewError) {
        logger.error('[ARIA] Error fetching crew members', { error: crewError })
        return { success: false, error: 'Failed to fetch team members' }
      }

      // Get jobs scheduled for this date
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          id,
          job_number,
          scheduled_date,
          scheduled_start_time,
          scheduled_end_time,
          estimated_duration_hours,
          crew_lead,
          crew_members,
          status,
          projects!inner(name, address_street, address_city)
        `)
        .eq('tenant_id', context.tenantId)
        .eq('scheduled_date', dateStr)
        .neq('status', 'cancelled')
        .eq('is_deleted', false)

      if (jobsError) {
        logger.error('[ARIA] Error fetching jobs', { error: jobsError })
        return { success: false, error: 'Failed to fetch scheduled jobs' }
      }

      // Build availability map
      const availability = (crewMembers || []).map((member) => {
        const assignedJobs = (jobs || []).filter((job) => {
          return (
            job.crew_lead === member.user_id ||
            (job.crew_members && job.crew_members.includes(member.user_id))
          )
        })

        const totalScheduledHours = assignedJobs.reduce(
          (sum, job) => sum + (job.estimated_duration_hours || 8),
          0
        )

        const isAvailable = assignedJobs.length === 0
        const availableHours = Math.max(0, 8 - totalScheduledHours)

        return {
          id: member.id,
          user_id: member.user_id,
          name: `${member.first_name} ${member.last_name}`,
          role: member.role,
          phone: member.phone,
          is_available: isAvailable,
          available_hours: availableHours,
          scheduled_jobs: assignedJobs.map((job) => {
            const proj = job.projects as unknown as ProjectJoin
            return {
              job_number: job.job_number,
              project: proj?.name,
              location: `${proj?.address_street || ''}, ${proj?.address_city || ''}`,
              start_time: job.scheduled_start_time,
              end_time: job.scheduled_end_time,
              duration_hours: job.estimated_duration_hours,
              status: job.status,
              is_crew_lead: job.crew_lead === member.user_id,
            }
          }),
        }
      })

      const availableCount = availability.filter((m) => m.is_available).length
      const busyCount = availability.filter((m) => !m.is_available).length

      return {
        success: true,
        date: formatDate(targetDate),
        summary: {
          total_members: availability.length,
          available: availableCount,
          busy: busyCount,
          total_jobs_scheduled: (jobs || []).length,
        },
        team: availability,
        available_members: availability
          .filter((m) => m.is_available)
          .map((m) => `${m.name} (${m.role})`),
      }
    } catch (error) {
      logger.error('[ARIA] Error in get_team_availability', { error })
      return { success: false, error: 'Failed to check team availability' }
    }
  },
})

// =============================================================================
// get_technician_location - "Where is Mike right now?"
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_technician_location',
  category: 'team',
  description: 'Get the current GPS location of a technician or all active field reps',
  riskLevel: 'low',
  enabledByDefault: true,

  voiceDefinition: {
    type: 'function',
    name: 'get_technician_location',
    description: 'Get the current location of a specific technician by name, or get all active field reps with their locations',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the technician to locate (partial match supported)',
        },
        all_active: {
          type: 'boolean',
          description: 'If true, return all active reps (pinged within last 30 minutes)',
        },
      },
      required: [],
    },
  },

  execute: async (args, context) => {
    try {
      const supabase = await createAdminClient()

      if (args.all_active) {
        // Get all active reps using the database function
        const { data: activeReps, error } = await supabase.rpc('get_active_reps', {
          p_tenant_id: context.tenantId,
        })

        if (error) {
          logger.error('[ARIA] Error getting active reps', { error })
          return { success: false, error: 'Failed to get active reps' }
        }

        if (!activeReps || activeReps.length === 0) {
          return {
            success: true,
            found: false,
            message: 'No active reps found in the last 30 minutes',
            active_reps: [],
          }
        }

        return {
          success: true,
          found: true,
          count: activeReps.length,
          active_reps: activeReps.map((rep: {
            user_id: string
            full_name: string
            latitude: number
            longitude: number
            last_ping: string
          }) => ({
            user_id: rep.user_id,
            name: rep.full_name,
            location: {
              latitude: rep.latitude,
              longitude: rep.longitude,
            },
            last_ping: rep.last_ping,
            maps_link: `https://maps.google.com/?q=${rep.latitude},${rep.longitude}`,
          })),
        }
      }

      // Find specific technician by name
      if (!args.name) {
        return {
          success: false,
          error: 'Please provide a technician name or set all_active to true',
        }
      }

      // Search for the crew member by name
      const { data: crewMembers, error: crewError } = await supabase
        .from('crew_members')
        .select('id, user_id, first_name, last_name')
        .eq('tenant_id', context.tenantId)
        .eq('is_active', true)
        .or(`first_name.ilike.%${args.name}%,last_name.ilike.%${args.name}%`)

      if (crewError || !crewMembers || crewMembers.length === 0) {
        return {
          success: true,
          found: false,
          message: `No crew member found matching "${args.name}"`,
        }
      }

      // Get the latest location for the first matching crew member
      const member = crewMembers[0]
      const { data: location, error: locError } = await supabase.rpc(
        'get_latest_rep_location',
        { p_user_id: member.user_id }
      )

      if (locError || !location || location.length === 0) {
        return {
          success: true,
          found: true,
          technician: {
            name: `${member.first_name} ${member.last_name}`,
            user_id: member.user_id,
          },
          location: null,
          message: `${member.first_name} ${member.last_name} found but no recent location data`,
        }
      }

      const loc = location[0]
      return {
        success: true,
        found: true,
        technician: {
          name: `${member.first_name} ${member.last_name}`,
          user_id: member.user_id,
        },
        location: {
          latitude: loc.latitude,
          longitude: loc.longitude,
          recorded_at: loc.recorded_at,
          time_ago: timeAgo(loc.minutes_ago),
        },
        maps_link: `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`,
      }
    } catch (error) {
      logger.error('[ARIA] Error in get_technician_location', { error })
      return { success: false, error: 'Failed to get technician location' }
    }
  },
})

// =============================================================================
// optimize_route - "What's the best order for today's jobs?"
// =============================================================================

ariaFunctionRegistry.register({
  name: 'optimize_route',
  category: 'team',
  description: 'Optimize the route for a set of jobs or addresses to minimize travel time',
  riskLevel: 'low',
  enabledByDefault: true,

  voiceDefinition: {
    type: 'function',
    name: 'optimize_route',
    description: 'Calculate the optimal route between multiple job sites or addresses. Can optimize jobs for a specific crew lead on a date, or optimize custom addresses.',
    parameters: {
      type: 'object',
      properties: {
        crew_lead_name: {
          type: 'string',
          description: 'Name of the crew lead to optimize route for',
        },
        date: {
          type: 'string',
          description: 'Date to optimize route for (ISO format YYYY-MM-DD). Defaults to today.',
        },
        start_address: {
          type: 'string',
          description: 'Starting address (defaults to first job location)',
        },
        return_to_start: {
          type: 'boolean',
          description: 'Whether to return to starting point after last stop',
        },
      },
      required: [],
    },
  },

  execute: async (args, context) => {
    try {
      const supabase = await createAdminClient()
      const targetDate = args.date ? new Date(args.date as string) : new Date()
      const dateStr = targetDate.toISOString().split('T')[0]

      // Find crew lead by name if provided
      let crewLeadId: string | null = null
      if (args.crew_lead_name) {
        const { data: crewMembers } = await supabase
          .from('crew_members')
          .select('user_id, first_name, last_name')
          .eq('tenant_id', context.tenantId)
          .eq('is_active', true)
          .or(
            `first_name.ilike.%${args.crew_lead_name}%,last_name.ilike.%${args.crew_lead_name}%`
          )

        if (crewMembers && crewMembers.length > 0) {
          crewLeadId = crewMembers[0].user_id
        }
      }

      // Get jobs for the date (optionally filtered by crew lead)
      let jobsQuery = supabase
        .from('jobs')
        .select(`
          id,
          job_number,
          scheduled_start_time,
          projects!inner(
            id,
            name,
            address_street,
            address_city,
            address_state,
            address_zip,
            latitude,
            longitude
          )
        `)
        .eq('tenant_id', context.tenantId)
        .eq('scheduled_date', dateStr)
        .in('status', ['scheduled', 'in_progress'])
        .eq('is_deleted', false)
        .order('scheduled_start_time', { ascending: true })

      if (crewLeadId) {
        jobsQuery = jobsQuery.eq('crew_lead', crewLeadId)
      }

      const { data: jobs, error: jobsError } = await jobsQuery

      if (jobsError) {
        logger.error('[ARIA] Error fetching jobs for route', { error: jobsError })
        return { success: false, error: 'Failed to fetch jobs for route optimization' }
      }

      if (!jobs || jobs.length === 0) {
        return {
          success: true,
          found: false,
          message: args.crew_lead_name
            ? `No jobs scheduled for ${args.crew_lead_name} on ${formatDate(targetDate)}`
            : `No jobs scheduled for ${formatDate(targetDate)}`,
        }
      }

      if (jobs.length === 1) {
        const job = jobs[0]
        const project = job.projects as unknown as ProjectJoin
        return {
          success: true,
          found: true,
          message: 'Only one job scheduled - no optimization needed',
          jobs: [
            {
              job_number: job.job_number,
              project: project.name,
              address: `${project.address_street || ''}, ${project.address_city || ''}`,
              scheduled_time: job.scheduled_start_time,
            },
          ],
        }
      }

      // Build waypoints from jobs with coordinates
      const waypointCandidates = jobs
        .map((job, index) => {
          const project = job.projects as unknown as ProjectJoin
          if (!project.latitude || !project.longitude) return null
          return {
            id: job.id,
            latitude: project.latitude,
            longitude: project.longitude,
            address: `${project.address_street || ''}, ${project.address_city || ''}`,
            name: `${index + 1}. ${job.job_number} - ${project.name}`,
          } as RouteWaypoint
        })
      const waypoints = waypointCandidates.filter((wp): wp is RouteWaypoint => wp !== null)

      if (waypoints.length < 2) {
        return {
          success: true,
          found: true,
          message: 'Not enough geocoded addresses for route optimization',
          jobs: jobs.map((job) => {
            const project = job.projects as unknown as ProjectJoin
            return {
              job_number: job.job_number,
              project: project.name,
              address: project.address_street,
              scheduled_time: job.scheduled_start_time,
            }
          }),
        }
      }

      // Use the first waypoint as start
      const startLocation = waypoints[0]
      const otherWaypoints = waypoints.slice(1)

      const optimizedRoute = await planCanvassingRoute(
        startLocation,
        otherWaypoints,
        args.return_to_start === true
      )

      return {
        success: true,
        found: true,
        date: formatDate(targetDate),
        original_order: jobs.map((j) => j.job_number),
        optimized_route: {
          waypoints: [startLocation, ...optimizedRoute.waypoints].map((wp, index) => ({
            stop: index + 1,
            job: wp.name,
            address: wp.address,
            maps_link: `https://maps.google.com/?q=${wp.latitude},${wp.longitude}`,
          })),
          total_distance_km: Math.round(optimizedRoute.total_distance_meters / 1000),
          estimated_drive_time_minutes: optimizedRoute.total_duration_minutes,
        },
        savings: {
          note: 'Route optimized using nearest-neighbor algorithm',
        },
      }
    } catch (error) {
      logger.error('[ARIA] Error in optimize_route', { error })
      return { success: false, error: 'Failed to optimize route' }
    }
  },
})

// =============================================================================
// reassign_job - "Move the 2pm to Sarah"
// =============================================================================

ariaFunctionRegistry.register({
  name: 'reassign_job',
  category: 'team',
  description: 'Reassign a job from one crew member to another',
  riskLevel: 'medium',
  requiresConfirmation: true,
  enabledByDefault: true,

  voiceDefinition: {
    type: 'function',
    name: 'reassign_job',
    description: 'Reassign a job to a different crew lead or add/remove crew members. Can identify jobs by job number or by description (e.g., "the 2pm job").',
    parameters: {
      type: 'object',
      properties: {
        job_number: {
          type: 'string',
          description: 'The job number to reassign (e.g., "25-0042")',
        },
        job_description: {
          type: 'string',
          description: 'Description of job if number unknown (e.g., "2pm job", "Smith project")',
        },
        new_crew_lead: {
          type: 'string',
          description: 'Name of the new crew lead',
        },
        add_crew_members: {
          type: 'array',
          items: { type: 'string' },
          description: 'Names of crew members to add to the job',
        },
        remove_crew_members: {
          type: 'array',
          items: { type: 'string' },
          description: 'Names of crew members to remove from the job',
        },
        reason: {
          type: 'string',
          description: 'Reason for reassignment (for audit trail)',
        },
      },
      required: [],
    },
  },

  execute: async (args, context) => {
    try {
      const supabase = await createAdminClient()

      // Find the job
      let jobQuery = supabase
        .from('jobs')
        .select(`
          id,
          job_number,
          scheduled_date,
          scheduled_start_time,
          crew_lead,
          crew_members,
          status,
          projects!inner(name)
        `)
        .eq('tenant_id', context.tenantId)
        .eq('is_deleted', false)
        .in('status', ['scheduled', 'in_progress'])

      if (args.job_number) {
        jobQuery = jobQuery.ilike('job_number', `%${args.job_number}%`)
      }

      const { data: jobs, error: jobError } = await jobQuery.limit(5)

      if (jobError || !jobs || jobs.length === 0) {
        return {
          success: false,
          error: args.job_number
            ? `No job found matching "${args.job_number}"`
            : 'Could not find the specified job',
        }
      }

      // If multiple jobs found, need more specificity
      if (jobs.length > 1 && !args.job_number) {
        return {
          success: false,
          error: 'Multiple jobs found. Please specify a job number.',
          matching_jobs: jobs.map((j) => {
            const proj = j.projects as unknown as ProjectJoin
            return {
              job_number: j.job_number,
              project: proj?.name,
              date: j.scheduled_date,
              time: j.scheduled_start_time,
            }
          }),
        }
      }

      const job = jobs[0]
      const updates: Record<string, unknown> = {}
      const changes: string[] = []

      // Find new crew lead if specified
      if (args.new_crew_lead) {
        const { data: crewMembers } = await supabase
          .from('crew_members')
          .select('user_id, first_name, last_name')
          .eq('tenant_id', context.tenantId)
          .eq('is_active', true)
          .or(
            `first_name.ilike.%${args.new_crew_lead}%,last_name.ilike.%${args.new_crew_lead}%`
          )

        if (!crewMembers || crewMembers.length === 0) {
          return {
            success: false,
            error: `No crew member found matching "${args.new_crew_lead}"`,
          }
        }

        const newLead = crewMembers[0]
        updates.crew_lead = newLead.user_id
        changes.push(
          `Crew lead changed to ${newLead.first_name} ${newLead.last_name}`
        )
      }

      // Handle add/remove crew members
      const currentCrewMembers: string[] = [...(job.crew_members || [])]

      if (args.add_crew_members && Array.isArray(args.add_crew_members)) {
        for (const name of args.add_crew_members) {
          const { data: crewMembers } = await supabase
            .from('crew_members')
            .select('user_id, first_name, last_name')
            .eq('tenant_id', context.tenantId)
            .eq('is_active', true)
            .or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`)

          if (crewMembers && crewMembers.length > 0) {
            const member = crewMembers[0]
            if (!currentCrewMembers.includes(member.user_id)) {
              currentCrewMembers.push(member.user_id)
              changes.push(`Added ${member.first_name} ${member.last_name} to crew`)
            }
          }
        }
      }

      if (args.remove_crew_members && Array.isArray(args.remove_crew_members)) {
        for (const name of args.remove_crew_members) {
          const { data: crewMembers } = await supabase
            .from('crew_members')
            .select('user_id, first_name, last_name')
            .eq('tenant_id', context.tenantId)
            .or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`)

          if (crewMembers && crewMembers.length > 0) {
            const member = crewMembers[0]
            const index = currentCrewMembers.indexOf(member.user_id)
            if (index > -1) {
              currentCrewMembers.splice(index, 1)
              changes.push(`Removed ${member.first_name} ${member.last_name} from crew`)
            }
          }
        }
      }

      const addMembers = Array.isArray(args.add_crew_members) ? args.add_crew_members : []
      const removeMembers = Array.isArray(args.remove_crew_members) ? args.remove_crew_members : []
      if (addMembers.length > 0 || removeMembers.length > 0) {
        updates.crew_members = currentCrewMembers
        updates.crew_size = currentCrewMembers.length
      }

      if (Object.keys(updates).length === 0) {
        return {
          success: false,
          error: 'No changes specified. Please provide new_crew_lead, add_crew_members, or remove_crew_members.',
        }
      }

      // Update the job
      updates.updated_at = new Date().toISOString()

      const { error: updateError } = await supabase
        .from('jobs')
        .update(updates)
        .eq('id', job.id)

      if (updateError) {
        logger.error('[ARIA] Error updating job', { error: updateError })
        return { success: false, error: 'Failed to reassign job' }
      }

      const jobProject = job.projects as unknown as ProjectJoin
      return {
        success: true,
        job_number: job.job_number,
        project: jobProject?.name,
        changes: changes,
        reason: args.reason || 'No reason provided',
        message: `Job ${job.job_number} has been updated: ${changes.join(', ')}`,
      }
    } catch (error) {
      logger.error('[ARIA] Error in reassign_job', { error })
      return { success: false, error: 'Failed to reassign job' }
    }
  },
})

// =============================================================================
// get_performance_metrics - "How is John doing this month?"
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_performance_metrics',
  category: 'team',
  description: 'Get performance metrics for a crew member or the entire team',
  riskLevel: 'low',
  enabledByDefault: true,

  voiceDefinition: {
    type: 'function',
    name: 'get_performance_metrics',
    description: 'Get detailed performance metrics for a specific crew member or compare all crew leads. Includes jobs completed, quality scores, on-time completion, and more.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the crew member to get metrics for',
        },
        period: {
          type: 'string',
          description: 'Time period: this_week, this_month, last_month, this_quarter, this_year',
          enum: ['this_week', 'this_month', 'last_month', 'this_quarter', 'this_year'],
        },
        compare_all: {
          type: 'boolean',
          description: 'If true, return metrics for all crew leads for comparison',
        },
      },
      required: [],
    },
  },

  execute: async (args, context) => {
    try {
      const supabase = await createAdminClient()

      // Calculate date range
      const now = new Date()
      let startDate: Date
      let endDate = new Date()

      switch (args.period || 'this_month') {
        case 'this_week':
          startDate = new Date(now)
          startDate.setDate(now.getDate() - now.getDay())
          break
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          endDate = new Date(now.getFullYear(), now.getMonth(), 0)
          break
        case 'this_quarter':
          const quarter = Math.floor(now.getMonth() / 3)
          startDate = new Date(now.getFullYear(), quarter * 3, 1)
          break
        case 'this_year':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        case 'this_month':
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
      }

      const startStr = startDate.toISOString().split('T')[0]
      const endStr = endDate.toISOString().split('T')[0]

      if (args.compare_all) {
        // Get all crew leads with their stats
        const { data: crewLeads, error: crewError } = await supabase
          .from('crew_members')
          .select('user_id, first_name, last_name')
          .eq('tenant_id', context.tenantId)
          .eq('is_active', true)
          .in('role', ['foreman', 'project_manager'])

        if (crewError || !crewLeads) {
          return { success: false, error: 'Failed to fetch crew leads' }
        }

        const leaderboard: LeaderboardEntry[] = await Promise.all(
          crewLeads.map(async (lead) => {
            const { data: stats } = await supabase.rpc('get_crew_lead_stats', {
              p_user_id: lead.user_id,
              p_start_date: startStr,
              p_end_date: endStr,
            })

            const statsObj = (stats as Record<string, unknown>) || {}
            return {
              name: `${lead.first_name} ${lead.last_name}`,
              total_jobs: (statsObj.total_jobs as number) || 0,
              completed_jobs: (statsObj.completed_jobs as number) || 0,
              in_progress_jobs: (statsObj.in_progress_jobs as number) || 0,
              scheduled_jobs: (statsObj.scheduled_jobs as number) || 0,
              cancelled_jobs: (statsObj.cancelled_jobs as number) || 0,
              avg_quality_score: (statsObj.avg_quality_score as number) || undefined,
              total_weather_delays: (statsObj.total_weather_delays as number) || 0,
              avg_completion_percentage: (statsObj.avg_completion_percentage as number) || undefined,
            }
          })
        )

        // Sort by completed jobs
        leaderboard.sort((a, b) => (b.completed_jobs || 0) - (a.completed_jobs || 0))

        return {
          success: true,
          period: args.period || 'this_month',
          date_range: { start: startStr, end: endStr },
          leaderboard: leaderboard,
          top_performer: leaderboard[0]?.name || 'N/A',
        }
      }

      // Get specific crew member
      if (!args.name) {
        return {
          success: false,
          error: 'Please provide a crew member name or set compare_all to true',
        }
      }

      const { data: crewMembers, error: crewError } = await supabase
        .from('crew_members')
        .select('user_id, first_name, last_name, role, hourly_rate')
        .eq('tenant_id', context.tenantId)
        .or(`first_name.ilike.%${args.name}%,last_name.ilike.%${args.name}%`)

      if (crewError || !crewMembers || crewMembers.length === 0) {
        return {
          success: true,
          found: false,
          message: `No crew member found matching "${args.name}"`,
        }
      }

      const member = crewMembers[0]

      // Get stats using the database function
      const { data: stats, error: statsError } = await supabase.rpc(
        'get_crew_lead_stats',
        {
          p_user_id: member.user_id,
          p_start_date: startStr,
          p_end_date: endStr,
        }
      )

      if (statsError) {
        logger.error('[ARIA] Error getting crew stats', { error: statsError })
        return { success: false, error: 'Failed to get performance metrics' }
      }

      // Get additional metrics from jobs directly
      const { data: jobs } = await supabase
        .from('jobs')
        .select('status, completion_percentage, quality_score, weather_delay_days')
        .eq('tenant_id', context.tenantId)
        .eq('crew_lead', member.user_id)
        .gte('scheduled_date', startStr)
        .lte('scheduled_date', endStr)
        .eq('is_deleted', false)

      const completedJobs = (jobs || []).filter((j) => j.status === 'completed')
      const avgQuality =
        completedJobs.length > 0
          ? completedJobs.reduce((sum, j) => sum + (j.quality_score || 0), 0) /
            completedJobs.filter((j) => j.quality_score).length
          : null

      return {
        success: true,
        found: true,
        crew_member: {
          name: `${member.first_name} ${member.last_name}`,
          role: member.role,
        },
        period: args.period || 'this_month',
        date_range: { start: startStr, end: endStr },
        metrics: {
          ...(stats as Record<string, unknown>),
          jobs_analyzed: (jobs || []).length,
          average_quality_score: avgQuality ? Math.round(avgQuality * 10) / 10 : 'N/A',
        },
        highlights: [
          completedJobs.length > 0
            ? `Completed ${completedJobs.length} job${completedJobs.length > 1 ? 's' : ''}`
            : 'No completed jobs',
          avgQuality && avgQuality >= 8 ? 'Excellent quality scores' : null,
          (stats as { total_weather_delays?: number })?.total_weather_delays
            ? `${(stats as { total_weather_delays: number }).total_weather_delays} weather delay days`
            : null,
        ].filter(Boolean),
      }
    } catch (error) {
      logger.error('[ARIA] Error in get_performance_metrics', { error })
      return { success: false, error: 'Failed to get performance metrics' }
    }
  },
})

// =============================================================================
// send_team_notification - "Tell the crew about the schedule change"
// =============================================================================

ariaFunctionRegistry.register({
  name: 'send_team_notification',
  category: 'team',
  description: 'Send an SMS notification to team members',
  riskLevel: 'medium',
  requiresConfirmation: true,
  enabledByDefault: true,

  voiceDefinition: {
    type: 'function',
    name: 'send_team_notification',
    description: 'Send SMS notifications to crew members. Can target specific people by name, all crew on a job, or all active crew.',
    parameters: {
      type: 'object',
      properties: {
        recipients: {
          type: 'array',
          items: { type: 'string' },
          description: 'Names of crew members to notify',
        },
        job_number: {
          type: 'string',
          description: 'Job number to notify all crew members on that job',
        },
        all_active: {
          type: 'boolean',
          description: 'If true, notify all active crew members',
        },
        message: {
          type: 'string',
          description: 'The message to send',
        },
        notification_type: {
          type: 'string',
          description: 'Type of notification for templates',
          enum: ['schedule_change', 'job_update', 'weather_alert', 'general'],
        },
      },
      required: ['message'],
    },
  },

  execute: async (args, context) => {
    try {
      if (!args.message) {
        return { success: false, error: 'Message is required' }
      }

      const supabase = await createAdminClient()
      const recipientPhones: { name: string; phone: string }[] = []

      // Get recipients based on parameters
      if (args.job_number) {
        // Get all crew on a specific job
        const { data: job } = await supabase
          .from('jobs')
          .select('crew_lead, crew_members')
          .eq('tenant_id', context.tenantId)
          .ilike('job_number', `%${args.job_number}%`)
          .single()

        if (job) {
          const userIds = [job.crew_lead, ...(job.crew_members || [])].filter(
            Boolean
          )
          const { data: crewMembers } = await supabase
            .from('crew_members')
            .select('first_name, last_name, phone')
            .eq('tenant_id', context.tenantId)
            .in('user_id', userIds)

          if (crewMembers) {
            for (const member of crewMembers) {
              if (member.phone) {
                recipientPhones.push({
                  name: `${member.first_name} ${member.last_name}`,
                  phone: member.phone,
                })
              }
            }
          }
        }
      } else if (args.all_active) {
        // Get all active crew members
        const { data: crewMembers } = await supabase
          .from('crew_members')
          .select('first_name, last_name, phone')
          .eq('tenant_id', context.tenantId)
          .eq('is_active', true)

        if (crewMembers) {
          for (const member of crewMembers) {
            if (member.phone) {
              recipientPhones.push({
                name: `${member.first_name} ${member.last_name}`,
                phone: member.phone,
              })
            }
          }
        }
      } else if (args.recipients && Array.isArray(args.recipients)) {
        // Get specific recipients by name
        for (const name of args.recipients) {
          const { data: crewMembers } = await supabase
            .from('crew_members')
            .select('first_name, last_name, phone')
            .eq('tenant_id', context.tenantId)
            .or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`)

          if (crewMembers) {
            for (const member of crewMembers) {
              if (member.phone) {
                recipientPhones.push({
                  name: `${member.first_name} ${member.last_name}`,
                  phone: member.phone,
                })
              }
            }
          }
        }
      }

      if (recipientPhones.length === 0) {
        return {
          success: false,
          error: 'No recipients found with valid phone numbers',
        }
      }

      // In draft mode (HITL), return what would be sent
      if (context.requiresConfirmation) {
        return {
          success: true,
          awaitingApproval: true,
          draft: {
            type: 'sms',
            recipients: recipientPhones.map((r) => r.name),
            body: args.message as string,
            metadata: {
              phones: recipientPhones.map((r) => r.phone),
              notification_type: args.notification_type || 'general',
            },
          },
          message: `Ready to send SMS to ${recipientPhones.length} recipient(s): ${recipientPhones.map((r) => r.name).join(', ')}`,
        }
      }

      // Send the notifications
      if (recipientPhones.length === 1) {
        await sendSMS({ to: recipientPhones[0].phone, body: args.message as string })
      } else {
        await sendBulkSMS(
          recipientPhones.map((r) => r.phone),
          args.message as string
        )
      }

      return {
        success: true,
        sent_to: recipientPhones.map((r) => r.name),
        count: recipientPhones.length,
        message: `Notification sent to ${recipientPhones.length} team member(s)`,
      }
    } catch (error) {
      logger.error('[ARIA] Error in send_team_notification', { error })
      return { success: false, error: 'Failed to send team notification' }
    }
  },
})

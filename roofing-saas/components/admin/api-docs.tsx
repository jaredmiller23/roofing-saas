'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Search,
  ChevronRight,
  Lock,
  Shield,
  Globe,
  BookOpen,
  Copy,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
type AuthLevel = 'required' | 'admin' | 'public'

interface ApiRoute {
  method: HttpMethod
  path: string
  description: string
  auth: AuthLevel
  body?: string
  response: string
}

interface ApiDomain {
  name: string
  description: string
  routes: ApiRoute[]
}

// ---------------------------------------------------------------------------
// Method badge colors — hardcoded per spec (theme exception)
// ---------------------------------------------------------------------------

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'bg-green-600 text-white',
  POST: 'bg-blue-600 text-white',
  PATCH: 'bg-yellow-600 text-white',
  PUT: 'bg-yellow-600 text-white',
  DELETE: 'bg-red-600 text-white',
}

// ---------------------------------------------------------------------------
// Auth badge config
// ---------------------------------------------------------------------------

const AUTH_CONFIG: Record<AuthLevel, { label: string; icon: typeof Lock; className: string }> = {
  required: { label: 'Auth Required', icon: Lock, className: 'text-muted-foreground' },
  admin: { label: 'Admin Only', icon: Shield, className: 'text-orange-500' },
  public: { label: 'Public', icon: Globe, className: 'text-green-500' },
}

// ---------------------------------------------------------------------------
// Route Catalog
// ---------------------------------------------------------------------------

const API_CATALOG: ApiDomain[] = [
  {
    name: 'Contacts',
    description: 'Manage customer and prospect records',
    routes: [
      {
        method: 'GET',
        path: '/api/contacts',
        description: 'List contacts with filtering, search, and pagination. Supports query params: search, status, source, page, limit, sort_by, sort_order.',
        auth: 'required',
        response: '{ success, data: Contact[], pagination: { page, limit, total, totalPages } }',
      },
      {
        method: 'POST',
        path: '/api/contacts',
        description: 'Create a new contact. Triggers workflow automation and awards gamification points.',
        auth: 'required',
        body: '{ first_name, last_name, email?, phone?, address?, city?, state?, zip?, source?, status?, notes?, tags? }',
        response: '{ success, data: Contact }',
      },
      {
        method: 'GET',
        path: '/api/contacts/[id]',
        description: 'Get a single contact by ID with full details.',
        auth: 'required',
        response: '{ success, data: Contact }',
      },
      {
        method: 'PATCH',
        path: '/api/contacts/[id]',
        description: 'Update contact fields. Partial updates supported.',
        auth: 'required',
        body: '{ first_name?, last_name?, email?, phone?, status?, ...any contact field }',
        response: '{ success, data: Contact }',
      },
      {
        method: 'DELETE',
        path: '/api/contacts/[id]',
        description: 'Soft-delete a contact (sets is_deleted = true).',
        auth: 'required',
        response: '{ success }',
      },
      {
        method: 'POST',
        path: '/api/contacts/check-duplicate',
        description: 'Check if a contact with the same phone or email already exists.',
        auth: 'required',
        body: '{ email?, phone? }',
        response: '{ success, isDuplicate, matches: Contact[] }',
      },
      {
        method: 'GET',
        path: '/api/contacts/[id]/score',
        description: 'Get the lead score for a contact.',
        auth: 'required',
        response: '{ success, data: { score, factors } }',
      },
      {
        method: 'POST',
        path: '/api/contacts/[id]/consent',
        description: 'Record communication consent for a contact (SMS, email, calls).',
        auth: 'required',
        body: '{ channel, consented, source? }',
        response: '{ success }',
      },
    ],
  },
  {
    name: 'Projects',
    description: 'Manage roofing jobs and project lifecycle',
    routes: [
      {
        method: 'GET',
        path: '/api/projects',
        description: 'List projects with filtering. Supports: status, pipeline_stage, assigned_to, search, page, limit.',
        auth: 'required',
        response: '{ success, data: Project[], pagination }',
      },
      {
        method: 'POST',
        path: '/api/projects',
        description: 'Create a new project linked to a contact.',
        auth: 'required',
        body: '{ contact_id, name, description?, address?, city?, state?, zip?, estimated_value?, pipeline_stage?, assigned_to? }',
        response: '{ success, data: Project }',
      },
      {
        method: 'GET',
        path: '/api/projects/[id]',
        description: 'Get full project details including contact, materials, and costs.',
        auth: 'required',
        response: '{ success, data: Project }',
      },
      {
        method: 'PATCH',
        path: '/api/projects/[id]',
        description: 'Update project fields. Pipeline stage changes trigger auto-status sync and validation.',
        auth: 'required',
        body: '{ name?, status?, pipeline_stage?, estimated_value?, approved_value?, assigned_to?, ...any project field }',
        response: '{ success, data: Project }',
      },
      {
        method: 'DELETE',
        path: '/api/projects/[id]',
        description: 'Soft-delete a project.',
        auth: 'required',
        response: '{ success }',
      },
      {
        method: 'GET',
        path: '/api/projects/filters',
        description: 'Get available filter values for the projects list (statuses, stages, team members).',
        auth: 'required',
        response: '{ success, data: { statuses, stages, team_members } }',
      },
      {
        method: 'POST',
        path: '/api/projects/[id]/start-production',
        description: 'Transition a project to production status. Validates required fields.',
        auth: 'required',
        body: '{ crew_lead_id?, scheduled_date? }',
        response: '{ success, data: Project }',
      },
      {
        method: 'GET',
        path: '/api/projects/[id]/materials',
        description: 'List materials associated with a project.',
        auth: 'required',
        response: '{ success, data: Material[] }',
      },
      {
        method: 'POST',
        path: '/api/projects/[id]/materials',
        description: 'Add a material line item to a project.',
        auth: 'required',
        body: '{ name, quantity, unit_cost, unit? }',
        response: '{ success, data: Material }',
      },
    ],
  },
  {
    name: 'Estimates & Proposals',
    description: 'Create, send, and manage customer estimates with multi-option proposals',
    routes: [
      {
        method: 'GET',
        path: '/api/estimates/[id]/proposals',
        description: 'Get all proposal options for an estimate, including line items.',
        auth: 'required',
        response: '{ success, data: QuoteProposal[] }',
      },
      {
        method: 'GET',
        path: '/api/estimates/[id]/options',
        description: 'Get estimate options (Good/Better/Best tiers) with line items.',
        auth: 'required',
        response: '{ success, data: QuoteOption[] }',
      },
      {
        method: 'POST',
        path: '/api/estimates/[id]/options',
        description: 'Create a new option tier for an estimate.',
        auth: 'required',
        body: '{ name, description?, line_items: { description, quantity, unit_price, unit? }[] }',
        response: '{ success, data: QuoteOption }',
      },
      {
        method: 'PATCH',
        path: '/api/estimates/[id]/options',
        description: 'Update an existing estimate option.',
        auth: 'required',
        body: '{ option_id, name?, description?, line_items? }',
        response: '{ success, data: QuoteOption }',
      },
      {
        method: 'DELETE',
        path: '/api/estimates/[id]/options',
        description: 'Remove an option tier from an estimate.',
        auth: 'required',
        response: '{ success }',
      },
      {
        method: 'POST',
        path: '/api/estimates/[id]/send',
        description: 'Send the estimate to the customer via email. Transitions status to "sent".',
        auth: 'required',
        body: '{ email?, message? }',
        response: '{ success }',
      },
      {
        method: 'GET',
        path: '/api/estimates/[id]/view',
        description: 'Public endpoint to view an estimate. Records "viewed" status. Used by customer-facing link.',
        auth: 'public',
        response: '{ success, data: EstimateView }',
      },
      {
        method: 'POST',
        path: '/api/estimates/[id]/accept',
        description: 'Customer accepts an estimate option. Transitions status to "accepted".',
        auth: 'public',
        body: '{ option_id, signature? }',
        response: '{ success }',
      },
      {
        method: 'POST',
        path: '/api/estimates/[id]/decline',
        description: 'Customer declines an estimate. Transitions status to "rejected".',
        auth: 'public',
        body: '{ reason? }',
        response: '{ success }',
      },
      {
        method: 'POST',
        path: '/api/estimates/[id]/pdf',
        description: 'Generate a PDF version of the estimate for download or email attachment.',
        auth: 'required',
        response: 'PDF binary (application/pdf)',
      },
    ],
  },
  {
    name: 'Tasks',
    description: 'Task management for projects and team members',
    routes: [
      {
        method: 'GET',
        path: '/api/tasks',
        description: 'List tasks with filtering. Supports: status, priority, assigned_to, project_id, due_date_from, due_date_to.',
        auth: 'required',
        response: '{ success, data: Task[], pagination }',
      },
      {
        method: 'POST',
        path: '/api/tasks',
        description: 'Create a new task. Can be linked to a project and assigned to a user.',
        auth: 'required',
        body: '{ title, description?, project_id?, assigned_to?, priority?, due_date?, status? }',
        response: '{ success, data: Task }',
      },
      {
        method: 'GET',
        path: '/api/tasks/[id]',
        description: 'Get a single task by ID.',
        auth: 'required',
        response: '{ success, data: Task }',
      },
      {
        method: 'PATCH',
        path: '/api/tasks/[id]',
        description: 'Update task fields. Supports status transitions, reassignment, and progress updates.',
        auth: 'required',
        body: '{ title?, status?, priority?, assigned_to?, due_date?, progress?, notes? }',
        response: '{ success, data: Task }',
      },
      {
        method: 'DELETE',
        path: '/api/tasks/[id]',
        description: 'Soft-delete a task.',
        auth: 'required',
        response: '{ success }',
      },
    ],
  },
  {
    name: 'Pipeline',
    description: 'Configure and manage sales pipeline stages',
    routes: [
      {
        method: 'GET',
        path: '/api/settings/pipeline-stages',
        description: 'List all pipeline stages in order. Includes transition rules and required fields.',
        auth: 'required',
        response: '{ success, data: PipelineStage[] }',
      },
      {
        method: 'POST',
        path: '/api/settings/pipeline-stages',
        description: 'Create a new pipeline stage.',
        auth: 'admin',
        body: '{ name, color?, order?, required_fields? }',
        response: '{ success, data: PipelineStage }',
      },
      {
        method: 'PATCH',
        path: '/api/settings/pipeline-stages/[id]',
        description: 'Update a pipeline stage (name, color, order, required fields).',
        auth: 'admin',
        body: '{ name?, color?, order?, required_fields? }',
        response: '{ success, data: PipelineStage }',
      },
      {
        method: 'GET',
        path: '/api/analytics/pipeline',
        description: 'Get pipeline analytics: stage counts, conversion rates, average time in stage.',
        auth: 'required',
        response: '{ success, data: { stages, conversion_rates, avg_days_in_stage } }',
      },
    ],
  },
  {
    name: 'Billing & Subscription',
    description: 'Stripe-powered billing, checkout, and subscription management',
    routes: [
      {
        method: 'GET',
        path: '/api/billing/plans',
        description: 'List available subscription plans with pricing.',
        auth: 'required',
        response: '{ success, data: Plan[] }',
      },
      {
        method: 'GET',
        path: '/api/billing/subscription',
        description: 'Get current tenant subscription status, plan, and billing period.',
        auth: 'required',
        response: '{ success, data: Subscription }',
      },
      {
        method: 'POST',
        path: '/api/billing/subscription',
        description: 'Create or update a subscription.',
        auth: 'required',
        body: '{ plan_id, payment_method_id? }',
        response: '{ success, data: Subscription }',
      },
      {
        method: 'POST',
        path: '/api/billing/checkout',
        description: 'Create a Stripe Checkout session for new subscriptions.',
        auth: 'required',
        body: '{ plan_id, success_url, cancel_url }',
        response: '{ success, data: { checkout_url } }',
      },
      {
        method: 'POST',
        path: '/api/billing/portal',
        description: 'Create a Stripe Customer Portal session for managing billing.',
        auth: 'required',
        response: '{ success, data: { portal_url } }',
      },
      {
        method: 'GET',
        path: '/api/billing/usage',
        description: 'Get current usage metrics (contacts, SMS sent, storage, etc.).',
        auth: 'required',
        response: '{ success, data: { contacts, sms, storage, api_calls } }',
      },
    ],
  },
  {
    name: 'SMS & Messaging',
    description: 'Send SMS messages and manage conversation threads',
    routes: [
      {
        method: 'POST',
        path: '/api/sms/send',
        description: 'Send an SMS message to a contact. Checks DNC and consent compliance.',
        auth: 'required',
        body: '{ to, message, contact_id?, template_id? }',
        response: '{ success, data: { message_sid } }',
      },
      {
        method: 'GET',
        path: '/api/messages/conversations',
        description: 'List all message conversation threads with latest message preview.',
        auth: 'required',
        response: '{ success, data: Conversation[] }',
      },
      {
        method: 'GET',
        path: '/api/messages/[contactId]',
        description: 'Get the full message history for a specific contact.',
        auth: 'required',
        response: '{ success, data: Message[] }',
      },
      {
        method: 'GET',
        path: '/api/settings/sms-templates',
        description: 'List SMS templates. Supports merge fields like {{first_name}}.',
        auth: 'required',
        response: '{ success, data: SmsTemplate[] }',
      },
      {
        method: 'POST',
        path: '/api/settings/sms-templates',
        description: 'Create a new SMS template.',
        auth: 'required',
        body: '{ name, body, category? }',
        response: '{ success, data: SmsTemplate }',
      },
      {
        method: 'PATCH',
        path: '/api/settings/sms-templates/[id]',
        description: 'Update an SMS template.',
        auth: 'required',
        body: '{ name?, body?, category? }',
        response: '{ success, data: SmsTemplate }',
      },
      {
        method: 'DELETE',
        path: '/api/settings/sms-templates/[id]',
        description: 'Soft-delete an SMS template.',
        auth: 'required',
        response: '{ success }',
      },
    ],
  },
  {
    name: 'Email',
    description: 'Send emails and manage email templates',
    routes: [
      {
        method: 'POST',
        path: '/api/email/send',
        description: 'Send an email to a contact. Supports HTML body and templates.',
        auth: 'required',
        body: '{ to, subject, body?, template_id?, template_data? }',
        response: '{ success, data: { message_id } }',
      },
      {
        method: 'GET',
        path: '/api/settings/email-templates',
        description: 'List email templates with merge field support.',
        auth: 'required',
        response: '{ success, data: EmailTemplate[] }',
      },
      {
        method: 'POST',
        path: '/api/settings/email-templates',
        description: 'Create a new email template.',
        auth: 'required',
        body: '{ name, subject, body, category? }',
        response: '{ success, data: EmailTemplate }',
      },
      {
        method: 'PATCH',
        path: '/api/settings/email-templates/[id]',
        description: 'Update an email template.',
        auth: 'required',
        body: '{ name?, subject?, body?, category? }',
        response: '{ success, data: EmailTemplate }',
      },
      {
        method: 'DELETE',
        path: '/api/settings/email-templates/[id]',
        description: 'Soft-delete an email template.',
        auth: 'required',
        response: '{ success }',
      },
    ],
  },
  {
    name: 'Calendar',
    description: 'Google Calendar integration for scheduling inspections and appointments',
    routes: [
      {
        method: 'GET',
        path: '/api/calendar/google/status',
        description: 'Check if Google Calendar is connected for the current user.',
        auth: 'required',
        response: '{ success, data: { connected, email? } }',
      },
      {
        method: 'GET',
        path: '/api/calendar/google/connect',
        description: 'Get the OAuth URL to connect Google Calendar.',
        auth: 'required',
        response: '{ success, data: { auth_url } }',
      },
      {
        method: 'POST',
        path: '/api/calendar/google/disconnect',
        description: 'Disconnect Google Calendar integration.',
        auth: 'required',
        response: '{ success }',
      },
      {
        method: 'GET',
        path: '/api/calendar/google/events',
        description: 'List calendar events. Supports date range filtering via timeMin and timeMax query params.',
        auth: 'required',
        response: '{ success, data: CalendarEvent[] }',
      },
      {
        method: 'POST',
        path: '/api/calendar/google/events',
        description: 'Create a new calendar event (inspection, meeting, etc.).',
        auth: 'required',
        body: '{ summary, start, end, description?, location?, attendees?, allDay? }',
        response: '{ success, data: CalendarEvent }',
      },
      {
        method: 'GET',
        path: '/api/calendar/google/events/[eventId]',
        description: 'Get a single calendar event by ID.',
        auth: 'required',
        response: '{ success, data: CalendarEvent }',
      },
      {
        method: 'PATCH',
        path: '/api/calendar/google/events/[eventId]',
        description: 'Update a calendar event.',
        auth: 'required',
        body: '{ summary?, start?, end?, description?, location?, attendees? }',
        response: '{ success, data: CalendarEvent }',
      },
      {
        method: 'DELETE',
        path: '/api/calendar/google/events/[eventId]',
        description: 'Delete a calendar event.',
        auth: 'required',
        response: '{ success }',
      },
    ],
  },
  {
    name: 'Documents & Signatures',
    description: 'Document management with e-signature workflows',
    routes: [
      {
        method: 'GET',
        path: '/api/signature-documents',
        description: 'List all signature documents. Supports filtering by status and project.',
        auth: 'required',
        response: '{ success, data: SignatureDocument[] }',
      },
      {
        method: 'POST',
        path: '/api/signature-documents',
        description: 'Create a new document for signature.',
        auth: 'required',
        body: '{ name, template_id?, project_id?, contact_id?, fields? }',
        response: '{ success, data: SignatureDocument }',
      },
      {
        method: 'GET',
        path: '/api/signature-documents/[id]',
        description: 'Get document details including signature status and field values.',
        auth: 'required',
        response: '{ success, data: SignatureDocument }',
      },
      {
        method: 'POST',
        path: '/api/signature-documents/[id]/send',
        description: 'Send a document for signature via email.',
        auth: 'required',
        body: '{ signer_email, signer_name, message? }',
        response: '{ success }',
      },
      {
        method: 'POST',
        path: '/api/signature-documents/[id]/sign',
        description: 'Submit a signature for a document.',
        auth: 'public',
        body: '{ signature_data, fields? }',
        response: '{ success }',
      },
      {
        method: 'GET',
        path: '/api/signature-documents/[id]/download',
        description: 'Download the signed PDF document.',
        auth: 'required',
        response: 'PDF binary (application/pdf)',
      },
      {
        method: 'POST',
        path: '/api/signature-documents/[id]/resend',
        description: 'Resend the signature request email.',
        auth: 'required',
        response: '{ success }',
      },
      {
        method: 'GET',
        path: '/api/signature-templates',
        description: 'List signature document templates.',
        auth: 'required',
        response: '{ success, data: SignatureTemplate[] }',
      },
      {
        method: 'POST',
        path: '/api/signature-templates',
        description: 'Create a new signature template.',
        auth: 'required',
        body: '{ name, content, fields? }',
        response: '{ success, data: SignatureTemplate }',
      },
    ],
  },
  {
    name: 'Project Files',
    description: 'File upload, versioning, and search for project documents and photos',
    routes: [
      {
        method: 'GET',
        path: '/api/project-files',
        description: 'List project files with filtering by project, type, and category.',
        auth: 'required',
        response: '{ success, data: ProjectFile[] }',
      },
      {
        method: 'POST',
        path: '/api/project-files',
        description: 'Create a file record (metadata). Use /upload for binary upload.',
        auth: 'required',
        body: '{ project_id, name, type, category?, description? }',
        response: '{ success, data: ProjectFile }',
      },
      {
        method: 'POST',
        path: '/api/project-files/upload',
        description: 'Upload a file binary. Accepts multipart/form-data.',
        auth: 'required',
        body: 'FormData: file (binary), project_id, category?, description?',
        response: '{ success, data: ProjectFile }',
      },
      {
        method: 'GET',
        path: '/api/project-files/search',
        description: 'Full-text search across file names and descriptions.',
        auth: 'required',
        response: '{ success, data: ProjectFile[] }',
      },
      {
        method: 'GET',
        path: '/api/project-files/[id]',
        description: 'Get file details and download URL.',
        auth: 'required',
        response: '{ success, data: ProjectFile }',
      },
      {
        method: 'DELETE',
        path: '/api/project-files/[id]',
        description: 'Soft-delete a project file.',
        auth: 'required',
        response: '{ success }',
      },
    ],
  },
  {
    name: 'Campaigns',
    description: 'Multi-step marketing and outreach campaigns with enrollment and triggers',
    routes: [
      {
        method: 'GET',
        path: '/api/campaigns',
        description: 'List all campaigns with stats (enrolled, completed, active).',
        auth: 'required',
        response: '{ success, data: Campaign[] }',
      },
      {
        method: 'POST',
        path: '/api/campaigns',
        description: 'Create a new campaign.',
        auth: 'required',
        body: '{ name, description?, type?, status? }',
        response: '{ success, data: Campaign }',
      },
      {
        method: 'GET',
        path: '/api/campaigns/[id]',
        description: 'Get campaign details including steps, triggers, and enrollment stats.',
        auth: 'required',
        response: '{ success, data: Campaign }',
      },
      {
        method: 'PATCH',
        path: '/api/campaigns/[id]',
        description: 'Update campaign settings.',
        auth: 'required',
        body: '{ name?, description?, status?, type? }',
        response: '{ success, data: Campaign }',
      },
      {
        method: 'DELETE',
        path: '/api/campaigns/[id]',
        description: 'Soft-delete a campaign.',
        auth: 'required',
        response: '{ success }',
      },
      {
        method: 'GET',
        path: '/api/campaigns/[id]/steps',
        description: 'List steps in a campaign (email, SMS, delay, condition).',
        auth: 'required',
        response: '{ success, data: CampaignStep[] }',
      },
      {
        method: 'POST',
        path: '/api/campaigns/[id]/steps',
        description: 'Add a step to a campaign.',
        auth: 'required',
        body: '{ type, config, order?, delay_minutes? }',
        response: '{ success, data: CampaignStep }',
      },
      {
        method: 'GET',
        path: '/api/campaigns/[id]/enrollments',
        description: 'List contacts enrolled in a campaign and their progress.',
        auth: 'required',
        response: '{ success, data: Enrollment[] }',
      },
      {
        method: 'POST',
        path: '/api/campaigns/[id]/enrollments',
        description: 'Enroll contacts into a campaign.',
        auth: 'required',
        body: '{ contact_ids: string[] }',
        response: '{ success, data: { enrolled_count } }',
      },
      {
        method: 'GET',
        path: '/api/campaigns/stats',
        description: 'Get aggregate campaign statistics.',
        auth: 'required',
        response: '{ success, data: { total, active, completed, enrollments } }',
      },
    ],
  },
  {
    name: 'Workflows & Automations',
    description: 'Event-driven workflow automation (e.g., auto-assign, auto-email on stage change)',
    routes: [
      {
        method: 'GET',
        path: '/api/workflows',
        description: 'List all workflows.',
        auth: 'required',
        response: '{ success, data: Workflow[] }',
      },
      {
        method: 'POST',
        path: '/api/workflows',
        description: 'Create a new workflow with trigger and action configuration.',
        auth: 'required',
        body: '{ name, trigger_type, trigger_config, actions, enabled? }',
        response: '{ success, data: Workflow }',
      },
      {
        method: 'GET',
        path: '/api/workflows/[id]',
        description: 'Get workflow details including execution history.',
        auth: 'required',
        response: '{ success, data: Workflow }',
      },
      {
        method: 'PATCH',
        path: '/api/workflows/[id]',
        description: 'Update workflow configuration or enable/disable it.',
        auth: 'required',
        body: '{ name?, trigger_config?, actions?, enabled? }',
        response: '{ success, data: Workflow }',
      },
      {
        method: 'DELETE',
        path: '/api/workflows/[id]',
        description: 'Soft-delete a workflow.',
        auth: 'required',
        response: '{ success }',
      },
      {
        method: 'POST',
        path: '/api/workflows/trigger',
        description: 'Manually trigger a workflow for testing.',
        auth: 'admin',
        body: '{ workflow_id, context? }',
        response: '{ success, data: { execution_id } }',
      },
      {
        method: 'GET',
        path: '/api/automations',
        description: 'List automation rules.',
        auth: 'required',
        response: '{ success, data: Automation[] }',
      },
      {
        method: 'POST',
        path: '/api/automations',
        description: 'Create an automation rule.',
        auth: 'required',
        body: '{ name, trigger, conditions?, actions, enabled? }',
        response: '{ success, data: Automation }',
      },
    ],
  },
  {
    name: 'Claims & Insurance',
    description: 'Insurance claim tracking, document management, and adjuster coordination',
    routes: [
      {
        method: 'GET',
        path: '/api/claims',
        description: 'List insurance claims with filtering by status, carrier, date range.',
        auth: 'required',
        response: '{ success, data: Claim[] }',
      },
      {
        method: 'POST',
        path: '/api/claims',
        description: 'Create a new insurance claim linked to a project.',
        auth: 'required',
        body: '{ project_id, claim_number, carrier?, policy_number?, loss_date?, description? }',
        response: '{ success, data: Claim }',
      },
      {
        method: 'GET',
        path: '/api/claims/[id]',
        description: 'Get claim details including documents, interactions, and outcomes.',
        auth: 'required',
        response: '{ success, data: Claim }',
      },
      {
        method: 'PATCH',
        path: '/api/claims/[id]',
        description: 'Update claim fields.',
        auth: 'required',
        body: '{ status?, claim_number?, carrier?, notes? }',
        response: '{ success, data: Claim }',
      },
      {
        method: 'POST',
        path: '/api/claims/[id]/approve',
        description: 'Mark a claim as approved with approved amount.',
        auth: 'required',
        body: '{ approved_amount, notes? }',
        response: '{ success }',
      },
      {
        method: 'POST',
        path: '/api/claims/[id]/reject',
        description: 'Mark a claim as rejected.',
        auth: 'required',
        body: '{ reason? }',
        response: '{ success }',
      },
    ],
  },
  {
    name: 'Reports & Analytics',
    description: 'Dashboard metrics, financial reports, and business intelligence',
    routes: [
      {
        method: 'GET',
        path: '/api/dashboard/consolidated',
        description: 'Get all dashboard data in a single call: metrics, activity, pipeline summary.',
        auth: 'required',
        response: '{ success, data: { metrics, recent_activity, pipeline_summary } }',
      },
      {
        method: 'GET',
        path: '/api/dashboard/metrics',
        description: 'Get key business metrics: revenue, projects, conversion rate, etc.',
        auth: 'required',
        response: '{ success, data: DashboardMetrics }',
      },
      {
        method: 'GET',
        path: '/api/dashboard/activity',
        description: 'Get recent activity feed (new contacts, status changes, etc.).',
        auth: 'required',
        response: '{ success, data: Activity[] }',
      },
      {
        method: 'GET',
        path: '/api/analytics',
        description: 'Get analytics data with date range filtering.',
        auth: 'required',
        response: '{ success, data: AnalyticsData }',
      },
      {
        method: 'GET',
        path: '/api/analytics/forecast',
        description: 'Get revenue forecasting based on pipeline data.',
        auth: 'required',
        response: '{ success, data: { forecast, confidence, breakdown } }',
      },
      {
        method: 'GET',
        path: '/api/financials/pl',
        description: 'Get profit & loss report with project-level breakdown.',
        auth: 'required',
        response: '{ success, data: { revenue, costs, margin, projects } }',
      },
    ],
  },
  {
    name: 'Settings',
    description: 'Tenant configuration, roles, financial settings, and scoring rules',
    routes: [
      {
        method: 'GET',
        path: '/api/settings',
        description: 'Get tenant-level settings (company name, defaults, preferences).',
        auth: 'required',
        response: '{ success, data: TenantSettings }',
      },
      {
        method: 'PUT',
        path: '/api/settings',
        description: 'Update tenant-level settings.',
        auth: 'admin',
        body: '{ company_name?, default_pipeline_stage?, branding?, preferences? }',
        response: '{ success, data: TenantSettings }',
      },
      {
        method: 'GET',
        path: '/api/settings/roles',
        description: 'List all user roles and their permissions.',
        auth: 'admin',
        response: '{ success, data: Role[] }',
      },
      {
        method: 'POST',
        path: '/api/settings/roles',
        description: 'Create a custom role with specific permissions.',
        auth: 'admin',
        body: '{ name, permissions: string[] }',
        response: '{ success, data: Role }',
      },
      {
        method: 'GET',
        path: '/api/settings/financial',
        description: 'Get financial settings (tax rate, markup defaults, cost categories).',
        auth: 'required',
        response: '{ success, data: FinancialSettings }',
      },
      {
        method: 'PATCH',
        path: '/api/settings/financial',
        description: 'Update financial settings.',
        auth: 'admin',
        body: '{ tax_rate?, default_markup?, cost_categories? }',
        response: '{ success, data: FinancialSettings }',
      },
      {
        method: 'GET',
        path: '/api/settings/scoring',
        description: 'Get lead scoring configuration (weights, thresholds).',
        auth: 'required',
        response: '{ success, data: ScoringConfig }',
      },
      {
        method: 'PATCH',
        path: '/api/settings/scoring',
        description: 'Update lead scoring rules.',
        auth: 'admin',
        body: '{ weights?, thresholds? }',
        response: '{ success, data: ScoringConfig }',
      },
    ],
  },
  {
    name: 'Auth & Users',
    description: 'Authentication, MFA, sessions, and user permissions',
    routes: [
      {
        method: 'GET',
        path: '/api/auth/user-role',
        description: 'Get the current authenticated user role and permissions.',
        auth: 'required',
        response: '{ success, data: { role, permissions } }',
      },
      {
        method: 'GET',
        path: '/api/auth/permissions',
        description: 'Get the full permission set for the current user.',
        auth: 'required',
        response: '{ success, data: { permissions: string[] } }',
      },
      {
        method: 'GET',
        path: '/api/auth/sessions',
        description: 'List active sessions for the current user.',
        auth: 'required',
        response: '{ success, data: Session[] }',
      },
      {
        method: 'DELETE',
        path: '/api/auth/sessions',
        description: 'Delete a specific session by ID.',
        auth: 'required',
        response: '{ success }',
      },
      {
        method: 'POST',
        path: '/api/auth/sessions/revoke-all',
        description: 'Revoke all sessions for the current user (force logout everywhere).',
        auth: 'required',
        response: '{ success }',
      },
      {
        method: 'GET',
        path: '/api/auth/mfa/status',
        description: 'Check if MFA is enabled and enrolled for the current user.',
        auth: 'required',
        response: '{ success, data: { enabled, enrolled, factors } }',
      },
      {
        method: 'POST',
        path: '/api/auth/mfa/enroll',
        description: 'Begin MFA enrollment. Returns a TOTP secret and QR code URL.',
        auth: 'required',
        response: '{ success, data: { factor_id, totp_uri, qr_code } }',
      },
      {
        method: 'POST',
        path: '/api/auth/mfa/verify',
        description: 'Verify a TOTP code to complete MFA enrollment or challenge.',
        auth: 'required',
        body: '{ factor_id, code }',
        response: '{ success }',
      },
    ],
  },
  {
    name: 'Team & Admin',
    description: 'Team member management, impersonation, and tenant administration',
    routes: [
      {
        method: 'GET',
        path: '/api/admin/team',
        description: 'List all team members in the tenant.',
        auth: 'admin',
        response: '{ success, data: TeamMember[] }',
      },
      {
        method: 'POST',
        path: '/api/admin/team',
        description: 'Invite a new team member. Sends invitation email.',
        auth: 'admin',
        body: '{ email, role, first_name?, last_name? }',
        response: '{ success, data: TeamMember }',
      },
      {
        method: 'PATCH',
        path: '/api/admin/team/[userId]',
        description: 'Update a team member (role, permissions).',
        auth: 'admin',
        body: '{ role?, permissions? }',
        response: '{ success, data: TeamMember }',
      },
      {
        method: 'POST',
        path: '/api/admin/team/[userId]/deactivate',
        description: 'Deactivate a team member (revoke access without deleting).',
        auth: 'admin',
        response: '{ success }',
      },
      {
        method: 'POST',
        path: '/api/admin/team/[userId]/reactivate',
        description: 'Reactivate a previously deactivated team member.',
        auth: 'admin',
        response: '{ success }',
      },
      {
        method: 'POST',
        path: '/api/admin/impersonate',
        description: 'Start impersonating a user (admin only). Creates audit log entry.',
        auth: 'admin',
        body: '{ target_user_id }',
        response: '{ success, data: { session_token } }',
      },
      {
        method: 'DELETE',
        path: '/api/admin/impersonate',
        description: 'Stop impersonating and return to admin session.',
        auth: 'admin',
        response: '{ success }',
      },
      {
        method: 'GET',
        path: '/api/admin/audit-log',
        description: 'Query the audit log. Supports filtering by user, action, entity, date range.',
        auth: 'admin',
        response: '{ success, entries: AuditEntry[], total, page, limit }',
      },
    ],
  },
  {
    name: 'QuickBooks',
    description: 'QuickBooks Online integration for accounting sync',
    routes: [
      {
        method: 'GET',
        path: '/api/quickbooks/status',
        description: 'Check QuickBooks connection status.',
        auth: 'required',
        response: '{ success, data: { connected, company_name? } }',
      },
      {
        method: 'GET',
        path: '/api/quickbooks/auth',
        description: 'Get the OAuth URL to connect QuickBooks.',
        auth: 'required',
        response: '{ success, data: { auth_url } }',
      },
      {
        method: 'POST',
        path: '/api/quickbooks/disconnect',
        description: 'Disconnect QuickBooks integration.',
        auth: 'required',
        response: '{ success }',
      },
      {
        method: 'POST',
        path: '/api/quickbooks/sync/contact',
        description: 'Sync a contact to QuickBooks as a Customer.',
        auth: 'required',
        body: '{ contact_id }',
        response: '{ success, data: { qb_customer_id } }',
      },
      {
        method: 'POST',
        path: '/api/quickbooks/sync/project',
        description: 'Sync a project to QuickBooks as an Invoice.',
        auth: 'required',
        body: '{ project_id }',
        response: '{ success, data: { qb_invoice_id } }',
      },
      {
        method: 'GET',
        path: '/api/quickbooks/sync-logs',
        description: 'Get sync history log entries.',
        auth: 'required',
        response: '{ success, data: SyncLog[] }',
      },
    ],
  },
  {
    name: 'Search',
    description: 'Global and entity-specific search across the platform',
    routes: [
      {
        method: 'GET',
        path: '/api/search',
        description: 'Search contacts by name, email, or phone.',
        auth: 'required',
        response: '{ success, data: SearchResult[] }',
      },
      {
        method: 'GET',
        path: '/api/search/global',
        description: 'Cross-entity search: contacts, projects, tasks, documents.',
        auth: 'required',
        response: '{ success, data: { contacts, projects, tasks, documents } }',
      },
    ],
  },
  {
    name: 'Webhooks',
    description: 'Inbound webhook endpoints for third-party integrations',
    routes: [
      {
        method: 'POST',
        path: '/api/sms/webhook',
        description: 'Twilio SMS webhook. Receives inbound SMS messages and delivery status updates.',
        auth: 'public',
        body: 'Twilio webhook payload (form-encoded)',
        response: 'TwiML response',
      },
      {
        method: 'POST',
        path: '/api/email/webhook',
        description: 'Resend email webhook. Receives delivery, bounce, and complaint events.',
        auth: 'public',
        body: 'Resend webhook payload (JSON)',
        response: '{ success }',
      },
      {
        method: 'POST',
        path: '/api/billing/webhook',
        description: 'Stripe webhook. Handles subscription changes, payment events, and invoice updates.',
        auth: 'public',
        body: 'Stripe webhook payload (JSON with signature verification)',
        response: '{ received: true }',
      },
      {
        method: 'POST',
        path: '/api/voice/webhook',
        description: 'Twilio Voice webhook. Handles call status updates and recordings.',
        auth: 'public',
        body: 'Twilio webhook payload (form-encoded)',
        response: 'TwiML response',
      },
      {
        method: 'POST',
        path: '/api/claims/webhook',
        description: 'Insurance claims webhook. Receives claim status updates from carrier integrations.',
        auth: 'public',
        body: 'Carrier-specific payload (JSON)',
        response: '{ success }',
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countRoutes(catalog: ApiDomain[]): number {
  return catalog.reduce((sum, domain) => sum + domain.routes.length, 0)
}

function countMethods(catalog: ApiDomain[]): Record<HttpMethod, number> {
  const counts: Record<HttpMethod, number> = { GET: 0, POST: 0, PATCH: 0, PUT: 0, DELETE: 0 }
  for (const domain of catalog) {
    for (const route of domain.routes) {
      counts[route.method]++
    }
  }
  return counts
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-bold font-mono uppercase tracking-wider shrink-0 ${METHOD_COLORS[method]}`}
    >
      {method}
    </span>
  )
}

function AuthBadge({ auth }: { auth: AuthLevel }) {
  const config = AUTH_CONFIG[auth]
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0"
      onClick={handleCopy}
      aria-label={`Copy ${text}`}
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground" />
      )}
    </Button>
  )
}

function RouteCard({ route }: { route: ApiRoute }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => setExpanded(!expanded)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setExpanded(!expanded)
        }
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <MethodBadge method={route.method} />
        <code className="text-sm font-mono text-foreground break-all">{route.path}</code>
        <div className="sm:ml-auto flex items-center gap-2 shrink-0">
          <AuthBadge auth={route.auth} />
          <CopyButton text={route.path} />
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-2">{route.description}</p>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {route.body && (
            <div>
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Request Body</span>
              <pre className="mt-1 text-xs text-muted-foreground bg-muted/50 rounded p-2 overflow-x-auto font-mono">
                {route.body}
              </pre>
            </div>
          )}
          <div>
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Response</span>
            <pre className="mt-1 text-xs text-muted-foreground bg-muted/50 rounded p-2 overflow-x-auto font-mono">
              {route.response}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

function DomainSection({ domain, defaultOpen }: { domain: ApiDomain; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left hover:bg-muted/30 transition-colors"
          aria-label={`Toggle ${domain.name} section`}
        >
          <ChevronRight
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ${
              open ? 'rotate-90' : ''
            }`}
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground">{domain.name}</h3>
            <p className="text-sm text-muted-foreground">{domain.description}</p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {domain.routes.length} {domain.routes.length === 1 ? 'endpoint' : 'endpoints'}
          </Badge>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 px-4 pb-4 pt-1">
          {domain.routes.map((route) => (
            <RouteCard key={`${route.method}-${route.path}`} route={route} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ApiDocsClient() {
  const [search, setSearch] = useState('')

  const filteredCatalog = useMemo(() => {
    if (!search.trim()) return API_CATALOG

    const query = search.toLowerCase()
    return API_CATALOG.map((domain) => ({
      ...domain,
      routes: domain.routes.filter(
        (route) =>
          route.path.toLowerCase().includes(query) ||
          route.description.toLowerCase().includes(query) ||
          route.method.toLowerCase().includes(query) ||
          domain.name.toLowerCase().includes(query)
      ),
    })).filter((domain) => domain.routes.length > 0)
  }, [search])

  const totalRoutes = countRoutes(API_CATALOG)
  const filteredTotal = countRoutes(filteredCatalog)
  const methodCounts = countMethods(API_CATALOG)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-foreground">
          <BookOpen className="h-8 w-8" />
          API Reference
        </h1>
        <p className="text-muted-foreground mt-1">
          Documentation for {totalRoutes} API endpoints across {API_CATALOG.length} domains
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        {(['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] as HttpMethod[])
          .filter((m) => methodCounts[m] > 0)
          .map((method) => (
            <Card key={method}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <MethodBadge method={method} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{methodCounts[method]}</div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search endpoints by path, method, or keyword..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
        {search && (
          <p className="text-sm text-muted-foreground mt-2">
            Showing {filteredTotal} of {totalRoutes} endpoints
          </p>
        )}
      </div>

      {/* API Domains */}
      <ScrollArea className="h-[calc(100vh-20rem)]">
        <div className="space-y-2">
          {filteredCatalog.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  No endpoints match &ldquo;{search}&rdquo;
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredCatalog.map((domain) => (
              <Card key={domain.name}>
                <DomainSection
                  domain={domain}
                  defaultOpen={!!search || filteredCatalog.length <= 3}
                />
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

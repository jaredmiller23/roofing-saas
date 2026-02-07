export interface HelpArticle {
  id: string
  category: HelpCategory
  title: string
  content: string
  tags: string[]
}

export type HelpCategory =
  | 'getting-started'
  | 'contacts'
  | 'projects'
  | 'estimates'
  | 'pipeline'
  | 'team-management'
  | 'sms-email'
  | 'scheduling'
  | 'reports'
  | 'billing'

export interface HelpCategoryInfo {
  id: HelpCategory
  label: string
  description: string
}

export const HELP_CATEGORIES: HelpCategoryInfo[] = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    description: 'First steps after signing up and navigating your dashboard',
  },
  {
    id: 'contacts',
    label: 'Contacts',
    description: 'Adding, managing, and organizing your leads and customers',
  },
  {
    id: 'projects',
    label: 'Projects',
    description: 'Creating and managing roofing projects from start to finish',
  },
  {
    id: 'estimates',
    label: 'Estimates',
    description: 'Building proposals, sending quotes, and handling responses',
  },
  {
    id: 'pipeline',
    label: 'Pipeline',
    description: 'Tracking deal flow and managing project stages visually',
  },
  {
    id: 'team-management',
    label: 'Team Management',
    description: 'Inviting staff, assigning roles, and managing permissions',
  },
  {
    id: 'sms-email',
    label: 'SMS & Email',
    description: 'Templates, campaigns, and compliance for outreach',
  },
  {
    id: 'scheduling',
    label: 'Scheduling',
    description: 'Calendar integration and appointment management',
  },
  {
    id: 'reports',
    label: 'Reports',
    description: 'Revenue tracking, job costing, and performance analytics',
  },
  {
    id: 'billing',
    label: 'Billing',
    description: 'Subscription plans, usage limits, and account management',
  },
]

export const HELP_ARTICLES: HelpArticle[] = [
  // ── Getting Started ──────────────────────────────────────────────
  {
    id: 'quick-start-guide',
    category: 'getting-started',
    title: 'Quick Start Guide',
    content: `Welcome to your new roofing CRM. This guide walks you through the essentials so you can start managing jobs and closing deals right away.

**Step 1 — Complete your company profile.** Head to Settings and fill in your company name, address, phone number, and logo. This information appears on estimates and customer-facing documents, so make sure it looks professional.

**Step 2 — Import or add your contacts.** If you have an existing list of leads or customers, you can import them from a CSV file under Contacts. Otherwise, start adding contacts one at a time as new calls come in. Each contact record tracks name, phone, email, address, and any notes about the property.

**Step 3 — Create your first project.** Once you have a contact, create a project tied to their property. A project represents a single roofing job from initial inspection through final payment. You will attach estimates, schedule inspections, track materials, and log labor hours all within the project.

**Step 4 — Set up your team.** If you have office staff, salespeople, or crew leads, invite them under Team Management. Assign roles so everyone sees only what they need. Your crew can log time and materials from their phones in the field.`,
    tags: ['setup', 'onboarding', 'first steps', 'getting started', 'new account'],
  },
  {
    id: 'understanding-your-dashboard',
    category: 'getting-started',
    title: 'Understanding Your Dashboard',
    content: `Your dashboard is the first thing you see when you log in. It gives you a snapshot of your business at a glance so you can prioritize your day.

**Pipeline summary** shows the total number of active projects in each stage: lead, inspection scheduled, estimate sent, approved, in progress, and complete. Use this to spot bottlenecks. If you have 15 estimates out but none approved, it is time to follow up.

**Revenue metrics** display your closed revenue for the current month and your projected revenue based on pending estimates. These numbers pull directly from your project values, so keeping your estimates up to date keeps these figures accurate.

**Recent activity** lists the latest actions across your account: new contacts added, estimates sent, projects moved to a new stage, payments received. This helps you stay on top of what your team is doing without micromanaging. If you manage multiple salespeople, this feed is especially useful for seeing who is active and what deals are moving.

**Tasks and reminders** surfaces any follow-ups you have scheduled. Roofing is a relationship business, and timely follow-up is what separates the contractors who close from the ones who lose deals to the competition.`,
    tags: ['dashboard', 'overview', 'metrics', 'revenue', 'activity', 'home'],
  },

  // ── Contacts ─────────────────────────────────────────────────────
  {
    id: 'adding-and-managing-contacts',
    category: 'contacts',
    title: 'Adding and Managing Contacts',
    content: `Contacts are the foundation of your CRM. Every homeowner, property manager, adjuster, and referral partner starts as a contact record.

**Adding a contact.** Click the "Add Contact" button on the Contacts page. Fill in the name, phone number, email, and property address. The address is important because it ties to the project location for scheduling and routing. You can also add notes about how the lead came in, whether it was a door knock, a storm referral, or a phone call from a mailer.

**Importing contacts.** If you have contacts in a spreadsheet, go to Contacts and use the import feature. Upload a CSV with columns for first name, last name, phone, email, and address. The system will map the columns automatically and flag any duplicates before importing.

**Searching and filtering.** Use the search bar to find contacts by name, phone number, or email. You can also filter by contact type (lead vs customer), by assigned salesperson, or by date added. Filters help when you need to pull up all leads from a specific storm event or all customers waiting on supplements.

**Editing and merging.** Click any contact to view their full profile. From there you can update their information, view linked projects, see communication history, and add internal notes. If you discover duplicate contacts, you can merge them to keep your data clean.`,
    tags: ['contacts', 'add', 'import', 'search', 'filter', 'merge', 'CSV'],
  },
  {
    id: 'contact-types-leads-vs-customers',
    category: 'contacts',
    title: 'Contact Types: Leads vs Customers',
    content: `Understanding the difference between leads and customers helps you manage your sales funnel and focus your outreach.

**Leads** are people who have expressed interest but have not committed to a project yet. This includes homeowners you met while door knocking, people who called after a storm, or referrals from past customers. Leads need nurturing: follow-up calls, inspection scheduling, and estimate presentations. Your goal is to move them through the pipeline until they say yes.

**Customers** are contacts with an active or completed project. Once a lead approves an estimate, they become a customer. Customer records retain the full history of their project, making it easy to reference past work. This matters for warranty claims, re-roofing down the road, or when they refer neighbors.

**Why the distinction matters.** When you filter your contacts by type, you can quickly pull up all active leads to plan your follow-up calls for the day, or all customers to send a post-job satisfaction survey. Many roofing contractors lose repeat business simply because they do not stay in touch with past customers. Use the customer list to send seasonal check-in messages or request referrals.`,
    tags: ['leads', 'customers', 'contact types', 'funnel', 'sales', 'follow up'],
  },

  // ── Projects ─────────────────────────────────────────────────────
  {
    id: 'creating-a-new-project',
    category: 'projects',
    title: 'Creating a New Project',
    content: `A project represents a single roofing job tied to a specific property and contact. Creating a project is how you start tracking everything from inspection to payment.

**Step 1 — Select or create a contact.** Every project needs a contact. If the homeowner is already in your system, search for them. If not, you can create a new contact as part of the project creation flow.

**Step 2 — Enter project details.** Fill in the property address (it may auto-fill from the contact record), the project type (residential re-roof, storm damage repair, commercial, etc.), and any initial notes. If this came from a storm event, note the date and type of storm because insurance adjusters will ask.

**Step 3 — Set the estimated value.** Enter your best estimate of the project value. This does not need to be exact at this stage. It helps your pipeline and revenue forecasts stay accurate. You will refine this when you create a formal estimate.

**Step 4 — Assign a salesperson or project manager.** If you have a team, assign the project to the person responsible for it. They will receive notifications about status changes and can manage the project from their own dashboard. Once created, the project appears in your pipeline and is ready for scheduling inspections, creating estimates, and tracking progress.`,
    tags: ['project', 'create', 'new job', 'property', 'assign'],
  },
  {
    id: 'project-pipeline-stages',
    category: 'projects',
    title: 'Project Pipeline Stages',
    content: `Every project moves through a series of stages from initial contact to completion. Understanding what each stage means helps your team stay organized and ensures nothing falls through the cracks.

**Lead** — The homeowner has been contacted but no inspection has been scheduled yet. This is your queue of fresh opportunities. Move projects out of this stage quickly by scheduling inspections.

**Inspection Scheduled** — An inspection date is set. The salesperson or estimator needs to visit the property, assess the roof condition, take measurements, and document damage. Make sure inspection notes and photos are uploaded to the project record.

**Estimate Sent** — You have created and sent a proposal to the homeowner. The project sits here until the homeowner responds. If an estimate has been sitting in this stage for more than a week, it is time to follow up.

**Approved** — The homeowner has accepted the estimate. Now it is time to schedule materials, line up the crew, and coordinate with the insurance company if applicable. This stage requires the project to have an approved value recorded.

**In Progress** — Work is underway on the roof. Crew members can log hours and materials against the project in this stage. Keep the project here until the final walkthrough is complete.

**Complete** — The job is finished, the customer has signed off, and final payment has been received. Completed projects feed into your revenue reports and job costing analytics.

**Lost** — The homeowner declined or went with another contractor. Record why you lost the deal so you can identify patterns and improve your close rate over time.`,
    tags: ['pipeline', 'stages', 'workflow', 'lead', 'estimate', 'approved', 'complete', 'lost'],
  },

  // ── Estimates ────────────────────────────────────────────────────
  {
    id: 'creating-and-sending-estimates',
    category: 'estimates',
    title: 'Creating and Sending Estimates',
    content: `Estimates are professional proposals you send to homeowners that outline the scope of work and pricing. A well-structured estimate builds trust and increases your close rate.

**Creating an estimate.** Open a project and click "Create Estimate." You will build the estimate by adding line items for materials, labor, and any other costs. Each line item has a description, quantity, unit price, and total. Group related items together so the homeowner can understand what they are paying for.

**Good / Better / Best options.** You can create multiple options within a single estimate. For example, a "Good" option might cover a standard architectural shingle re-roof, "Better" might include upgraded underlayment and ice-and-water shield, and "Best" might add a premium shingle line with an extended warranty. Presenting options gives the homeowner a choice rather than a yes-or-no decision, which typically increases your average ticket price.

**Previewing and sending.** Before sending, preview the estimate to make sure it looks professional. The estimate uses your company logo, colors, and contact information from your settings. When ready, send the estimate directly to the homeowner via email. They receive a link to view the estimate online, where they can accept or decline each option.

**Tracking engagement.** Once sent, the system tracks when the homeowner opens and views the estimate. You will see the "viewed" status on the project, which is a good signal that it is time for a follow-up call.`,
    tags: ['estimate', 'proposal', 'quote', 'options', 'good better best', 'send', 'line items'],
  },
  {
    id: 'when-a-client-accepts-or-declines',
    category: 'estimates',
    title: 'When a Client Accepts or Declines',
    content: `When a homeowner receives your estimate, they can accept or decline it directly from the online link. Here is what happens in each case.

**When they accept.** The project status automatically updates to "Approved." The accepted option and its total value are recorded on the project. You will receive a notification so you can begin scheduling materials and crews. The homeowner sees a confirmation screen and receives a confirmation email. From here, you move into project execution.

**When they decline.** The project status updates to reflect the decline. This is not necessarily the end of the conversation. Many homeowners decline initially because of price, timing, or uncertainty. Reach out to understand their concerns. You can revise the estimate and send an updated version. The system keeps a history of all estimate versions so you can track what changed.

**Following up on pending estimates.** Not every homeowner responds right away, especially during storm season when they are dealing with insurance and multiple contractors. Use the Pipeline view to see all projects in the "Estimate Sent" stage. Sort by the date the estimate was sent to prioritize your oldest outstanding proposals. A polite follow-up call within 48 hours of sending an estimate significantly improves your close rate.

**Revising estimates.** If the scope changes after an initial inspection, or if the homeowner asks for modifications, you can create a new version of the estimate. The previous version is preserved in the project history. This is common with insurance jobs where the adjuster may approve a different scope than what you originally proposed.`,
    tags: ['accept', 'decline', 'response', 'follow up', 'revision', 'status', 'approved'],
  },

  // ── Pipeline ─────────────────────────────────────────────────────
  {
    id: 'using-the-pipeline-view',
    category: 'pipeline',
    title: 'Using the Pipeline View',
    content: `The Pipeline view gives you a visual Kanban board of all your active projects, organized by stage. It is the fastest way to see where every deal stands and what needs attention.

**Navigating the board.** Each column represents a pipeline stage (Lead, Inspection Scheduled, Estimate Sent, Approved, In Progress, Complete). Cards within each column show the project name, contact, and estimated value. Scroll horizontally to see all stages, or on mobile, swipe between columns.

**Drag and drop.** To move a project to the next stage, drag its card from one column to another. The system will validate the move: for example, you cannot move a project to "Estimate Sent" without first creating an estimate, and you cannot move to "Approved" without an accepted estimate value. These guardrails prevent your data from getting out of sync.

**Filtering.** Use the filter bar at the top to narrow the board by salesperson, date range, or project value. This is useful when you want to see only your deals, or when a manager wants to review a specific rep's pipeline during a one-on-one.

**Pipeline value.** The total estimated value at the top of each column tells you how much revenue is sitting in each stage. A healthy pipeline has a consistent flow of projects across all stages. If one column is overloaded and the next is empty, it highlights a bottleneck in your process.`,
    tags: ['pipeline', 'kanban', 'board', 'drag drop', 'filter', 'visual', 'stages'],
  },
  {
    id: 'stage-requirements',
    category: 'pipeline',
    title: 'Stage Requirements',
    content: `Each pipeline stage has specific requirements that must be met before a project can advance. These requirements ensure your data stays accurate and nothing gets skipped.

**Lead to Inspection Scheduled.** The project must have a valid contact with a property address. An inspection date should be set on the project. Without an address, you cannot schedule a site visit, and without a date, the project is not actually scheduled.

**Inspection Scheduled to Estimate Sent.** You must create and send at least one estimate for the project. The system checks that an estimate exists and has been delivered to the homeowner. This ensures you are not skipping the proposal step.

**Estimate Sent to Approved.** The project must have an approved estimate with a recorded value. This happens automatically when the homeowner accepts an option through the online estimate link, or you can manually record approval if the homeowner accepted over the phone.

**Approved to In Progress.** No additional system requirements, but operationally this is when you should have materials ordered, a crew scheduled, and a start date confirmed with the homeowner. Use the project notes to document these details.

**In Progress to Complete.** The project should have final costs recorded, including actual labor hours and material expenses. This data feeds into your job costing reports so you can see your actual margins versus your estimates. If you skip this step, your reports will be incomplete.

**Any stage to Lost.** You can move a project to Lost from any stage. The system will prompt you to select a reason (price too high, went with competitor, timing, etc.). Tracking loss reasons over time reveals patterns you can address.`,
    tags: ['requirements', 'validation', 'stage', 'advance', 'pipeline', 'rules'],
  },

  // ── Team Management ──────────────────────────────────────────────
  {
    id: 'inviting-team-members',
    category: 'team-management',
    title: 'Inviting Team Members',
    content: `Adding your team to the CRM ensures everyone is working from the same system. Whether you have office staff, salespeople, or field crew leads, each person gets their own login with appropriate access.

**How to invite.** Go to Settings, then Team. Click "Invite Member" and enter their email address. Choose a role for them (more on roles in the next article). They will receive an email invitation with a link to create their account and set a password.

**What they see.** When a new team member logs in for the first time, they see the same dashboard but filtered to their assignments. A salesperson sees their own leads and projects. A crew lead sees the jobs they are assigned to. This keeps the interface clean and focused for each person.

**Managing invitations.** You can view pending invitations and resend them if the original email was missed. You can also revoke an invitation before it is accepted. Once a team member has joined, you can update their role or deactivate their account from the Team settings page.

**Best practice for roofing teams.** Add your office manager first so they can help manage contacts and scheduling. Then add your salespeople so they can track their own deals. Finally, add crew leads if you want them logging time and materials from the field. You do not need to add every crew member — just the leads who will be responsible for project updates.`,
    tags: ['invite', 'team', 'members', 'staff', 'crew', 'add user', 'access'],
  },
  {
    id: 'roles-and-permissions',
    category: 'team-management',
    title: 'Roles and Permissions',
    content: `Roles control what each team member can see and do within the CRM. Assigning the right role to each person protects sensitive business data while giving everyone the access they need.

**Owner** has full access to everything: all contacts, all projects, all financial data, team management, billing, and account settings. There is one owner per account, typically the business owner or general manager. The owner can see revenue reports, profit margins, and subscription billing.

**Admin** has broad access similar to the owner, including the ability to manage team members and view financial reports. Admins cannot change billing or subscription settings. This role is appropriate for an operations manager or office manager who needs to oversee the business day-to-day.

**Manager** can view and manage all contacts and projects, assign work to team members, and see pipeline and activity reports. Managers cannot access billing or modify team roles. This role works well for sales managers who need to see their team's pipeline and coach on deal strategy.

**User** can only see contacts and projects assigned to them. They cannot view other team members' deals, access financial reports, or change account settings. This role is appropriate for individual salespeople or crew leads who need to manage their own work without seeing the full business picture.

**Choosing the right role.** When in doubt, start with less access and expand as needed. It is easier to give someone more permissions than to realize they have been viewing sensitive margin data for months. A salesperson does not need to see your profit margins on every job, and a crew lead does not need to see every lead in the pipeline.`,
    tags: ['roles', 'permissions', 'access', 'owner', 'admin', 'manager', 'user', 'security'],
  },

  // ── SMS & Email ──────────────────────────────────────────────────
  {
    id: 'setting-up-sms-templates',
    category: 'sms-email',
    title: 'Setting Up SMS Templates',
    content: `SMS is one of the most effective ways to reach homeowners quickly. Templates let you send consistent, professional messages without typing them from scratch every time.

**Creating a template.** Go to Settings and find SMS Templates. Click "New Template" and give it a name you will recognize, like "Inspection Reminder" or "Estimate Follow-Up." Write your message using merge fields like {first_name} and {company_name} to personalize each message automatically.

**TCPA compliance.** Federal law requires that you have consent before sending marketing text messages. The system helps you stay compliant by tracking opt-in status for each contact. Never send promotional messages to contacts who have not opted in. Transactional messages, like appointment reminders for an already-scheduled inspection, have different rules but should still be relevant and expected.

**Best practices for roofing SMS.** Keep messages short and actionable. For example: "Hi {first_name}, this is {company_name}. Just confirming your roof inspection tomorrow at 2 PM. Reply YES to confirm or call us to reschedule." Include your company name in every message so the homeowner knows who is texting. Avoid sending messages before 8 AM or after 9 PM in the contact's time zone.

**Common templates to set up.** Start with these four: an inspection confirmation, an estimate follow-up (sent 2 days after the estimate), a job start notification ("Your crew will arrive tomorrow morning"), and a post-job thank you with a review request. These four templates cover the most critical touchpoints in a roofing project lifecycle.`,
    tags: ['SMS', 'text', 'templates', 'TCPA', 'compliance', 'messages', 'opt in'],
  },
  {
    id: 'email-campaigns',
    category: 'sms-email',
    title: 'Email Campaigns',
    content: `Email campaigns let you reach groups of contacts at once with targeted messages. They are useful for seasonal outreach, storm follow-ups, and staying top of mind with past customers.

**Creating a campaign.** Go to the Campaigns section and click "New Campaign." Give it a name, select your recipients by filtering contacts (for example, all leads from the last 90 days, or all customers in a specific zip code). Then compose your email with a subject line and body. You can include your company logo and formatting to keep it professional.

**Campaign steps.** A campaign can have multiple steps with delays between them. For example, step one sends the initial email on day one. Step two sends a follow-up three days later to anyone who did not open the first email. Step three sends a final attempt a week later. Multi-step campaigns dramatically improve response rates compared to a single email.

**Tracking results.** After a campaign sends, you can see delivery, open, and click rates. These metrics tell you whether your subject lines are compelling and whether your content is driving action. If open rates are low, test different subject lines. If click rates are low, make your call to action clearer.

**Campaign ideas for roofers.** After a major storm event, send a campaign to all homeowners in the affected area offering free inspections. In the spring, email past customers about annual maintenance inspections. Before winter, send a campaign about gutter cleaning and ice dam prevention. These seasonal touchpoints generate repeat business and referrals.`,
    tags: ['email', 'campaigns', 'marketing', 'outreach', 'drip', 'automation', 'open rate'],
  },

  // ── Scheduling ───────────────────────────────────────────────────
  {
    id: 'calendar-and-scheduling',
    category: 'scheduling',
    title: 'Calendar and Scheduling',
    content: `The scheduling system helps you coordinate inspections, crew assignments, and customer appointments without double-booking or missing commitments.

**Google Calendar integration.** Connect your Google Calendar under Settings to sync events between the CRM and your personal calendar. When you schedule an inspection in the CRM, it appears on your Google Calendar. When you create an event on Google Calendar, it shows up in the CRM. This two-way sync prevents the "I forgot to check the other calendar" problem that plagues busy contractors.

**Scheduling an inspection.** From a project page, click "Schedule Inspection." Pick a date and time, and optionally assign it to a specific salesperson. The homeowner can receive an automatic SMS or email confirmation if you have templates set up. The event shows up on the project timeline and the assigned person's calendar.

**Managing your day.** The Events page shows all scheduled events for the day, week, or month. Use the day view when you are planning your route for site visits. Events display the property address so you can plan an efficient driving route instead of crisscrossing town.

**Rescheduling and cancellations.** If a homeowner needs to reschedule, update the event in the CRM. The system logs the change and can send an updated confirmation to the homeowner. Keeping a history of schedule changes is useful when homeowners claim they were never notified about an appointment.`,
    tags: ['calendar', 'scheduling', 'inspection', 'events', 'Google Calendar', 'sync', 'appointments'],
  },

  // ── Reports ──────────────────────────────────────────────────────
  {
    id: 'reports-and-analytics',
    category: 'reports',
    title: 'Reports and Analytics',
    content: `Reports give you the data you need to make informed business decisions. Instead of guessing which salespeople are performing or whether your margins are healthy, you can see the numbers.

**Revenue reports** show your closed revenue by month, quarter, or year. You can filter by salesperson, project type, or lead source to understand where your best revenue comes from. If storm damage jobs consistently deliver higher revenue than retail re-roofs, that data helps you prioritize your marketing spend.

**Job costing reports** compare your estimated costs versus actual costs on completed projects. This reveals whether you are pricing jobs accurately. If you consistently underestimate labor hours or material waste, you can adjust your estimating formulas. Even a 5% improvement in estimating accuracy compounds across hundreds of jobs.

**Pipeline reports** show conversion rates between stages. What percentage of leads convert to scheduled inspections? What percentage of estimates get approved? These metrics highlight where you are losing deals. If your estimate-to-approval rate is below 40%, your pricing or presentation may need work. If your lead-to-inspection rate is below 60%, your follow-up process needs attention.

**Team performance** lets managers see each salesperson's activity: leads contacted, inspections completed, estimates sent, and deals closed. This data supports coaching conversations with specific numbers rather than feelings. It also helps identify top performers whose methods can be shared with the rest of the team.`,
    tags: ['reports', 'analytics', 'revenue', 'job costing', 'margins', 'performance', 'metrics'],
  },

  // ── Billing ──────────────────────────────────────────────────────
  {
    id: 'managing-your-subscription',
    category: 'billing',
    title: 'Managing Your Subscription',
    content: `Your subscription controls which features are available and how many team members can access the system. Managing it is straightforward from the Billing section under Settings.

**Viewing your plan.** The Billing page shows your current plan, billing cycle (monthly or annual), next billing date, and payment method on file. Annual plans offer a discount compared to monthly billing, so if you know you will be using the system long-term, switching to annual saves money.

**Upgrading your plan.** If you need more team members, additional storage, or access to premium features, you can upgrade directly from the Billing page. Upgrades take effect immediately. You will be charged a prorated amount for the remainder of your current billing cycle, so you only pay for what you use.

**Updating payment information.** Click "Manage Billing" to access the billing portal where you can update your credit card, view past invoices, and download receipts for your accountant. Keeping your payment information current prevents service interruptions.

**Cancellation.** If you need to cancel, you can do so from the billing portal. Your account will remain active through the end of your current billing period. Your data is retained for 90 days after cancellation in case you decide to come back. We recommend exporting any important data before your account is deactivated.`,
    tags: ['subscription', 'billing', 'plan', 'upgrade', 'payment', 'cancel', 'invoice'],
  },
  {
    id: 'understanding-usage-limits',
    category: 'billing',
    title: 'Understanding Usage Limits',
    content: `Each subscription plan includes specific limits on usage. Understanding these limits helps you stay within your plan and avoid unexpected charges or service restrictions.

**Team members.** Your plan specifies how many team members can have active accounts. This counts all users with any role (owner, admin, manager, user). Deactivated accounts do not count against your limit. If you need to add more people than your plan allows, upgrade to the next tier.

**Contact storage.** Each plan allows a certain number of contact records. This includes both active contacts and archived ones. If you are approaching your limit, consider archiving contacts from old projects that are unlikely to generate future business. Imported contacts count the same as manually created ones.

**SMS messages.** Plans include a monthly SMS allowance. Each outgoing text message counts as one message, regardless of length (though messages over 160 characters may count as two in the carrier network). Incoming messages from contacts do not count against your limit. Campaign messages count individually per recipient.

**File storage.** Photos, documents, and estimate PDFs all consume storage. Roof inspection photos are typically the biggest consumer. Each plan includes a storage allowance measured in gigabytes. If you are approaching the limit, review old projects and remove any duplicate or unnecessary photos. High-resolution inspection photos can be several megabytes each, so a busy roofing company can accumulate storage quickly during storm season.`,
    tags: ['limits', 'usage', 'team members', 'contacts', 'SMS', 'storage', 'plan limits'],
  },
]

/**
 * Search articles by query string.
 * Matches against title, content, and tags (case-insensitive).
 */
export function searchArticles(query: string): HelpArticle[] {
  if (!query.trim()) return HELP_ARTICLES

  const lower = query.toLowerCase()
  return HELP_ARTICLES.filter((article) => {
    return (
      article.title.toLowerCase().includes(lower) ||
      article.content.toLowerCase().includes(lower) ||
      article.tags.some((tag) => tag.toLowerCase().includes(lower))
    )
  })
}

/**
 * Get all articles for a given category.
 */
export function getArticlesByCategory(category: HelpCategory): HelpArticle[] {
  return HELP_ARTICLES.filter((article) => article.category === category)
}

/**
 * Get a single article by its id.
 */
export function getArticleById(id: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((article) => article.id === id)
}

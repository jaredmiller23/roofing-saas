# ROOFING SAAS - COMPLETE FUNCTIONAL MAP

**Purpose:** Comprehensive guide for smoke testing with real customer data
**Last Updated:** January 2026
**Total Pages:** 55+
**Total Interactive Elements:** 850+

---

## TABLE OF CONTENTS

1. [Navigation](#1-navigation)
2. [Dashboard](#2-dashboard)
3. [Pipeline/Projects](#3-pipelineprojects)
4. [Contacts](#4-contacts)
5. [Signatures & Estimates](#5-signatures--estimates)
6. [Tasks & Events](#6-tasks--events)
7. [Knocks (Door Knocking)](#7-knocks-door-knocking)
8. [Claims](#8-claims)
9. [Communications](#9-communications)
10. [Storm Features](#10-storm-features)
11. [Business Features](#11-business-features)
12. [Settings](#12-settings)

---

# 1. NAVIGATION

## Desktop Sidebar

**Summary:** Main navigation for desktop users. Fixed left sidebar with collapsible sections.

### Interactive Elements

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Logo Link | "Job Clarity" | Navigate to dashboard | `/dashboard` |
| **SELL SECTION** | | | |
| Nav Button | "Knock" (Map icon) | Navigate to knocks | `/knocks` |
| Nav Button | "Signatures" (PenTool icon) | Navigate to signatures | `/signatures` |
| Nav Button | "Claims" (FileText icon) | Navigate to claims | `/claims` |
| Nav Button | "Incentives" (Trophy icon) | Navigate to incentives | `/incentives` |
| Nav Button | "Lead Gen" (Zap icon) | Navigate to storm targeting | `/storm-targeting` |
| Nav Button | "Storm Intel" (CloudLightning icon) | Navigate to storm tracking | `/storm-tracking` |
| **CORE SECTION** | | | |
| Nav Button | "Dashboard" (LayoutDashboard icon) | Navigate to dashboard | `/dashboard` |
| Nav Button | "Pipeline" (Workflow icon) | Navigate to projects | `/projects` |
| Nav Button | "Business Intel" (Sparkles icon) | Navigate to insights | `/insights` |
| Nav Button | "Events" (Calendar icon) | Navigate to events | `/events` |
| Nav Button | "Tasks" (CheckSquare icon) | Navigate to tasks | `/tasks` |
| **COMMUNICATIONS SECTION** | | | |
| Nav Button | "Call Log" (Phone icon) | Navigate to call logs | `/call-logs` |
| Nav Button | "Messages" (MessageSquare icon) | Navigate to messages | `/messages` |
| Nav Button | "Emails" (Mail icon) | Navigate to campaigns | `/campaigns` |
| Nav Button | "Contacts" (Users icon) | Navigate to contacts | `/contacts` |
| **SETTINGS SECTION** | | | |
| Nav Button | "Settings" (Settings icon) | Navigate to settings | `/settings` |
| **USER SECTION** | | | |
| User Picker | (Admin only) | Select user to impersonate | Opens picker |
| Sign Out Button | "Sign Out" (LogOut icon) | Sign out of account | Logs out |
| Hamburger Menu | Menu/X icon (mobile) | Toggle sidebar visibility | Opens/closes sidebar |

---

## Mobile Bottom Navigation (Instagram-Style)

**Summary:** 5-tab bottom navigation for field workers on mobile devices.

### Interactive Elements

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Tab | "Pipeline" (GitBranch icon) | Navigate to projects | `/projects` |
| Tab | "Signatures" (PenTool icon) | Navigate to signatures | `/signatures` |
| Tab | "Voice" (Mic icon) - CENTER | Open voice assistant modal | Opens voice modal |
| Tab | "Knock" (DoorClosed icon) | Navigate to knocks | `/knocks` |
| Tab | "Claims" (ClipboardList icon) | Navigate to claims | `/claims` |

**Voice Tab States:**
- Idle: Blue background, Mic icon
- Connecting: Spinner animation
- Connected: Green background, pulsing indicator
- Error: Red background, MicOff icon

---

## Mobile Top Bar (Instagram-Style)

**Summary:** Top navigation bar with hamburger menu and notifications.

### Interactive Elements

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Hamburger Button | 3-line icon | Open navigation drawer | Opens drawer |
| Brand Link | "Job Clarity" | Navigate to dashboard | `/dashboard` |
| Notification Bell | Bell icon + badge | Open notifications | Callback |
| Settings Button | Settings icon | Open settings | Callback |

---

## Field Worker Navigation (Traditional)

**Summary:** Top bar with hamburger menu that opens a full drawer.

### Interactive Elements

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Logo Link | "Job Clarity" | Navigate to dashboard | `/dashboard` |
| Hamburger Menu | Menu icon | Open navigation drawer | Opens drawer |
| All nav items | Same as Desktop Sidebar | Same actions | Same routes |
| Switch to Full View | "Switch to Full View" (Monitor icon) | Change UI mode | Switches mode |
| Sign Out | "Sign Out" (LogOut icon) | Sign out | Logs out |

---

## Manager Layout (Tablet)

**Summary:** Collapsible sidebar optimized for tablets with larger touch targets.

### Interactive Elements

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Logo (Expanded) | "Job Clarity" | Navigate to dashboard | `/dashboard` |
| Logo (Collapsed) | "JC" | Navigate to dashboard | `/dashboard` |
| Pin/Unpin Button | ChevronLeft/Right icon | Toggle sidebar expansion | Expands/collapses |
| All nav items | Same as Desktop | Same actions (icon only when collapsed) | Same routes |
| Switch to Full View | "Full View" (Monitor icon) | Change UI mode | Switches mode |
| Sign Out | "Sign Out" (LogOut icon) | Sign out | Logs out |

---

# 2. DASHBOARD

## Dashboard Page (`/dashboard`)

**Summary:** Main landing page showing KPIs, weather, gamification, and team performance.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Scope Filter - Company | "Company" (Building2 icon) | Filter metrics to company view | Updates metrics |
| Scope Filter - Team | "Team" (Users icon) | Filter metrics to team view | Updates metrics |
| Scope Filter - Personal | "Personal" (User icon) | Filter metrics to personal view | Updates metrics |

### KPI Metric Cards (4 cards)

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Revenue Card | "Revenue" | Display only | - |
| Pipeline Value Card | "Pipeline Value" | Display only | - |
| Door Knocks Card | "Door Knocks" | Display only | - |
| Conversion Rate Card | "Conversion Rate" | Display only | - |
| Retry Button | "Retry" (on error) | Re-fetch metrics | Reloads data |

### Weather Widget

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Refresh Button | RefreshCw icon | Refresh weather data | Reloads weather |
| Safety Indicator | Safe/Caution/Not Safe | Display only | - |
| 3-Day Forecast | Day rows | Display only | - |

### Weekly Challenge Widget

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| View Leaderboard Button | "View Leaderboard" (TrendingUp icon) | Navigate to leaderboard | Opens leaderboard |
| Calendar Button | Calendar icon | TBD | TBD |
| Retry Button | "Retry" (on error) | Re-fetch challenge data | Reloads data |

### Points Display Widget

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Progress Bar | Visual bar | Display only | - |
| Daily/Weekly/Monthly Stats | Point counts | Display only | - |

### Activity Feed Widget

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Activity Items | Sale/Knock/Call/Email entries | Display only | - |
| Retry Button | "Retry" (on error) | Re-fetch activity | Reloads data |

### Leaderboards (Knock & Sales)

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Daily Period Button | "Daily" | Filter to daily period | Updates leaderboard |
| Weekly Period Button | "Weekly" | Filter to weekly period | Updates leaderboard |
| Monthly Period Button | "Monthly" | Filter to monthly period | Updates leaderboard |
| All Period Button | "All" | Filter to all-time | Updates leaderboard |
| Leaderboard Entries | User rows with points | Display only | - |

---

# 3. PIPELINE/PROJECTS

## Projects List (`/projects`)

**Summary:** Main pipeline view with Kanban board and table options.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| View Toggle - Kanban | "Kanban" (LayoutGrid icon) | Switch to Kanban view | Shows Kanban |
| View Toggle - Table | "Table" (Table icon) | Switch to table view | Shows table |
| Analytics Button | "Analytics" (BarChart3 icon) | Navigate to analytics | `/pipeline/analytics` |
| New Opportunity Button | "New Opportunity" (Plus icon) | Create new opportunity | `/contacts/new` |

### Kanban View

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Search Input | "Search opportunities..." | Filter projects by name/contact | Filters list |
| Quick Filter - All | "All" | Show all stages | Filters stages |
| Quick Filter - Active Sales | "Active Sales" | Show sales stages | Filters stages |
| Quick Filter - In Production | "In Production" | Show production only | Filters stages |
| Quick Filter - Closed | "Closed" | Show complete/lost | Filters stages |
| Stage Toggle Buttons | Prospect/Qualified/Quote Sent/etc. | Toggle stage visibility | Hides/shows column |
| Reset Filters | "Reset" | Clear all filters | Clears filters |

### Project Cards (in Kanban columns)

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Project Name Link | Project name | Navigate to project | `/projects/{id}` |
| Contact Name Link | Contact name | Navigate to contact | `/contacts/{id}` |
| Start Production Button | "Start Production" (Play icon) | Start production job | Creates job |
| Mark as Lost Button | "Mark as Lost" (X icon) | Mark opportunity as lost | Updates status |
| Reactivate Button | "Reactivate" (RotateCcw icon) | Reactivate lost opportunity | Updates status |
| Call Button | Phone icon | Call contact | `tel:{phone}` |
| Text Button | MessageSquare icon | Text contact | `sms:{phone}` |
| Email Button | Mail icon | Email contact | `mailto:{email}` |
| Drag & Drop | Entire card | Move to different stage | Updates stage |

### Table View

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Lead Column Header | "Lead" | Sort by first_name | Sorts table |
| Stage Column Header | "Stage" | Sort by stage | Sorts table |
| Total Value Column Header | "Total Value" | Sort by value | Sorts table |
| Last Activity Column Header | "Last Activity" | Sort by updated_at | Sorts table |
| Row Checkbox | Checkbox | Select row | Selects row |
| Lead Name Link | Contact name | Navigate to contact | `/contacts/{id}` |
| Call Button | Phone icon | Call contact | `tel:{phone}` |
| Text Button | MessageSquare icon | Text contact | `sms:{phone}` |
| Email Button | Mail icon | Email contact | `mailto:{email}` |
| View Link | "View" | Navigate to contact | `/contacts/{id}` |
| Previous Button | "Previous" | Previous page | Pagination |
| Next Button | "Next" | Next page | Pagination |

---

## Project Detail (`/projects/{id}`)

**Summary:** Detailed view of a single project with tabs for different information.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Back Link | "← Back to Projects" | Return to projects list | `/projects` |
| Start Production Button | "Start Production" (Play icon) | Create production job | Creates job |
| Job Costing Button | "Job Costing" (DollarSign icon) | View job costing | `/projects/{id}/costing` |
| Claims Button | "Claims" (File icon) | View claims | `/projects/{id}/claims` |
| Send Signature Button | Opens dialog | Send signature request | Opens dialog |
| Edit Project Button | "Edit Project" | Edit project | `/projects/{id}/edit` |

### Tab Navigation

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Overview Tab | "Overview" (File icon) | Show overview | Switches tab |
| Quote Options Tab | "Quote Options" (Calculator icon) | Show quote options | Switches tab |
| Jobs Tab | "Jobs" (Briefcase icon) | Show associated jobs | Switches tab |
| Files Tab | "Files" (File icon) | Show files | Switches tab |
| Contact Tab | "Contact" (User icon) | Show contact info | Switches tab |

### Quote Options Tab

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Edit Options Button | "Edit Options" (Calculator icon) | Edit quote options | `/estimates/new?project_id={id}` |
| Send Proposal Button | "Send Proposal" (Send icon) | Send proposal | TBD |
| Create Quote Options Button | "Create Quote Options" | Create new options | `/estimates/new?project_id={id}` |

### Jobs Tab

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Create Job Button | "+ Create Job" | Create new job | `/jobs/new?project_id={id}` |
| Create First Job Button | "+ Create First Job" | Create first job | `/jobs/new?project_id={id}` |
| View Details Button | "View Details" | View job details | `/jobs/{job_id}` |

### Contact Tab

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Call Button | "Call {FirstName}" (Phone icon) | Call contact | `tel:{phone}` |
| Email Button | "Email {FirstName}" (Email icon) | Email contact | `mailto:{email}` |
| View Full Contact Button | "View Full Contact" (User icon) | View contact | `/contacts/{id}` |

---

# 4. CONTACTS

## Contacts List (`/contacts`)

**Summary:** Main contacts database with search, filters, and quick actions.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Add Contact Button | "+ Add Contact" | Create new contact | `/contacts/new` |

### Filter Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Saved Filters Dropdown | Filter names | Load saved filter | Applies filter |
| Add Filter Button | "Add Filter" (Plus icon) | Open filter builder | Opens modal |
| Save Preset Button | "Save Preset" (Save icon) | Save current filters | Opens dialog |
| Clear All Button | "Clear All" (X icon) | Clear all filters | Clears filters |
| Filter Pills | Active filter tags | Remove individual filter | Removes filter |

### Quick Filters

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Urgent Chip | "Urgent" (AlertCircle icon) | Filter to urgent | Applies filter |
| High Priority Chip | "High Priority" (TrendingUp icon) | Filter to high priority | Applies filter |
| New Leads Chip | "New Leads" (Clock icon) | Filter to new leads | Applies filter |
| Active Deals Chip | "Active Deals" (TrendingUp icon) | Filter to negotiation | Applies filter |
| Customers Chip | "Customers" (DollarSign icon) | Filter to won | Applies filter |
| Leads Only Chip | "Leads Only" | Filter to leads | Applies filter |

### Advanced Search

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Search Input | "Name, email, or phone..." | Search contacts | Filters list |
| Stage Dropdown | All Stages/New/Contacted/etc. | Filter by stage | Filters list |
| Type Dropdown | All Types/Lead/Prospect/Customer | Filter by type | Filters list |
| Priority Dropdown | All Priorities/Urgent/High/Normal/Low | Filter by priority | Filters list |
| Apply Filters Button | "Apply Filters" (Search icon) | Apply all filters | Filters list |
| Reset Button | "Reset" | Clear all filters | Clears filters |

### Contacts Table

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Select All Checkbox | Checkbox | Select all contacts | Selects all |
| Name Column Header | "Name" | Sort by first_name | Sorts table |
| Email Column Header | "Email" | Sort by email | Sorts table |
| Phone Column Header | "Phone" | Sort by phone | Sorts table |
| Stage Column Header | "Stage" | Sort by stage | Sorts table |
| Row Checkbox | Checkbox | Select individual contact | Selects row |
| Contact Name Link | Name text | Navigate to contact | `/contacts/{id}` |
| Call Button | Phone icon | Call contact | `tel:{phone}` |
| Text Button | MessageSquare icon | Text contact | `sms:{phone}` |
| Email Button | Mail icon | Email contact | `mailto:{email}` |
| Edit Link | "Edit" | Edit contact | `/contacts/{id}/edit` |
| Delete Button | "Delete" | Delete contact | Shows confirmation |

### Bulk Actions (when contacts selected)

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Selection Count | "N contact(s) selected" | Display only | - |
| Clear Selection | "Clear" | Deselect all | Clears selection |
| Change Stage Dropdown | Stage options | Bulk update stage | Updates stage |
| Change Priority Dropdown | Priority options | Bulk update priority | Updates priority |
| Delete Button | "Delete" | Bulk delete | Shows confirmation |

### Pagination

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Previous Button | "Previous" | Previous page | Changes page |
| Next Button | "Next" | Next page | Changes page |

---

## Contact Detail (`/contacts/{id}`)

**Summary:** Detailed view of a single contact with all information and actions.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Substatus Dropdown | Status options | Change substatus | Updates status |
| Edit Button | "Edit" | Edit contact | `/contacts/{id}/edit` |
| Back Button | "Back" | Return to list | `/contacts` |

### Contact Actions

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Email Link | Email address | Open email client | `mailto:{email}` |
| Phone Link | Phone number | Call contact | `tel:{phone}` |

### Property Photos Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Upload Button | File input area | Upload photo | Opens file picker |
| Delete Photo Button | X icon on photo | Delete photo | Removes photo |
| Photo Gallery | Grid of photos | View full-size | Opens lightbox |

---

## Create/Edit Contact (`/contacts/new`, `/contacts/{id}/edit`)

**Summary:** Form for creating or editing contact information.

### Form Fields

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| First Name Input | "First Name *" | Enter first name | - |
| Last Name Input | "Last Name *" | Enter last name | - |
| Email Input | "Email" | Enter email (checks duplicates) | - |
| Phone Input | "Phone" | Enter phone (checks duplicates) | - |
| Mobile Phone Input | "Mobile Phone" | Enter mobile | - |
| Is Organization Checkbox | "This is a company/organization" | Toggle organization mode | - |
| Company Name Input | "Company Name" | Enter company | - |
| Website Input | "Website" | Enter website URL | - |
| Category Dropdown | "Category *" | Select category | - |
| Sales Stage Dropdown | "Sales Stage" | Select Lead/Prospect/Customer | - |
| Stage Dropdown | "Stage" | Select stage | - |
| Priority Dropdown | "Priority" | Select priority | - |
| Source Input | "Source" | Enter lead source | - |
| Street Address Input | "Street Address" | Enter address | - |
| City Input | "City" | Enter city | - |
| State Input | "State" | Enter state (2 letters) | - |
| ZIP Code Input | "ZIP Code" | Enter ZIP | - |
| Property Type Input | "Property Type" | Enter property type | - |
| Roof Type Input | "Roof Type" | Enter roof type | - |
| Roof Age Input | "Roof Age (years)" | Enter roof age | - |
| Square Footage Input | "Square Footage" | Enter sq ft | - |
| Stories Input | "Stories" | Enter stories | - |
| Job Type Dropdown | "Job Type" | Select job type | - |
| Customer Type Dropdown | "Customer Type" | Select Insurance/Retail | - |
| Insurance Carrier Input | "Insurance Carrier" | Enter carrier | - |
| Policy Number Input | "Policy Number" | Enter policy | - |
| Claim Number Input | "Claim Number" | Enter claim number | - |
| Deductible Input | "Deductible" | Enter deductible amount | - |
| Text Consent Checkbox | "Customer consents to text messages" | Toggle consent | - |
| Auto Text Consent Checkbox | "Customer consents to automated texts" | Toggle consent | - |
| Auto Call Consent Checkbox | "Customer consents to automated calls" | Toggle consent | - |
| Submit Button | "Create Contact" / "Update Contact" | Save contact | `/contacts/{id}` |
| Cancel Button | "Cancel" | Go back | Previous page |

### Duplicate Warning Dialog

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Continue Button | "Create Anyway" | Proceed despite duplicates | Continues |
| Cancel Button | "Cancel" | Return to form | Closes dialog |

---

# 5. SIGNATURES & ESTIMATES

## Signatures List (`/signatures`)

**Summary:** List of all signature documents with status and actions.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Templates Button | "Templates" (LayoutTemplate icon) | View templates | `/signatures/templates` |
| New Document Button | "New Document" (Plus icon) | Create document | `/signatures/new` |

### Filter Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Search Input | "Search documents..." | Filter by title/type | Filters list |
| Status Dropdown | All Statuses/Draft/Sent/etc. | Filter by status | Filters list |

### Document List

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Document Title Link | Document title | Navigate to document | `/signatures/{id}` |
| Send Button | "Send" (Send icon) | Send document | `/signatures/{id}/send` |
| Download Button | "Download" (Download icon) | Download signed document | Opens PDF |

---

## Create Signature Document (`/signatures/new`)

**Summary:** Multi-step wizard for creating signature documents (5 steps).

### Step Navigation

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Back Button | "Back" (ArrowLeft icon) | Previous step | Previous step |
| Cancel Button | "Cancel" | Cancel creation | `/signatures` |
| Next Button | "Next" (ArrowRight icon) | Next step | Next step |
| Review Button | "Review" | Go to review step | Review step |
| Create Document Button | "Create Document" (Save icon) | Create document | Creates & redirects |

### Step 1: Template Selection

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Create from Scratch Card | "Start from Scratch" | Skip template | Next step |
| Template Cards | Template name | Select template | Next step |
| Preview Button | "Preview" (Eye icon) | Preview template | Opens modal |
| Use Template Button | "Use Template" | Select this template | Next step |

### Step 2: Document Info

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Title Input | "Document Title *" | Enter title | - |
| Description Textarea | "Description" | Enter description | - |
| Document Type Dropdown | "Document Type *" | Select type | - |
| Project Select | "Project (Optional)" | Select project | - |
| Contact Select | "Contact (Optional)" | Select contact | - |
| Customer Signature Checkbox | "Requires customer signature" | Toggle requirement | - |
| Company Signature Checkbox | "Requires company signature" | Toggle requirement | - |
| Expiration Days Input | "Expires In (Days)" | Enter days | - |

### Step 3: Upload PDF

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| File Drop Zone | "Drag and drop your PDF here" | Drop/select file | Uploads file |
| Browse Files Button | "Browse Files" | Open file picker | Opens picker |
| Remove Button | "Remove" | Remove uploaded file | Removes file |

### Step 4: Place Signature Fields

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Document Editor | Visual editor | Place signature fields | Positions fields |

### Step 5: Review & Create

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Create Document Button | "Create Document" | Submit and create | Creates document |

---

## Signature Templates (`/signatures/templates`)

**Summary:** Manage reusable signature document templates.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| New Template Button | "New Template" (Plus icon) | Create template | `/signatures/templates/new` |

### Filter Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Search Input | "Search templates..." | Filter by name | Filters list |
| Category Dropdown | All Categories/Contracts/etc. | Filter by category | Filters list |

### Template Cards

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Preview Button | "Preview" (Eye icon) | Preview template | Opens modal |
| Toggle Active Button | ToggleRight/Left icon | Activate/deactivate | Updates status |
| Duplicate Button | "Duplicate" (Copy icon) | Duplicate template | Creates copy |
| Edit Button | "Edit" (Pencil icon) | Edit template | `/signatures/templates/{id}` |
| Delete Button | "Delete" (Trash2 icon) | Delete template | Confirms & deletes |

---

## Create/Edit Template (`/signatures/templates/new`, `/signatures/templates/{id}`)

**Summary:** Form for creating or editing signature templates.

### Form Fields

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Name Input | "Template Name *" | Enter template name | - |
| Description Textarea | "Description" | Enter description | - |
| Category Dropdown | "Category" | Select category | - |
| Expiration Days Input | "Expiration (Days)" | Enter expiration days | - |
| Customer Signature Checkbox | "Requires customer signature" | Toggle requirement | - |
| Company Signature Checkbox | "Requires company signature" | Toggle requirement | - |
| Is Active Checkbox | "Template is active" | Toggle active state | - |
| Add Field Buttons | Signature/Initials/Date/etc. | Add field type | Adds field |
| Delete Field Button | Trash2 icon | Delete field | Removes field |
| Cancel Button | "Cancel" (ArrowLeft icon) | Cancel | `/signatures/templates` |
| Create/Save Button | "Create Template" / "Save Changes" | Save template | Saves & redirects |

---

## Template Visual Editor (`/signatures/templates/{id}/editor`)

**Summary:** Visual and HTML editor for template content.

### Tab Navigation

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Field Editor Tab | "Field Editor" (FileText icon) | Show visual editor | Switches tab |
| HTML Editor Tab | "HTML Editor" (Code2 icon) | Show HTML editor | Switches tab |

### HTML Editor

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| HTML Textarea | Template HTML content | Edit HTML | - |
| Preview Button | "Preview" / "Hide Preview" (Eye/X icon) | Toggle preview | Shows/hides preview |
| Save HTML Button | "Save HTML" (Save icon) | Save HTML content | Saves content |

---

## Signature Document Detail (`/signatures/{id}`)

**Summary:** View signature document details, status, and actions.

### Header Actions

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Send Button | "Send" (Send icon) | Send for signature | `/signatures/{id}/send` |
| Resend Reminder Button | "Resend Reminder" (RefreshCw icon) | Resend reminder email | Sends reminder |
| Download Button | "Download" (Download icon) | Download signed PDF | Downloads file |
| Create New Version Button | "Create New Version" (Copy icon) | Clone declined document | `/signatures/new?clone={id}` |
| Delete Button | "Delete" (Trash2 icon) | Delete document | Confirms & deletes |

### Tab Content

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Details Tab | "Claim Details" | Show details | Switches tab |
| Timeline Tab | "Timeline" | Show timeline | Switches tab |
| Documents Tab | "Documents" | Show documents | Switches tab |
| View Project Button | "View Project" | Navigate to project | `/projects/{id}` |

---

## Send Document (`/signatures/{id}/send`)

**Summary:** Form for sending signature document to recipient.

### Form Fields

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Recipient Name Input | "Recipient Name *" | Enter name | - |
| Recipient Email Input | "Recipient Email *" | Enter email | - |
| Custom Message Textarea | "Custom Message (Optional)" | Enter message | - |
| Expiration Days Input | "Expires In (Days)" | Enter days | - |
| Cancel Button | "Cancel" | Cancel sending | `/signatures/{id}` |
| Send Document Button | "Send Document" (Send icon) | Send document | Sends & redirects |

---

# 6. TASKS & EVENTS

## Tasks List (`/tasks`)

**Summary:** View and manage tasks in list format.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Board View Button | "Board View" | Switch to board view | `/tasks/board` |
| New Task Button | "+ New Task" | Create new task | `/tasks/new` |

### Filter Bar

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Filter Controls | Various filters | Filter tasks | Filters list |

### Task Cards

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| View Button | "View" (Eye icon) | View task details | `/tasks/{id}` |
| Edit Button | "Edit" (Edit icon) | Edit task | `/tasks/{id}/edit` |
| Delete Button | "Delete" (Trash icon) | Delete task | Confirms & deletes |

---

## Task Board (`/tasks/board`)

**Summary:** Kanban-style task board with drag and drop.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| New Task Button | "+ New Task" | Create new task | `/tasks/new` |
| List View Button | "List View" | Switch to list view | `/tasks` |
| Search Input | "Search tasks..." | Filter by title | Filters tasks |
| Priority Dropdown | "Priority" | Filter by priority | Filters tasks |

### Kanban Board

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Task Cards | Draggable cards | Drag to change status | Updates status |
| View Button | "View" (Eye icon) | View task | `/tasks/{id}` |
| Edit Button | "Edit" (Edit icon) | Edit task | `/tasks/{id}/edit` |

---

## Task Detail (`/tasks/{id}`)

**Summary:** Detailed view of a single task.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Edit Button | "Edit" | Edit task | `/tasks/{id}/edit` |
| Back Button | "Back" | Return to tasks | `/tasks` |

---

## Create/Edit Task (`/tasks/new`, `/tasks/{id}/edit`)

**Summary:** Form for creating or editing tasks.

### Form Fields

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Title Input | "Title *" | Enter title | - |
| Description Textarea | "Description" | Enter description | - |
| Priority Dropdown | "Priority" | Select priority | - |
| Status Dropdown | "Status" | Select status | - |
| Due Date Input | "Due Date" | Select due date | - |
| Start Date Input | "Start Date" | Select start date | - |
| Project Dropdown | "Project" | Select project | - |
| Contact Dropdown | "Contact" | Select contact | - |
| Assigned To Dropdown | "Assigned To" | Select assignee | - |
| Parent Task Dropdown | "Parent Task" | Select parent | - |
| Progress Input | "Progress" | Enter 0-100% | - |
| Estimated Hours Input | "Estimated Hours" | Enter hours | - |
| Actual Hours Input | "Actual Hours" | Enter hours | - |
| Tag Input | Tag name + Add | Add tags | Adds tag |
| Tag Remove Button | X on tag | Remove tag | Removes tag |
| Enable Reminders Checkbox | "Enable Reminders" | Toggle reminders | Shows date input |
| Reminder Date Input | Reminder date/time | Set reminder | - |
| Cancel Button | "Cancel" | Go back | Previous page |
| Save Button | "Save Task" / "Update Task" | Save task | Saves & redirects |

---

## Events List (`/events`)

**Summary:** Calendar and list view for events.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Schedule Event Button | "+ Schedule Event" | Create new event | `/events/new` |

### View Toggle

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Calendar View Button | "Calendar View" (Calendar icon) | Switch to calendar | Shows calendar |
| List View Button | "List View" (List icon) | Switch to list | Shows table |

### Calendar Type Toggle (in Calendar View)

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Standard Calendar Button | "Standard Calendar" | Use built-in calendar | Shows standard |
| Google Calendar Button | "Google Calendar" | Use Google Calendar | Shows Google |

### Events Table

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| View Link | ExternalLink icon | View event | `/events/{id}` |
| Delete Button | "Delete" | Delete event | Confirms & deletes |
| Previous Button | "Previous" | Previous page | Changes page |
| Next Button | "Next" | Next page | Changes page |

---

## Create/Edit Event (`/events/new`, `/events/{id}/edit`)

**Summary:** Form for creating or editing events.

### Form Fields

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Title Input | "Event title *" | Enter title | - |
| Event Type Dropdown | "Event Type" | Select type | - |
| Status Dropdown | "Status" | Select status | - |
| Assigned To Dropdown | "Assigned To" | Select assignee | - |
| Description Textarea | "Description" | Enter description | - |
| All Day Checkbox | "All Day Event" | Toggle all-day | Hides time inputs |
| Start DateTime Input | "Start *" | Select start date/time | - |
| End DateTime Input | "End *" | Select end date/time | - |
| Location Name Input | "Location Name" | Enter location | - |
| Street Address Input | "Street Address" | Enter address | - |
| City Input | "City" | Enter city | - |
| State Input | "State" | Enter state | - |
| ZIP Code Input | "ZIP Code" | Enter ZIP | - |
| Outcome Input | "Outcome" (edit only) | Enter outcome | - |
| Outcome Notes Textarea | "Outcome Notes" (edit only) | Enter notes | - |
| Cancel Button | "Cancel" | Go back | Previous page |
| Submit Button | "Schedule Event" / "Update Event" | Save event | Saves & redirects |

---

## Event Detail (`/events/{id}`)

**Summary:** Detailed view of a single event.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Edit Button | "Edit" | Edit event | `/events/{id}/edit` |

### Footer Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Back to Events Button | "Back to Events" | Return to events | `/events` |

---

# 7. KNOCKS (Door Knocking)

## Knocks Page (`/knocks`)

**Summary:** Door knocking interface with map, territories, and activity tracking.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| View Switcher Dropdown | Map/KPIs/Territories | Change view mode | Switches view |
| Log Knock Button | "Log Knock" (Plus icon) | Log new knock | `/knocks/new` |
| New Territory Button | "New Territory" (Plus icon) | Create territory | `/territories/new` |

### Map View

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Live Location Indicator | Green dot + "Live Location" | Display only | - |
| Center on Me Button | Crosshair icon | Center map on user | Centers map |
| Retry Button | "Retry" (on error) | Retry geolocation | Retries location |
| Drop Pins Button | "Drop Pins" / "Stop Dropping" | Toggle pin mode | Toggles mode |
| Pin Markers | Colored house icons | View/edit pin | Opens popup |
| Map Click (when dropping) | Map surface | Create new pin | Opens popup |

### Territory Selector

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Clear Selection Button | "Clear Selection" | Deselect territory | Clears selection |
| Territory Buttons | Territory names | Select territory | Selects & shows on map |
| Edit Territory Link | "Edit" | Edit territory | `/knocks/{id}/edit` |

### Recent Activity

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Activity Items | Knock records | Display only | - |
| View Contact Link | "View Contact →" | Navigate to contact | `/contacts/{id}` |

### KPIs View

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Stats Cards | Total/Today/Week/Month | Display only | - |
| Points Display | Gamification component | Display only | - |
| Leaderboard | Top knockers | Display only | - |
| Achievements | Badges earned | Display only | - |

### Territories View

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Territory Cards | Territory details | Select territory | Switches to map |
| Edit Button | Pencil icon | Edit territory | `/knocks/{id}/edit` |
| Delete Button | Trash icon | Delete territory | Confirms |
| Confirm Delete Button | "Confirm" | Confirm deletion | Deletes |
| Cancel Delete Button | "Cancel" | Cancel deletion | Closes |
| Refresh Button | "Refresh" | Reload territories | Reloads |

---

## Log Knock (`/knocks/new`)

**Summary:** Quick knock logging form.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Back Button | Left arrow | Return to knocks | `/knocks` |

### Location Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Get My Location Button | "Get My Location" (MapPin icon) | Capture GPS | Gets location |
| Update Location Button | "Update Location" (MapPin icon) | Refresh GPS | Updates location |

### Disposition Selection

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Not Home Button | Door icon | Select disposition | Selects |
| Interested Button | Thumbs Up icon | Select disposition | Selects |
| Not Interested Button | Thumbs Down icon | Select disposition | Selects |
| Set Appointment Button | Calendar icon | Select disposition | Shows date/time |
| Callback Later Button | Phone icon | Select disposition | Shows date |

### Conditional Fields

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Appointment Date Input | Date picker | Select date | - |
| Appointment Time Input | Time picker | Select time | - |
| Callback Date Input | Date picker | Select callback date | - |

### Notes Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Notes Textarea | "Notes (Optional)" | Enter notes | - |

### Submit Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Log Knock Button | "Log Knock" (Check icon) | Submit knock | Saves & redirects |

---

## Pin Popup Modal

**Summary:** Modal for creating/editing pins on the map.

### Modal Elements

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Close Button | X icon | Close modal | Closes |
| Disposition Buttons | 7 options | Select disposition | Selects |
| Notes Textarea | Notes field | Enter notes | - |
| Create Contact Checkbox | "Create lead in CRM" | Toggle contact creation | Shows form |
| First Name Input | "First Name" | Enter first name | - |
| Last Name Input | "Last Name" | Enter last name | - |
| Phone Input | Phone field | Enter phone | - |
| Email Input | Email field | Enter email | - |
| Delete Button | Red button (edit mode) | Delete pin | Deletes |
| Cancel Button | "Cancel" | Close without saving | Closes |
| Save Button | "Save Pin" / "Update Pin" | Save pin | Saves & closes |

---

# 8. CLAIMS

## Claims List (`/claims`)

**Summary:** View and manage insurance claims with filters and export.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Statistics Cards | Total/New/In Progress/Approved | Display only | - |

### Filter Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Search Input | "Search by claim #, address, policy #..." | Search claims | Filters list |
| Status Dropdown | Status options | Filter by status | Filters list |
| Project Dropdown | Project options | Filter by project | Filters list |
| Date From Input | Date picker | Filter by date range | Filters list |
| Date To Input | Date picker | Filter by date range | Filters list |
| Clear All Button | "Clear all" | Clear filters | Clears filters |
| Export CSV Button | "Export CSV" (FileSpreadsheet icon) | Export to CSV | Downloads file |
| Export PDF Button | "Export PDF" (Download icon) | Export to PDF | Downloads file |

### Claims Cards

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Claim Card | Entire card | Navigate to claim | `/projects/{projectId}/claims/{claimId}` |

---

## Project Claims (`/projects/{id}/claims`)

**Summary:** Claims for a specific project.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Back to Project Button | "Back to Project" (ArrowLeft icon) | Return to project | `/projects/{id}` |
| Start Inspection Button | "Start Inspection" (Plus icon) | Start inspection | `/projects/{id}/claims/inspection` |

### Quick Actions

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| New Inspection Button | "New Inspection" (FileText icon) | Start inspection | `/projects/{id}/claims/inspection` |
| Export Claim Package Button | "Export Claim Package" (DollarSign icon) | Export package | `/projects/{id}/claims/export` |
| View Project Button | "View Project" (Calendar icon) | View project | `/projects/{id}` |

---

## Claim Detail (`/projects/{id}/claims/{claimId}`)

**Summary:** Detailed claim view with status workflow and documents.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Back to Claims Button | "Back to Claims" (ArrowLeft icon) | Return to claims | `/projects/{id}/claims` |
| Sync to Claims Button | "Sync to Claims" (Upload icon) | Sync claim | Syncs data |
| Export Package Button | "Export Package" (Download icon) | Download package | Downloads ZIP |

### Status Workflow

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Status Transition Buttons | Next status options | Change status | Opens dialog |
| Notes Textarea | "Notes *" (in dialog) | Enter notes | - |
| Approved Amount Input | "Approved Amount *" | Enter amount | - |
| Paid Amount Input | "Paid Amount *" | Enter amount | - |
| Cancel Button | "Cancel" | Close dialog | Closes |
| Confirm Button | "Confirm Status Change" | Update status | Updates |

### Approval Workflow

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Approve Claim Button | "Approve Claim" (CheckCircle icon) | Open approve dialog | Opens dialog |
| Reject Claim Button | "Reject Claim" (XCircle icon) | Open reject dialog | Opens dialog |
| Approval Notes Textarea | "Approval Notes (Optional)" | Enter notes | - |
| Rejection Reason Textarea | "Rejection Reason *" | Enter reason | - |
| Confirm Approval Button | "Confirm Approval" | Approve claim | Approves |
| Confirm Rejection Button | "Confirm Rejection" | Reject claim | Rejects |

### Tabs

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Details Tab | "Claim Details" | Show details | Switches tab |
| Timeline Tab | "Timeline" | Show timeline | Switches tab |
| Documents Tab | "Documents" | Show documents | Switches tab |

### Documents Tab

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Upload Documents Button | "Upload Documents" (Upload icon) | Open upload dialog | Opens dialog |
| Document Type Dropdown | Document types | Select type | - |
| File Drop Zone | Drop area | Select/drop files | Opens picker |
| Remove File Button | X icon | Remove from selection | Removes |
| Upload Button | "Upload X File(s)" | Upload files | Uploads |
| Download Button | "Download" (Download icon) | Download document | Opens file |
| Delete Button | "Delete" (Trash2 icon) | Delete document | Confirms |

---

## Inspection Wizard (`/projects/{id}/claims/inspection`)

**Summary:** Multi-step inspection process for documenting property damage.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Close Button | X icon | Cancel inspection | `/projects/{id}/claims` |
| Progress Bar | Visual progress | Display only | - |

### Step Navigation

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Back Button | "Back" | Previous step | Previous step |
| Continue/Next Button | "Continue" / "Next Area" / "Review" | Next step | Next step |
| Submit Button | "Submit" | Submit inspection | Creates claim |

### Step 1: Location Verification

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Verify Location Button | Verify button | Verify GPS | Updates state |
| Skip Button | Skip option | Skip verification | Next step |

### Step 3: Damage Checklist

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Area Checkboxes | Roof/Gutters/Siding/etc. | Toggle areas | Updates checklist |

### Step 4: Photo Capture

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Photo Capture | Camera/upload | Capture photos | Adds photos |

---

# 9. COMMUNICATIONS

## Messages (`/messages`)

**Summary:** SMS/chat thread interface for customer communication.

### Conversation List

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Search Input | "Search conversations..." | Filter conversations | Filters list |
| New Button | "+ New" (mobile) | Start new conversation | `/contacts` |
| Conversation Items | Contact name + preview | Select conversation | Opens thread |

### Message Thread

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Back Button | ArrowLeft icon (mobile) | Return to list | Shows list |
| Message Bubbles | Message text | Display only | - |
| Message Textarea | "Type a message..." | Compose message | - |
| Character Counter | "X characters remaining" | Display only | - |
| Send Button | Send icon | Send message | Sends |

---

## Call Logs (`/call-logs`)

**Summary:** Phone call tracking and history.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Log Call Button | "+ Log Call" | Log new call | `/call-logs/new` |

### Filter Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Filter Bar | Various filters | Filter call logs | Filters list |

### Call Logs Table

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| View Link | ExternalLink icon | View call | `/call-logs/{id}` |
| Delete Button | "Delete" | Delete call | Confirms & deletes |
| Previous Button | "Previous" | Previous page | Changes page |
| Next Button | "Next" | Next page | Changes page |

---

## New Call Log (`/call-logs/new`)

**Summary:** Form for logging phone calls.

### Form Fields

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Direction Dropdown | "Direction" | Select Inbound/Outbound | - |
| Phone Number Input | "Phone Number *" | Enter phone | - |
| Duration Input | "Duration (seconds)" | Enter duration | - |
| Outcome Dropdown | "Outcome" | Select outcome | - |
| Disposition Input | "Disposition" | Enter disposition | - |
| Notes Textarea | "Notes" | Enter notes | - |
| Cancel Button | "Cancel" | Go back | Previous page |
| Save Button | "Save Call Log" | Save call | Saves & redirects |

---

## Call Log Detail (`/call-logs/{id}`)

**Summary:** Detailed view of a single call log.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Edit Button | "Edit" | Edit call log | `/call-logs/{id}/edit` |

### Audio Player (if recording exists)

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Progress Bar | Seekable bar | Seek position | Changes position |
| Skip Back Button | SkipBack icon | Skip back 15s | Seeks |
| Play/Pause Button | Play/Pause icon | Toggle playback | Plays/pauses |
| Skip Forward Button | SkipForward icon | Skip forward 15s | Seeks |
| Speed Buttons | 0.5x/1x/1.5x/2x | Change speed | Changes speed |
| Volume Button | Volume icon | Mute/unmute | Toggles mute |
| Volume Slider | Volume slider | Adjust volume | Changes volume |
| Download Button | Download icon | Download recording | Downloads MP3 |

### Footer Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Back to Call Logs Link | "Back to Call Logs" | Return to list | `/call-logs` |

---

## Campaigns (`/campaigns`)

**Summary:** Email and SMS campaign management.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Create Campaign Button | "Create Campaign" (Plus icon) | Create campaign | `/campaigns/new` |

### Stats Cards

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Active Campaigns Card | Count | Display only | - |
| Total Enrolled Card | Count | Display only | - |
| Completed Card | Count | Display only | - |
| Revenue Card | Currency | Display only | - |

### Tab Filter

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| All Tab | "All" | Show all | Filters list |
| Draft Tab | "Draft" | Show drafts | Filters list |
| Active Tab | "Active" | Show active | Filters list |
| Paused Tab | "Paused" | Show paused | Filters list |
| Archived Tab | "Archived" | Show archived | Filters list |

### Campaign Cards

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Card Click | Entire card | Open campaign | `/campaigns/{id}/builder` |
| More Menu | MoreVertical icon | Open menu | Opens menu |
| Edit Campaign | Menu item | Edit campaign | `/campaigns/{id}/builder` |
| Duplicate | Menu item | Duplicate campaign | Creates copy |
| Pause/Activate | Menu item | Toggle status | Updates status |
| Archive | Menu item | Archive campaign | Archives |

---

## Create Campaign (`/campaigns/new`)

**Summary:** Form for creating new campaigns.

### Form Fields

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Campaign Name Input | "Campaign Name *" | Enter name | - |
| Description Textarea | "Description" | Enter description | - |
| Campaign Type Dropdown | "Campaign Type *" | Select type | - |
| Goal Type Dropdown | "Goal Type (Optional)" | Select goal | Shows target input |
| Goal Target Input | "Goal Target" | Enter target number | - |
| Cancel Button | "Cancel" | Cancel | `/campaigns` |
| Create Campaign Button | "Create Campaign" | Create | Creates & redirects |

---

# 10. STORM FEATURES

## Storm Tracking (`/storm-tracking`)

**Summary:** Real-time storm monitoring and customer impact tracking.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Refresh Data Button | "Refresh Data" (Refresh icon) | Reload storm data | Refreshes |

### Tab Navigation

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Overview Tab | "Overview" | Show overview | Switches tab |
| Map View Tab | "Map View" | Show full map | Switches tab |
| Affected Customers Tab | "Affected Customers" | Show customers | Switches tab |
| Response Mode Tab | "Response Mode" | Show controls | Switches tab |

### Storm Alerts

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Acknowledge Button | "Acknowledge" | Acknowledge alert | Records ack |
| Dismiss Button | X icon | Dismiss alert | Removes alert |
| Check for Storms Button | "Check for Storms" (empty state) | Check for storms | Refreshes |

### Map View

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Storm Markers | Circle markers | View storm info | Opens info window |
| Customer Markers | Smaller markers | View customer info | Opens info window |
| Map Controls | Zoom/fullscreen | Standard map controls | - |

### Affected Customers

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Search Input | "Search customers..." | Filter customers | Filters list |
| All Filter | "All" | Show all | Filters |
| Urgent Filter | "Urgent" | Show urgent only | Filters |
| High Filter | "High" | Show urgent + high | Filters |
| Phone Button | Phone icon | Contact by phone | Callback |
| Email Button | Mail icon | Contact by email | Callback |

### Response Mode

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Activate/Deactivate Button | "Activate" / "Deactivate" (Zap icon) | Toggle response mode | Toggles |
| Auto Notifications Toggle | Switch | Toggle auto notifications | Updates setting |
| Auto Lead Generation Toggle | Switch | Toggle lead generation | Updates setting |
| Priority Routing Toggle | Switch | Toggle priority routing | Updates setting |
| Crew Pre-Positioning Toggle | Switch | Toggle crew positioning | Updates setting |
| Extended Hours Toggle | Switch | Toggle extended hours | Updates setting |

---

## Storm Targeting (`/storm-targeting`)

**Summary:** Draw areas on map to extract addresses for lead generation.

### Map Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Drawing Manager | Polygon/Rectangle/Circle tools | Draw area on map | Creates shape |
| Map Type Control | Roadmap/Satellite/etc. | Change map type | Changes type |
| Fullscreen Control | Fullscreen button | Toggle fullscreen | Toggles |

### Area Selection (Left Panel)

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| ZIP Code Input | "e.g., 37660" | Enter ZIP code | - |
| Load Button | "Load" | Load ZIP boundary | Draws polygon |
| Area Name Input | Area name | Enter area name | - |
| Extract Addresses Button | "Extract Addresses" (Zap icon) | Extract addresses | Extracts |
| Clear Drawing Button | "Clear" | Clear drawing | Clears |

### Results (Right Panel)

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Export to CSV Button | "Export to CSV (X addresses)" (Download icon) | Download CSV | Downloads |
| Import to Contacts Button | "Import to Contacts (X addresses)" (Users icon) | Bulk import | Imports |

---

## Storm Leads Management (`/storm-targeting/leads`)

**Summary:** Manage and enrich addresses from storm targeting.

### Targeting Areas (Left Panel)

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Area Selection Buttons | Area names | Select area | Loads addresses |

### Actions (Right Panel)

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Download CSV Template Button | "Download CSV Template" (Download icon) | Download template | Downloads |
| Upload Enrichment CSV Button | "Upload Enrichment CSV" (Upload icon) | Upload CSV | Opens picker |
| Import Enriched Contacts Button | "Import X Enriched Contacts" (Users icon) | Import contacts | Imports |

### Filter Buttons

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| All Filter | "All" | Show all | Filters |
| Enriched Filter | "Enriched" | Show enriched | Filters |
| Need Data Filter | "Need Data" | Show non-enriched | Filters |

---

# 11. BUSINESS FEATURES

## Incentives (`/incentives`)

**Summary:** Gamification, points, challenges, and leaderboards.

### Points Display

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Progress Bar | Visual bar | Display only | - |
| Daily/Weekly/Monthly Stats | Point counts | Display only | - |

### Weekly Challenge

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| View Leaderboard Button | "View Leaderboard" (TrendingUp icon) | View leaderboard | Opens leaderboard |
| Calendar Button | Calendar icon | TBD | TBD |

### Leaderboards

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Period Selector - Daily | "Daily" | Filter to daily | Updates |
| Period Selector - Weekly | "Weekly" | Filter to weekly | Updates |
| Period Selector - Monthly | "Monthly" | Filter to monthly | Updates |
| Period Selector - All | "All" | Filter to all-time | Updates |

---

## Insights (`/insights`)

**Summary:** AI-powered business intelligence and data queries.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Ask a Question Button | "Ask a Question" (Plus icon) | Open query modal | Opens modal |
| New Query Button | "New Query" (Sparkles icon) ⌘⇧K | Open query modal | Opens modal |
| Favorite Query Buttons | Starred queries | Run query | Submits query |

### Tab Navigation

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Explore Tab | "Explore" (TrendingUp icon) | Show suggestions | Switches tab |
| Results Tab | "Results" (Sparkles icon) | Show results | Switches tab |
| History Tab | "History" (Clock icon) | Show history | Switches tab |

### Explore Tab

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Category Filter - All | "All Categories" | Show all | Filters |
| Category Filter Buttons | Category names | Filter by category | Filters |
| Suggestion Cards | Query suggestions | Run query | Submits |
| Ask This Question Button | "Ask This Question" | Run query | Submits |
| Quick Action Buttons | Role-specific queries | Run query | Submits |

### Results Tab

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Add to Favorites Button | "Add to Favorites" / "Favorited" (Star icon) | Toggle favorite | Toggles |
| More Menu | MoreVertical icon | Open menu | Opens menu |
| Export as CSV | Menu item | Export CSV | Downloads |
| Export as PDF | Menu item | Export PDF | Downloads |
| View SQL | Menu item | View SQL | Opens modal |
| Copy Query | Menu item | Copy query | Copies |

### History Tab

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Search Input | "Search queries..." | Filter history | Filters |
| Filter Dropdown | All/Favorites/Successful/Failed | Filter by status | Filters |
| Time Range Dropdown | All Time/Today/This Week/This Month | Filter by time | Filters |
| Sort Dropdown | Newest/Oldest/Fastest/Slowest/A-Z | Sort results | Sorts |
| Play Button | Play icon | Rerun query | Runs query |
| Star Toggle Button | Star icon | Toggle favorite | Toggles |
| View Results | Menu item | View results | Shows results |
| Export Data | Menu item | Export data | Downloads |
| Delete | Menu item | Delete query | Deletes |
| Load More Button | "Load more" (ChevronDown icon) | Load more | Loads more |

### Query Input Modal

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Query Input | "Ask a question about your data..." | Enter query | - |
| Favorite Query Items | Starred queries | Run query | Submits |
| Recent Query Items | Recent queries | Run query | Submits |
| Suggestion Items | Suggested queries | Run query | Submits |
| Custom Query Option | "Ask: "{query}"" | Run custom query | Submits |

---

## Financials (`/financials`)

**Summary:** Profit & loss reporting and job costing analysis.

### Summary Cards

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Total Revenue Card | Revenue amount | Display only | - |
| Total Costs Card | Costs amount | Display only | - |
| Gross Profit Card | Profit amount | Display only | - |
| Project Performance Card | Profitable count | Display only | - |

### P&L Table

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Table Rows | Project P&L data | Display only | - |

### Variance Analysis

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Variance Items | Project variances | Display only | - |

---

## Automations (`/automations`)

**Summary:** Workflow automation management.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Create Workflow Button | "Create Workflow" (Plus icon) | Create workflow | `/automations/new` |

### Stats Cards

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Active Workflows Card | Count | Display only | - |
| Total Executions Card | Count | Display only | - |
| Success Rate Card | Percentage | Display only | - |
| Time Saved Card | Hours | Display only | - |

### Tab Navigation

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| My Workflows Tab | "My Workflows" | Show workflows | Switches tab |
| Templates Tab | "Templates" | Show templates | Switches tab |
| Recent Executions Tab | "Recent Executions" | Show executions | Switches tab |

### My Workflows Tab

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Search Input | "Search workflows..." | Filter workflows | Filters |
| Workflow Name Link | Workflow name | View workflow | `/automations/{id}` |
| Pause/Resume Button | "Pause" / "Resume" (Pause/Play icon) | Toggle status | Toggles |
| Settings Button | Settings icon | Open settings | Opens settings |
| More Menu Button | MoreHorizontal icon | Open menu | Opens menu |

### Templates Tab

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Template Cards | Template info | Display only | - |
| Use Template Button | "Use Template" | Create from template | Creates |

---

## Workflow Detail (`/automations/{id}`)

**Summary:** View and edit a specific workflow.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Back Button | "Back" (ArrowLeft icon) | Return to list | `/automations` |
| Pause/Activate Button | "Pause" / "Activate" (Pause/Play icon) | Toggle status | Toggles |
| Duplicate Button | "Duplicate" (Copy icon) | Duplicate workflow | Creates copy |
| Delete Button | "Delete" (Trash2 icon) | Delete workflow | Confirms |

### Tab Navigation

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Workflow Builder Tab | "Workflow Builder" | Show builder | Switches tab |
| Execution History Tab | "Execution History" | Show history | Switches tab |
| Analytics Tab | "Analytics" | Show analytics | Switches tab |

### Workflow Builder Tab

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Name Input | Workflow name | Edit name | - |
| Description Textarea | Description | Edit description | - |
| Test Button | "Test" (Play icon) | Test workflow | Runs test |
| Save Button | "Save" (Save icon) | Save changes | Saves |
| Trigger Cards | Trigger types | Select trigger | Selects |
| Add Action Button | Plus icon | Add action | Shows panel |
| Action Cards | Action types | Add action | Adds |
| Action Nodes | Draggable actions | Reorder/edit | Updates |
| Edit Action Button | Settings icon | Edit action | Opens edit |
| Delete Action Button | Trash2 icon | Delete action | Deletes |
| Enable/Disable Toggle | Eye/EyeOff icon | Toggle action | Toggles |

---

# 12. SETTINGS

## Settings Hub (`/settings`)

**Summary:** Central settings page with tabs for all configuration options.

### Tab Navigation

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| General Tab | "General" (Settings icon) | Show general | Switches tab |
| Appearance Tab | "Appearance" (Monitor icon) | Show appearance | Switches tab |
| Branding Tab | "Branding" (Palette icon) | Show branding | Switches tab |
| Pipeline Tab | "Pipeline" (Workflow icon) | Show pipeline | Switches tab |
| Templates Tab | "Templates" (File icon) | Show templates | Switches tab |
| Roles Tab | "Roles" (Shield icon) | Show roles | Switches tab |
| Security Tab | "Security" (Shield icon) | Show security | Switches tab |
| Substatuses Tab | "Substatuses" (Tag icon) | Show substatuses | Switches tab |
| Automations Tab | "Automations" (Zap icon) | Show automations | Switches tab |
| Compliance Tab | "Compliance" (Phone icon) | Show compliance | Switches tab |
| Incentives Tab | "Incentives" (Trophy icon) | Show incentives | Switches tab |
| Integrations Tab | "Integrations" (Plug icon) | Show integrations | Switches tab |

### Automations Tab

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Go to Automations Button | "Go to Automations" | Navigate | `/automations` |

---

## Profile Settings (`/settings/profile`)

**Summary:** Personal profile, notifications, and security settings.

### Tab Navigation

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Profile Tab | "Profile" (User icon) | Show profile | Switches tab |
| Notifications Tab | "Notifications" (Bell icon) | Show notifications | Switches tab |
| Security Tab | "Security" (Lock icon) | Show security | Switches tab |

### Profile Tab

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Upload Photo Button | "Upload Photo" (Upload icon) | Upload photo | Opens picker |
| Delete Photo Button | "Delete" (Trash icon) | Delete photo | Confirms |
| Full Name Input | "Full Name" | Edit name | - |
| Phone Number Input | "Phone Number" | Edit phone | - |
| Job Title Input | "Job Title" | Edit title | - |
| Bio Textarea | "Bio" | Edit bio | - |
| Email Field | "Email" (disabled) | Display only | - |
| Save Changes Button | "Save Changes" | Save profile | Saves |
| Street Address Input | "Street Address" | Edit address | - |
| City Input | "City" | Edit city | - |
| State Dropdown | "State" | Select state | - |
| ZIP Code Input | "ZIP Code" | Edit ZIP | - |
| Save Address Button | "Save Address" | Save address | Saves |
| Timezone Dropdown | "Your Timezone" | Select timezone | - |
| Save Timezone Button | "Save Timezone" | Save timezone | Saves |

### Notifications Tab

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Notification Toggles | Various switches | Toggle settings | Updates |
| Enable Quiet Hours Toggle | Switch | Toggle quiet hours | Shows times |
| Start Time Input | Time picker | Set start time | - |
| End Time Input | Time picker | Set end time | - |
| Save Preferences Button | "Save Preferences" | Save settings | Saves |

### Security Tab

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Enable 2FA Button | "Enable 2FA" (Shield icon) | Start 2FA setup | Opens dialog |
| Disable 2FA Button | "Disable 2FA" (ShieldOff icon) | Disable 2FA | Confirms |
| Current Password Input | "Current Password" | Enter password | - |
| New Password Input | "New Password" | Enter new password | - |
| Confirm Password Input | "Confirm New Password" | Confirm password | - |
| Change Password Button | "Change Password" | Change password | Changes |
| Session Sign Out Button | "Sign out" (per session) | Sign out session | Signs out |
| Sign Out All Button | "Sign out all other devices" | Sign out all | Confirms |
| Refresh Sessions Button | RefreshCw icon | Refresh list | Refreshes |
| Refresh Activity Button | RefreshCw icon | Refresh list | Refreshes |
| Load More Button | "Load more" | Load more activity | Loads |

### 2FA Setup Dialog

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| QR Code | Image | Scan with app | - |
| Secret Key | Masked input | Copy manually | - |
| Copy Button | Copy icon | Copy secret | Copies |
| Show/Hide Secret Link | "Show secret" / "Hide secret" | Toggle visibility | Toggles |
| 6-Digit Code Input | Code input | Enter code | - |
| Cancel Button | "Cancel" | Cancel setup | Closes |
| Verify & Enable Button | "Verify & Enable" | Complete setup | Enables |
| Copy All Codes Button | "Copy All Codes" (Copy icon) | Copy recovery codes | Copies |
| I've Saved My Codes Button | "I've Saved My Codes" | Complete setup | Closes |

---

## Language Settings (`/settings/language`)

**Summary:** Language and regional settings.

### Language Selection

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Language Dropdown | Language options | Change language | Changes locale |

---

## Lead Scoring Settings (`/settings/scoring`)

**Summary:** Configure AI-powered lead scoring rules.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Reset to Defaults Button | "Reset to Defaults" (RotateCcw icon) | Reset config | Resets |
| Save Changes Button | "Save Changes" (Save icon) | Save config | Saves |

### Tab Navigation

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| General Tab | "General" | Show general | Switches tab |
| Property Values Tab | "Property Values" | Show property config | Switches tab |
| Roof Age Tab | "Roof Age" | Show roof config | Switches tab |
| Lead Sources Tab | "Lead Sources" | Show sources | Switches tab |
| Category Weights Tab | "Category Weights" | Show weights | Switches tab |
| Score Thresholds Tab | "Score Thresholds" | Show thresholds | Switches tab |

### General Tab

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Enable Lead Scoring Toggle | Switch | Toggle enabled | Updates |
| Auto-Update Scores Toggle | Switch | Toggle auto-update | Updates |

### Configuration Tabs

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Various Number Inputs | Config values | Edit values | Updates config |
| Various Text Inputs | Config labels | Edit labels | Updates config |

---

## Digital Business Card (`/settings/my-card`)

**Summary:** Create and manage digital business card.

### Header Section

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Back Button | "Back to Settings" (ArrowLeft icon) | Return to settings | `/settings` |
| Preview Button | "Preview" (Eye icon) | Preview card | Opens new tab |
| Save Changes Button | "Save Changes" (Save icon) | Save card | Saves |
| Create Card Button | "Create Card" | Create new card | Creates |

### Tab Navigation

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Editor Tab | "Editor" | Show editor | Switches tab |
| Share Tab | "Share" | Show sharing | Switches tab |
| Analytics Tab | "Analytics" | Show analytics | Switches tab |

### Editor Tab

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Full Name Input | "Full Name *" | Edit name | - |
| Job Title Input | "Job Title" | Edit title | - |
| Phone Input | "Phone" | Edit phone | - |
| Email Input | "Email" | Edit email | - |
| Company Name Input | "Company Name" | Edit company | - |
| Company Phone Input | "Company Phone" | Edit phone | - |
| Company Email Input | "Company Email" | Edit email | - |
| Company Website Input | "Company Website" | Edit website | - |
| Company Address Textarea | "Company Address" | Edit address | - |
| LinkedIn Input | "LinkedIn" | Edit URL | - |
| Facebook Input | "Facebook" | Edit URL | - |
| Instagram Input | "Instagram" | Edit URL | - |
| Twitter/X Input | "Twitter/X" | Edit URL | - |
| Tagline Input | "Tagline" | Edit tagline | - |
| Bio Textarea | "Bio" | Edit bio | - |
| Services Input | "Services" | Edit services | - |
| Color Preset Buttons | Color swatches | Select color | Selects |
| Custom Color Picker | Color input | Pick custom color | Selects |
| Enable Contact Form Toggle | "Enabled" / "Disabled" | Toggle form | Toggles |
| Enable Booking Toggle | "Enabled" / "Disabled" | Toggle booking | Toggles |

### Share Tab

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Copy URL Button | Copy icon | Copy URL | Copies |
| Open URL Button | ExternalLink icon | Open card | Opens tab |
| Download QR Code Button | "Download QR Code" (Download icon) | Download QR | Downloads |

### Analytics Tab

| Element | Label | Action | Navigation |
|---------|-------|--------|------------|
| Stats Cards | View/download/click counts | Display only | - |
| Interactions List | Interaction breakdown | Display only | - |

---

# APPENDIX: NAVIGATION QUICK REFERENCE

## Main Routes

| Route | Page | Section |
|-------|------|---------|
| `/dashboard` | Dashboard | Core |
| `/projects` | Pipeline/Projects | Core |
| `/contacts` | Contacts | Core |
| `/signatures` | Signatures | Core |
| `/tasks` | Tasks | Core |
| `/events` | Events | Core |
| `/knocks` | Door Knocking | Sales |
| `/claims` | Claims | Sales |
| `/messages` | Messages | Communications |
| `/call-logs` | Call Logs | Communications |
| `/campaigns` | Campaigns | Communications |
| `/storm-tracking` | Storm Intel | Sales |
| `/storm-targeting` | Lead Gen | Sales |
| `/incentives` | Incentives | Business |
| `/insights` | Business Intel | Business |
| `/financials` | Financials | Business |
| `/automations` | Automations | Business |
| `/settings` | Settings Hub | Settings |
| `/settings/profile` | Profile Settings | Settings |
| `/settings/language` | Language Settings | Settings |
| `/settings/scoring` | Lead Scoring | Settings |
| `/settings/my-card` | Digital Business Card | Settings |

---

## Common Workflows

### Create New Lead
1. Navigate to `/contacts` or `/contacts/new`
2. Fill out contact form
3. Click "Create Contact"
4. Optional: Add to project pipeline

### Log Door Knock
1. Navigate to `/knocks`
2. Click "Log Knock" or "Drop Pins"
3. Get location / select on map
4. Select disposition
5. Optional: Create contact

### Send Signature Document
1. Navigate to `/signatures/new`
2. Select or skip template
3. Fill document info
4. Upload PDF or use template
5. Place signature fields
6. Review and create
7. Navigate to document and click "Send"

### Process Insurance Claim
1. Navigate to `/projects/{id}/claims`
2. Click "Start Inspection"
3. Complete inspection wizard
4. View claim detail
5. Manage documents
6. Update status through workflow

### Create Automation
1. Navigate to `/automations/new`
2. Select trigger type
3. Add actions
4. Configure each action
5. Save workflow
6. Test and activate

---

**Document End**

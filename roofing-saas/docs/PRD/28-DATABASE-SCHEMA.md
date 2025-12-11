# Database Schema

## Overview

The Roofing SAAS application uses PostgreSQL via Supabase as its primary database. The schema implements a multi-tenant architecture with Row-Level Security (RLS) policies ensuring complete data isolation between tenants. The database is designed to support a comprehensive CRM platform with features including contact management, project tracking, campaign automation, gamification, and various third-party integrations.

## User Stories

- As a **system administrator**, I want tenant data to be completely isolated so that no organization can access another's data
- As a **developer**, I want consistent schema patterns (tenant_id, created_at, updated_at, is_deleted) so that I can write predictable code
- As a **business owner**, I want soft-delete patterns so that data can be recovered if accidentally deleted
- As a **field rep**, I want fast queries for contacts, territories, and knocks so that the mobile app responds quickly
- As a **office staff**, I want comprehensive activity logging so that I can track all customer interactions

## Database Architecture

### PostgreSQL Extensions

| Extension | Purpose |
|-----------|---------|
| `uuid-ossp` | UUID generation for primary keys |
| `pg_trgm` | Fuzzy text search for contact lookup |
| `vector` | AI embeddings for knowledge base RAG |
| `pg_cron` | Scheduled jobs for background tasks |
| `postgis` | Geospatial queries for territories and storm targeting |
| `earthdistance` | Distance calculations for proximity searches |

### Multi-Tenant Architecture

The database uses a **shared schema, shared database** approach where all tenants share the same tables. Data isolation is enforced through:

1. **`tenant_id` Foreign Key**: Every tenant-owned table includes a `tenant_id` column referencing the `tenants` table
2. **Row-Level Security (RLS)**: PostgreSQL policies restrict access to rows where `tenant_id` matches the authenticated user's tenant
3. **Helper Function**: `get_user_tenant_id()` retrieves the current user's tenant for policy evaluation

```sql
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM tenant_users
  WHERE user_id = auth.uid()
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## Table Categories

The database schema is organized into the following functional categories:

1. **Tenant Management** (2 tables) - Multi-tenant infrastructure
2. **Core CRM** (4 tables) - Contacts, projects, activities, documents
3. **Territory & Canvassing** (2 tables) - Field operations
4. **Production Management** (1 table) - Job/crew scheduling
5. **Communications** (1 table) - Call logging
6. **Campaign Automation** (6 tables) - Marketing campaigns
7. **Gamification** (2 tables) - Points, achievements, leaderboards
8. **Integrations** (3 tables) - QuickBooks sync
9. **Storm Targeting** (5 tables) - Lead generation system
10. **Voice AI** (3 tables) - Voice assistant sessions
11. **Configuration** (3 tables) - Filters and settings
12. **Reporting** (2 tables) - KPIs and scheduled reports
13. **Financial** (2 tables) - Commissions

---

## Table Schemas

### 1. Tenant Management

#### `tenants`
Master table for organizations using the platform.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(255) | Organization name |
| subdomain | VARCHAR(100) | Unique subdomain for tenant |
| custom_domain | VARCHAR(255) | Optional custom domain |
| settings | JSONB | Tenant-specific settings |
| features | JSONB | Feature flags (max_users, max_contacts) |
| subscription_status | VARCHAR(50) | trial, active, suspended |
| subscription_expires_at | TIMESTAMPTZ | Subscription expiry |
| logo_url | VARCHAR(500) | Branding logo URL |
| primary_color | VARCHAR(7) | Hex color for branding |
| is_active | BOOLEAN | Whether tenant is active |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### `tenant_users`
Junction table linking users to tenants with roles.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| user_id | UUID | FK to auth.users |
| role | VARCHAR(50) | admin, manager, member, viewer |
| joined_at | TIMESTAMPTZ | When user joined tenant |

**Unique Constraint:** `(tenant_id, user_id)`

---

### 2. Core CRM Tables

#### `contacts`
Central CRM table for leads, prospects, and customers.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants (RLS enforced) |
| first_name | VARCHAR(100) | Contact first name |
| last_name | VARCHAR(100) | Contact last name |
| email | VARCHAR(255) | Email address (unique per tenant) |
| phone | VARCHAR(20) | Primary phone |
| mobile_phone | VARCHAR(20) | Mobile phone |
| address_street | VARCHAR(255) | Street address |
| address_city | VARCHAR(100) | City |
| address_state | VARCHAR(2) | State code |
| address_zip | VARCHAR(10) | ZIP code |
| latitude | DECIMAL(10,8) | Geocoded latitude |
| longitude | DECIMAL(11,8) | Geocoded longitude |
| type | VARCHAR(50) | lead, customer, prospect |
| stage | VARCHAR(50) | new, contacted, qualified, proposal, won, lost |
| source | VARCHAR(100) | website, referral, door-knock, etc. |
| assigned_to | UUID | FK to auth.users |
| property_type | VARCHAR(50) | residential, commercial, multi-family |
| roof_type | VARCHAR(100) | Shingle, metal, tile, etc. |
| roof_age | INTEGER | Years since last roof |
| insurance_carrier | VARCHAR(100) | Insurance company name |
| policy_number | VARCHAR(100) | Insurance policy number |
| claim_number | VARCHAR(100) | Insurance claim number |
| deductible | DECIMAL(10,2) | Insurance deductible amount |
| lead_score | INTEGER | AI-calculated lead score |
| priority | VARCHAR(20) | low, normal, high, urgent |
| custom_fields | JSONB | Tenant-specific custom fields |
| tags | TEXT[] | Array of tag strings |
| search_vector | tsvector | Full-text search vector |
| is_deleted | BOOLEAN | Soft delete flag |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |
| created_by | UUID | FK to auth.users |

**Key Indexes:**
- `idx_contacts_tenant` - Tenant isolation
- `idx_contacts_stage` - Pipeline filtering
- `idx_contacts_assigned` - Assignment queries
- `idx_contacts_search` (GIN) - Full-text search
- `idx_contacts_full_text` (GIN) - Search vector

#### `projects`
Sales projects and deals linked to contacts.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| contact_id | UUID | FK to contacts |
| parent_project_id | UUID | FK to projects (for supplementals) |
| name | VARCHAR(255) | Project name |
| project_number | VARCHAR(50) | Auto-generated number |
| status | VARCHAR(50) | estimate, approved, scheduled, in_progress, completed, cancelled |
| type | VARCHAR(50) | repair, replacement, maintenance, emergency |
| estimated_value | DECIMAL(12,2) | Initial estimate |
| approved_value | DECIMAL(12,2) | Approved amount |
| final_value | DECIMAL(12,2) | Final invoiced amount |
| materials_cost | DECIMAL(12,2) | Material costs |
| labor_cost | DECIMAL(12,2) | Labor costs |
| estimated_start | DATE | Planned start date |
| actual_start | DATE | Actual start date |
| estimated_completion | DATE | Planned completion |
| actual_completion | DATE | Actual completion |
| description | TEXT | Project description |
| scope_of_work | TEXT | Detailed work scope |
| insurance_approved | BOOLEAN | Insurance approval status |
| quickbooks_id | VARCHAR(100) | QuickBooks invoice ID |
| custom_fields | JSONB | Custom fields |
| is_deleted | BOOLEAN | Soft delete flag |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |
| created_by | UUID | FK to auth.users |

#### `activities`
All customer interactions and communications.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| contact_id | UUID | FK to contacts |
| project_id | UUID | FK to projects |
| type | VARCHAR(50) | call, email, sms, meeting, note, task, door_knock |
| subtype | VARCHAR(50) | inbound, outbound, follow_up |
| subject | VARCHAR(255) | Activity subject |
| content | TEXT | Activity content/notes |
| direction | VARCHAR(10) | inbound, outbound |
| from_address | VARCHAR(255) | Sender address |
| to_address | VARCHAR(255) | Recipient address |
| outcome | VARCHAR(100) | Activity outcome |
| duration_seconds | INTEGER | Call/meeting duration |
| recording_url | VARCHAR(500) | Call recording URL |
| transcript | TEXT | Call transcript |
| scheduled_at | TIMESTAMPTZ | Scheduled time |
| completed_at | TIMESTAMPTZ | Completion time |
| external_id | VARCHAR(100) | Twilio SID, email ID |
| created_at | TIMESTAMPTZ | Creation timestamp |
| created_by | UUID | FK to auth.users |

#### `documents`
File attachments and media.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| entity_type | VARCHAR(50) | contact, project, activity |
| entity_id | UUID | Polymorphic FK |
| name | VARCHAR(255) | File name |
| file_url | VARCHAR(500) | Supabase Storage URL |
| file_size | INTEGER | File size in bytes |
| mime_type | VARCHAR(100) | MIME type |
| type | VARCHAR(50) | photo, contract, invoice, report |
| tags | TEXT[] | File tags |
| ai_description | TEXT | AI-generated description |
| damage_detected | BOOLEAN | AI damage detection |
| version | INTEGER | Document version |
| created_at | TIMESTAMPTZ | Upload timestamp |
| created_by | UUID | FK to auth.users |

---

### 3. Territory & Canvassing

#### `territories`
Geographic territories for field rep assignment.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| name | TEXT | Territory name |
| description | TEXT | Territory description |
| assigned_to | UUID | FK to auth.users |
| boundary | JSONB | GeoJSON Polygon coordinates |
| center_latitude | DECIMAL(10,8) | Center point latitude |
| center_longitude | DECIMAL(11,8) | Center point longitude |
| color | TEXT | Hex color for map (#3B82F6) |
| stroke_color | TEXT | Border color |
| opacity | DECIMAL(3,2) | Fill opacity (0.00-1.00) |
| status | TEXT | active, inactive, archived |
| total_knocks | INTEGER | Auto-calculated knock count |
| last_activity_at | TIMESTAMPTZ | Last knock timestamp |
| is_deleted | BOOLEAN | Soft delete flag |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |
| created_by | UUID | FK to auth.users |

#### `knocks`
Door-knocking activity tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| user_id | UUID | FK to auth.users (who knocked) |
| latitude | DECIMAL(10,8) | GPS latitude |
| longitude | DECIMAL(11,8) | GPS longitude |
| address | TEXT | Full address |
| address_street | TEXT | Street address |
| address_city | TEXT | City |
| address_state | TEXT | State |
| address_zip | TEXT | ZIP code |
| disposition | TEXT | not_home, interested, not_interested, appointment, callback, do_not_contact, already_customer |
| notes | TEXT | Knock notes |
| photos | TEXT[] | Photo URLs array |
| voice_memo_url | TEXT | Voice note URL |
| appointment_date | TIMESTAMPTZ | If appointment set |
| callback_date | DATE | If callback scheduled |
| contact_id | UUID | FK to contacts (if created) |
| contact_created | BOOLEAN | Whether contact was created |
| territory_id | UUID | FK to territories |
| device_location_accuracy | DECIMAL(6,2) | GPS accuracy in meters |
| knocked_from | TEXT | mobile, tablet |
| is_deleted | BOOLEAN | Soft delete flag |
| created_at | TIMESTAMPTZ | Knock timestamp |

**Disposition Values:**
- `not_home` - Nobody answered
- `interested` - Interested in services
- `not_interested` - Not interested
- `appointment` - Appointment scheduled
- `callback` - Requested callback
- `do_not_contact` - Do not contact again
- `already_customer` - Existing customer

---

### 4. Production Management

#### `jobs`
Production jobs linked to projects (crew scheduling).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| project_id | UUID | FK to projects |
| job_number | TEXT | Auto-generated (YY-####) |
| job_type | TEXT | roof_replacement, roof_repair, inspection, maintenance, emergency, other |
| scheduled_date | DATE | Scheduled work date |
| scheduled_start_time | TIME | Start time |
| scheduled_end_time | TIME | End time |
| estimated_duration_hours | DECIMAL(5,2) | Estimated hours |
| actual_start_at | TIMESTAMPTZ | Actual start |
| actual_end_at | TIMESTAMPTZ | Actual end |
| actual_duration_hours | DECIMAL(5,2) | Actual hours (calculated) |
| completion_percentage | INTEGER | 0-100 progress |
| crew_lead | UUID | FK to auth.users |
| crew_members | UUID[] | Array of user IDs |
| crew_size | INTEGER | Number of crew |
| status | TEXT | scheduled, in_progress, on_hold, completed, cancelled |
| weather_delay_days | INTEGER | Days delayed due to weather |
| scope_of_work | TEXT | Work description |
| materials_needed | JSONB | Materials list |
| quality_score | INTEGER | 1-10 quality rating |
| before_photos | TEXT[] | Before photo URLs |
| during_photos | TEXT[] | Progress photo URLs |
| after_photos | TEXT[] | Completion photo URLs |
| customer_signature_url | TEXT | E-signature URL |
| labor_cost | DECIMAL(10,2) | Labor cost |
| material_cost | DECIMAL(10,2) | Material cost |
| total_cost | DECIMAL(10,2) | Auto-calculated total (GENERATED) |
| is_deleted | BOOLEAN | Soft delete flag |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |
| created_by | UUID | FK to auth.users |

**Generated Column:**
```sql
total_cost DECIMAL(10, 2) GENERATED ALWAYS AS (
  COALESCE(labor_cost, 0) +
  COALESCE(material_cost, 0) +
  COALESCE(equipment_cost, 0) +
  COALESCE(other_costs, 0)
) STORED
```

---

### 5. Communications

#### `call_logs`
Phone call tracking with recordings and transcription.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| contact_id | UUID | FK to contacts |
| project_id | UUID | FK to projects |
| user_id | UUID | FK to auth.users |
| direction | TEXT | inbound, outbound |
| phone_number | TEXT | E.164 format (+14235551234) |
| from_number | TEXT | Calling number |
| to_number | TEXT | Receiving number |
| twilio_call_sid | TEXT | Twilio Call SID (unique) |
| twilio_status | TEXT | queued, ringing, in-progress, completed, busy, failed, no-answer, canceled |
| duration | INTEGER | Duration in seconds |
| started_at | TIMESTAMPTZ | Call start time |
| ended_at | TIMESTAMPTZ | Call end time |
| recording_url | TEXT | Recording URL |
| recording_duration | INTEGER | Recording duration |
| recording_sid | TEXT | Twilio Recording SID |
| transcription | TEXT | Full transcription |
| transcription_confidence | DECIMAL(3,2) | 0.00-1.00 confidence |
| transcription_provider | TEXT | twilio, whisper, deepgram |
| summary | TEXT | AI-generated summary |
| sentiment | TEXT | positive, neutral, negative |
| key_points | TEXT[] | Discussion key points |
| outcome | TEXT | answered, voicemail, busy, no_answer, failed |
| disposition | TEXT | qualified, not_interested, callback, appointment_set |
| notes | TEXT | Manual notes |
| follow_up_required | BOOLEAN | Follow-up flag |
| follow_up_date | DATE | Follow-up date |
| is_deleted | BOOLEAN | Soft delete flag |
| created_at | TIMESTAMPTZ | Creation timestamp |

---

### 6. Campaign Automation (6 Tables)

#### `campaigns`
Marketing campaign definitions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| name | VARCHAR(255) | Campaign name |
| description | TEXT | Campaign description |
| campaign_type | VARCHAR(50) | drip, event, reengagement, retention, nurture |
| status | VARCHAR(20) | draft, active, paused, archived |
| goal_type | VARCHAR(50) | appointments, deals, reviews, engagement |
| goal_target | INTEGER | Target goal number |
| allow_re_enrollment | BOOLEAN | Allow re-enrollment |
| respect_business_hours | BOOLEAN | Send only during business hours |
| business_hours | JSONB | {start, end, days} |
| enrollment_type | VARCHAR(20) | automatic, manual |
| max_enrollments | INTEGER | Optional cap |
| total_enrolled | INTEGER | Cached count |
| total_completed | INTEGER | Cached count |
| total_revenue | DECIMAL(12,2) | Attributed revenue |
| is_deleted | BOOLEAN | Soft delete flag |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |
| created_by | UUID | FK to auth.users |

#### `campaign_triggers`
Define when campaigns auto-enroll contacts.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| campaign_id | UUID | FK to campaigns |
| trigger_type | VARCHAR(50) | stage_change, time_based, event, manual |
| trigger_config | JSONB | Trigger configuration |
| enrollment_conditions | JSONB | Conditions to enroll |
| exclusion_conditions | JSONB | Conditions to exclude |
| priority | INTEGER | Trigger priority |
| is_active | BOOLEAN | Active flag |
| created_at | TIMESTAMPTZ | Creation timestamp |

#### `campaign_steps`
Sequential actions in a campaign.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| campaign_id | UUID | FK to campaigns |
| parent_step_id | UUID | FK to campaign_steps (branching) |
| step_order | INTEGER | Execution order |
| step_type | VARCHAR(50) | send_email, send_sms, create_task, wait, update_field, manage_tags, notify, webhook, conditional, exit_campaign |
| step_config | JSONB | Step configuration |
| delay_value | INTEGER | Delay amount |
| delay_unit | VARCHAR(20) | hours, days, weeks |
| conditions | JSONB | Conditional logic |
| true_path_step_id | UUID | Branch if true |
| false_path_step_id | UUID | Branch if false |
| total_executed | INTEGER | Cached count |
| total_succeeded | INTEGER | Cached count |
| total_failed | INTEGER | Cached count |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### `campaign_enrollments`
Track contact enrollment in campaigns.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| campaign_id | UUID | FK to campaigns |
| tenant_id | UUID | FK to tenants |
| contact_id | UUID | FK to contacts |
| enrollment_source | VARCHAR(50) | automatic_trigger, manual_admin, api, bulk_import |
| status | VARCHAR(20) | active, completed, exited, paused, failed |
| current_step_id | UUID | FK to campaign_steps |
| current_step_order | INTEGER | Current step number |
| exit_reason | VARCHAR(50) | completed, goal_achieved, unsubscribed, etc. |
| steps_completed | INTEGER | Count of completed steps |
| emails_sent | INTEGER | Email count |
| emails_opened | INTEGER | Open count |
| sms_sent | INTEGER | SMS count |
| goal_achieved | BOOLEAN | Goal reached flag |
| revenue_attributed | DECIMAL(12,2) | Attributed revenue |
| next_step_scheduled_at | TIMESTAMPTZ | Next step time |
| enrolled_at | TIMESTAMPTZ | Enrollment time |
| exited_at | TIMESTAMPTZ | Exit time |
| completed_at | TIMESTAMPTZ | Completion time |

**Unique Constraint:** `(campaign_id, contact_id)` - One enrollment per contact per campaign

#### `campaign_step_executions`
Execution history for campaign steps.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| enrollment_id | UUID | FK to campaign_enrollments |
| step_id | UUID | FK to campaign_steps |
| status | VARCHAR(20) | pending, running, completed, failed, skipped |
| scheduled_at | TIMESTAMPTZ | Scheduled time |
| started_at | TIMESTAMPTZ | Start time |
| completed_at | TIMESTAMPTZ | Completion time |
| result_data | JSONB | Execution result |
| error_message | TEXT | Error if failed |
| opened_at | TIMESTAMPTZ | Email opened |
| clicked_at | TIMESTAMPTZ | Link clicked |
| replied_at | TIMESTAMPTZ | Reply received |
| created_at | TIMESTAMPTZ | Creation timestamp |

#### `campaign_analytics`
Performance snapshots for reporting.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| campaign_id | UUID | FK to campaigns |
| tenant_id | UUID | FK to tenants |
| snapshot_date | DATE | Snapshot date |
| period_type | VARCHAR(20) | daily, weekly, monthly, all_time |
| total_enrolled | INTEGER | Total enrollments |
| emails_sent | INTEGER | Emails sent |
| emails_opened | INTEGER | Emails opened |
| email_open_rate | DECIMAL(5,2) | Open rate % |
| sms_sent | INTEGER | SMS sent |
| goals_achieved | INTEGER | Goals achieved |
| revenue_attributed | DECIMAL(12,2) | Revenue |
| created_at | TIMESTAMPTZ | Creation timestamp |

---

### 7. Gamification

#### `gamification_scores`
User points and level tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| user_id | UUID | FK to auth.users |
| total_points | INTEGER | Lifetime points |
| current_level | INTEGER | Current level |
| points_this_week | INTEGER | Weekly points (resets Monday) |
| points_this_month | INTEGER | Monthly points |
| doors_knocked | INTEGER | Total doors knocked |
| contacts_made | INTEGER | Total contacts created |
| appointments_set | INTEGER | Total appointments |
| deals_closed | INTEGER | Total deals closed |
| achievements | JSONB | Array of earned achievements |
| badges | JSONB | Array of earned badges |
| current_streak_days | INTEGER | Current activity streak |
| longest_streak_days | INTEGER | Best streak |
| last_activity_date | DATE | Last activity date |
| weekly_rank | INTEGER | Leaderboard rank |
| monthly_rank | INTEGER | Leaderboard rank |
| all_time_rank | INTEGER | Leaderboard rank |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Unique Constraint:** `(tenant_id, user_id)`

**Achievements (defined in check_achievements function):**
- `first_steps` - Knock first door (1+ knocks)
- `appointment_setter` - Set first appointment (1+ appointments)
- `closer` - Close first deal (1+ deals)
- `door_warrior` - Knock 100 doors
- `team_player` - Earn 1000 points
- `legend` - Earn 5000 points

#### `gamification_activities`
Points activity log.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| user_id | UUID | FK to auth.users |
| activity_type | VARCHAR(50) | Activity that earned points |
| points_earned | INTEGER | Points awarded |
| entity_type | VARCHAR(50) | Related entity type |
| entity_id | UUID | Related entity ID |
| details | JSONB | Additional context |
| created_at | TIMESTAMPTZ | Activity timestamp |

---

### 8. Integrations

#### `quickbooks_tokens`
OAuth tokens for QuickBooks Online.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants (unique) |
| access_token | TEXT | OAuth access token |
| refresh_token | TEXT | OAuth refresh token |
| realm_id | TEXT | QuickBooks company ID |
| expires_at | TIMESTAMPTZ | Token expiry |
| token_type | TEXT | Bearer |
| company_name | TEXT | QB company name |
| country | TEXT | Company country |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Unique Constraint:** `(tenant_id)` - One QB connection per tenant

#### `quickbooks_sync_logs`
Audit trail for sync operations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| entity_type | TEXT | contact, project, invoice, payment |
| entity_id | UUID | CRM entity ID |
| qb_id | TEXT | QuickBooks entity ID |
| action | TEXT | create, update, delete, fetch |
| direction | TEXT | to_qb, from_qb, bidirectional |
| status | TEXT | success, failed, partial |
| error_message | TEXT | Error if failed |
| error_code | TEXT | Error code |
| request_payload | JSONB | Request data |
| response_payload | JSONB | Response data |
| synced_at | TIMESTAMPTZ | Sync timestamp |
| created_at | TIMESTAMPTZ | Creation timestamp |

#### `quickbooks_mappings`
Link CRM records to QuickBooks records.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| crm_entity_type | TEXT | contact, project |
| crm_entity_id | UUID | CRM entity ID |
| qb_entity_type | TEXT | Customer, Invoice, Payment |
| qb_entity_id | TEXT | QuickBooks ID |
| last_synced_at | TIMESTAMPTZ | Last sync time |
| sync_status | TEXT | synced, needs_sync, conflict |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Unique Constraint:** `(tenant_id, crm_entity_type, crm_entity_id)`

---

### 9. Storm Targeting System (5 Tables)

#### `storm_events`
NOAA storm event data for lead targeting.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to auth.users |
| noaa_event_id | TEXT | NOAA's unique ID (unique) |
| event_date | DATE | Storm date |
| event_type | TEXT | hail, tornado, thunderstorm_wind, flood, other |
| magnitude | DECIMAL | Hail size in inches, wind speed in mph |
| state | TEXT | State code |
| county | TEXT | County name |
| city | TEXT | City name |
| latitude | DECIMAL(10,7) | Event latitude |
| longitude | DECIMAL(10,7) | Event longitude |
| path_length | DECIMAL | Path length in miles |
| path_width | DECIMAL | Path width in miles |
| path_polygon | GEOGRAPHY(POLYGON, 4326) | PostGIS polygon |
| property_damage | BIGINT | USD damage estimate |
| injuries | INTEGER | Injury count |
| deaths | INTEGER | Death count |
| event_narrative | TEXT | Event description |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### `storm_targeting_areas`
User-drawn polygons for address extraction.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to auth.users |
| name | TEXT | Area name |
| description | TEXT | Area description |
| boundary_polygon | GEOGRAPHY(POLYGON, 4326) | PostGIS polygon |
| storm_event_id | UUID | FK to storm_events |
| area_sq_miles | DECIMAL | Calculated area |
| address_count | INTEGER | Extracted addresses |
| estimated_properties | INTEGER | Estimate before extraction |
| status | TEXT | draft, extracting, extracted, enriching, enriched, importing, imported, error |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |
| created_by | UUID | FK to auth.users |

#### `bulk_import_jobs`
Background job tracking for imports.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to auth.users |
| targeting_area_id | UUID | FK to storm_targeting_areas |
| job_type | TEXT | extract_addresses, enrich_properties, import_contacts |
| status | TEXT | pending, processing, completed, failed, cancelled |
| total_items | INTEGER | Total to process |
| processed_items | INTEGER | Processed count |
| successful_items | INTEGER | Success count |
| failed_items | INTEGER | Failed count |
| skipped_items | INTEGER | Skipped (duplicates) |
| created_contacts | INTEGER | Contacts created |
| updated_contacts | INTEGER | Contacts updated |
| error_message | TEXT | Error if failed |
| error_log | JSONB | Error details |
| import_settings | JSONB | Import configuration |
| results | JSONB | Result data |
| started_at | TIMESTAMPTZ | Job start time |
| completed_at | TIMESTAMPTZ | Job completion time |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |
| created_by | UUID | FK to auth.users |

#### `property_enrichment_cache`
Cached property data (shared across tenants).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| address_hash | TEXT | MD5 hash of address (unique) |
| full_address | TEXT | Full address |
| street_address | TEXT | Street address |
| city | TEXT | City |
| state | TEXT | State |
| zip_code | TEXT | ZIP code |
| latitude | DECIMAL(10,7) | Latitude |
| longitude | DECIMAL(10,7) | Longitude |
| provider | TEXT | propertyradar, batchdata, county_assessor, manual |
| provider_id | TEXT | External provider ID |
| owner_name | TEXT | Property owner name |
| owner_phone | TEXT | Owner phone |
| owner_email | TEXT | Owner email |
| property_type | TEXT | residential, commercial, multi-family |
| year_built | INTEGER | Year built |
| square_footage | INTEGER | Square feet |
| bedrooms | INTEGER | Bedroom count |
| bathrooms | DECIMAL(3,1) | Bathroom count |
| assessed_value | BIGINT | Assessed value |
| market_value | BIGINT | Market value |
| roof_material | TEXT | Roof material type |
| roof_age | INTEGER | Roof age in years |
| property_data | JSONB | Raw provider data |
| enriched_at | TIMESTAMPTZ | Enrichment timestamp |
| expires_at | TIMESTAMPTZ | Cache expiry (6 months) |
| hit_count | INTEGER | Cache usage count |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Note:** No RLS - shared cache table

#### `extracted_addresses`
Staging table before import to contacts.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to auth.users |
| targeting_area_id | UUID | FK to storm_targeting_areas |
| bulk_import_job_id | UUID | FK to bulk_import_jobs |
| latitude | DECIMAL(10,7) | Latitude |
| longitude | DECIMAL(10,7) | Longitude |
| full_address | TEXT | Full address |
| street_address | TEXT | Street address |
| city | TEXT | City |
| state | TEXT | State |
| zip_code | TEXT | ZIP code |
| osm_property_type | TEXT | OSM property type |
| osm_building_type | TEXT | OSM building type |
| is_enriched | BOOLEAN | Enrichment status |
| enrichment_cache_id | UUID | FK to property_enrichment_cache |
| is_selected | BOOLEAN | Selected for import |
| skip_reason | TEXT | Reason if skipped |
| is_duplicate | BOOLEAN | Duplicate flag |
| duplicate_contact_id | UUID | Existing contact if duplicate |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

---

### 10. Voice AI (3 Tables)

#### `voice_sessions`
Voice assistant session tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| user_id | UUID | FK to auth.users |
| session_type | VARCHAR(50) | voice, text, phone |
| device_info | JSONB | Device information |
| duration_seconds | INTEGER | Session duration |
| turn_count | INTEGER | Conversation turns |
| commands_executed | INTEGER | Commands run |
| tokens_used | INTEGER | LLM tokens used |
| audio_minutes | DECIMAL(10,2) | Audio processed |
| estimated_cost | DECIMAL(10,4) | Cost estimate |
| created_at | TIMESTAMPTZ | Session start |
| ended_at | TIMESTAMPTZ | Session end |

#### `voice_conversations`
Individual conversation turns.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| session_id | UUID | FK to voice_sessions |
| turn_number | INTEGER | Turn sequence |
| speaker | VARCHAR(20) | user, assistant |
| audio_url | VARCHAR(500) | Audio file URL |
| transcript | TEXT | Text transcript |
| intent | VARCHAR(100) | Detected intent |
| entities | JSONB | Extracted entities |
| response_text | TEXT | Assistant response |
| response_audio_url | VARCHAR(500) | Response audio |
| actions_taken | JSONB | Actions executed |
| confidence_score | DECIMAL(3,2) | Intent confidence |
| processing_time_ms | INTEGER | Processing time |
| created_at | TIMESTAMPTZ | Turn timestamp |

#### `knowledge_base`
AI knowledge base for RAG.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| source_type | VARCHAR(50) | document, faq, training, auto_learned |
| source_id | UUID | Source document ID |
| title | VARCHAR(255) | Content title |
| content | TEXT | Content text |
| embedding | vector(1536) | OpenAI embedding |
| metadata | JSONB | Additional metadata |
| usage_count | INTEGER | Access count |
| last_accessed_at | TIMESTAMPTZ | Last access time |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Vector Index:** `idx_knowledge_embedding (embedding vector_cosine_ops)` - For similarity search

---

### 11. Configuration (3 Tables)

#### `filter_configs`
Configurable filter definitions per entity type.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| entity_type | TEXT | contacts, projects, pipeline, activities |
| field_name | TEXT | Database column name |
| field_label | TEXT | Display label |
| field_type | TEXT | text, select, multi_select, date, date_range, number, number_range, boolean, user_select, tag_select |
| filter_operator | TEXT | equals, not_equals, contains, greater_than, less_than, in, not_in, between, is_null, etc. |
| filter_options | JSONB | Options for select fields |
| display_order | INTEGER | Sort order |
| is_quick_filter | BOOLEAN | Show in quick filters |
| is_advanced_filter | BOOLEAN | Show in advanced panel |
| is_active | BOOLEAN | Active flag |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |
| created_by | UUID | FK to auth.users |

**Unique Constraint:** `(tenant_id, entity_type, field_name)`

#### `saved_filters`
User-saved filter presets.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| entity_type | TEXT | contacts, projects, pipeline, activities |
| name | TEXT | Filter name |
| description | TEXT | Filter description |
| filter_criteria | JSONB | Filter values |
| is_shared | BOOLEAN | Share with team |
| is_default | BOOLEAN | Auto-apply |
| is_system | BOOLEAN | System-created |
| usage_count | INTEGER | Usage count |
| last_used_at | TIMESTAMPTZ | Last use time |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |
| created_by | UUID | FK to auth.users |

**Unique Constraint:** `(tenant_id, entity_type, name)`

#### `filter_usage_logs`
Filter usage analytics.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| user_id | UUID | FK to auth.users |
| entity_type | TEXT | Entity filtered |
| filter_field | TEXT | Field filtered |
| filter_config_id | UUID | FK to filter_configs |
| saved_filter_id | UUID | FK to saved_filters |
| filter_value | JSONB | Applied value |
| results_count | INTEGER | Results returned |
| used_at | TIMESTAMPTZ | Usage timestamp |

---

### 12. Reporting (2 Tables)

#### `kpi_snapshots`
KPI metric snapshots for dashboards.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| metric_date | DATE | Metric date |
| metric_name | VARCHAR(100) | Metric identifier |
| metric_value | DECIMAL(20,4) | Metric value |
| dimensions | JSONB | Dimensions (user_id, team, territory) |
| previous_value | DECIMAL(20,4) | Previous period value |
| target_value | DECIMAL(20,4) | Target value |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Unique Constraint:** `(tenant_id, metric_date, metric_name, dimensions)`

#### `report_schedules`
Scheduled report delivery.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| name | VARCHAR(255) | Report name |
| report_type | VARCHAR(50) | Report type |
| parameters | JSONB | Report parameters |
| frequency | VARCHAR(20) | daily, weekly, monthly |
| schedule_config | JSONB | Cron/schedule config |
| next_run_at | TIMESTAMPTZ | Next run time |
| recipients | JSONB | Email recipients |
| format | VARCHAR(20) | pdf, excel, csv |
| is_active | BOOLEAN | Active flag |
| created_at | TIMESTAMPTZ | Creation timestamp |
| created_by | UUID | FK to auth.users |

---

### 13. Financial (2 Tables)

#### `commission_rules`
Commission calculation rules.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| name | VARCHAR(255) | Rule name |
| description | TEXT | Rule description |
| applies_to | VARCHAR(50) | user, role, team |
| applies_to_id | UUID | Target ID |
| calculation_type | VARCHAR(50) | percentage, flat, tiered |
| calculation_config | JSONB | Calculation details |
| conditions | JSONB | Conditions for application |
| is_active | BOOLEAN | Active flag |
| priority | INTEGER | Rule priority |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### `commissions`
Earned commission records.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| user_id | UUID | FK to auth.users |
| project_id | UUID | FK to projects |
| rule_id | UUID | FK to commission_rules |
| project_value | DECIMAL(12,2) | Project value |
| commission_rate | DECIMAL(5,2) | Rate applied |
| commission_amount | DECIMAL(12,2) | Amount earned |
| status | VARCHAR(50) | pending, approved, paid, disputed |
| approved_by | UUID | FK to auth.users |
| approved_at | TIMESTAMPTZ | Approval time |
| paid_at | TIMESTAMPTZ | Payment time |
| notes | TEXT | Commission notes |
| dispute_reason | TEXT | Dispute reason if disputed |
| created_at | TIMESTAMPTZ | Creation timestamp |

---

## Database Functions

### Core Functions

| Function | Purpose |
|----------|---------|
| `get_user_tenant_id()` | Returns current user's tenant ID for RLS |
| `update_updated_at_column()` | Trigger function to auto-update `updated_at` |
| `update_contact_search_vector()` | Updates full-text search vector on contacts |

### Gamification Functions

| Function | Purpose |
|----------|---------|
| `award_points(user_id, points, reason, activity_id)` | Awards points and logs activity |
| `check_achievements(user_id)` | Checks and awards new achievements |

### Knock/Territory Functions

| Function | Purpose |
|----------|---------|
| `get_user_knock_stats(user_id, start_date, end_date)` | Returns knock statistics as JSON |
| `get_knocks_within_radius(lat, lng, radius)` | Finds knocks within distance |
| `get_territory_stats(territory_id)` | Returns territory statistics |
| `update_territory_knock_count()` | Trigger to update territory stats |
| `is_point_in_territory(territory_id, lat, lng)` | Checks if point is in territory |

### Job Functions

| Function | Purpose |
|----------|---------|
| `generate_job_number()` | Auto-generates job numbers (YY-####) |
| `calculate_job_duration()` | Calculates actual duration on completion |
| `get_crew_member_jobs(user_id, start, end)` | Gets crew member's scheduled jobs |
| `get_crew_lead_stats(user_id, start, end)` | Returns crew lead statistics |

### Storm Targeting Functions

| Function | Purpose |
|----------|---------|
| `calculate_polygon_area_sq_miles(poly)` | Converts ST_Area to square miles |
| `point_in_targeting_area(lat, lng, area_id)` | Checks if point is in area |
| `estimate_addresses_in_area(area_id)` | Estimates addresses (~75 per sq mile) |
| `update_targeting_area_stats(area_id)` | Updates area statistics |
| `update_import_job_progress(job_id, ...)` | Updates job progress counters |

### Call Log Functions

| Function | Purpose |
|----------|---------|
| `get_user_call_metrics(user_id, start, end)` | Returns call statistics as JSON |
| `get_contact_call_count(contact_id)` | Returns total calls for a contact |

---

## Database Views

| View | Purpose |
|------|---------|
| `pipeline_metrics` | Contact/project counts by stage per day |
| `revenue_forecast` | Project values by month and status |
| `recent_calls` | Call logs with contact/project/user joins |
| `calls_needing_followup` | Calls marked for follow-up |
| `knock_appointments` | Knocks with appointments scheduled |
| `knock_follow_ups` | Interested prospects needing follow-up |
| `todays_jobs` | Jobs scheduled for today |
| `upcoming_jobs` | Future scheduled jobs |
| `active_territories` | Active territories with assignment info |

---

## Row-Level Security (RLS)

All tenant-owned tables have RLS enabled with consistent policy patterns:

### Standard Policy Pattern

```sql
-- SELECT: Users can view rows in their tenant
CREATE POLICY "Users can view [table] in their tenant"
  ON [table] FOR SELECT
  USING (tenant_id = get_user_tenant_id());

-- INSERT: Users can insert rows in their tenant
CREATE POLICY "Users can insert [table] in their tenant"
  ON [table] FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

-- UPDATE: Users can update rows in their tenant
CREATE POLICY "Users can update [table] in their tenant"
  ON [table] FOR UPDATE
  USING (tenant_id = get_user_tenant_id());

-- DELETE: Users can delete rows in their tenant
CREATE POLICY "Users can delete [table] in their tenant"
  ON [table] FOR DELETE
  USING (tenant_id = get_user_tenant_id());
```

### Role-Based Policies

Some tables have additional role restrictions:

- **campaigns** - Admins only for management (role = 'admin')
- **filter_configs** - Admins only for management
- **commission_rules** - Admins only for management

### Ownership Policies

Some tables restrict updates/deletes to record owners:

- **knocks** - Users can only update/delete their own knocks
- **saved_filters** - Users can only update/delete their own filters

---

## Index Summary

### B-Tree Indexes (Standard)
- All `tenant_id` columns are indexed for RLS performance
- All `created_at` columns with DESC for recency queries
- Foreign key columns for join performance
- Status/stage columns for filtering

### GIN Indexes
- `contacts.search_vector` - Full-text search
- `jobs.crew_members` - Array containment
- `territories.boundary` - JSONB queries

### Spatial Indexes (GIST)
- `storm_events.path_polygon` - PostGIS spatial queries
- `storm_targeting_areas.boundary_polygon` - PostGIS spatial queries

### Partial Indexes
- `idx_knocks_appointments WHERE appointment_date IS NOT NULL`
- `idx_filter_configs_tenant WHERE is_active = true`
- `idx_campaigns_status WHERE status = 'active' AND NOT is_deleted`

---

## Integration Points

| Integration | Tables |
|-------------|--------|
| **Supabase Auth** | `auth.users` - All user FKs reference this |
| **QuickBooks** | `quickbooks_tokens`, `quickbooks_mappings`, `quickbooks_sync_logs` |
| **Twilio** | `call_logs.twilio_call_sid`, `call_logs.recording_url` |
| **Resend** | `activities.external_id` for email tracking |
| **PostGIS** | `storm_events.path_polygon`, `storm_targeting_areas.boundary_polygon` |
| **OpenAI** | `knowledge_base.embedding` (1536-dimensional vectors) |

---

## Configuration

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Database (for direct connections)
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
```

### Supabase Project

- **Project ID:** `wfifizczqvogbcqamnmw`
- **Region:** Inferred from URL
- **PostgreSQL Version:** 15+

---

## Testing

### E2E Tests
- Database queries are tested via API endpoints in Playwright tests
- See `/e2e/` directory for test coverage

### Migration Testing
- Migrations are applied in sequence
- Each migration includes verification block with RAISE NOTICE

---

## Performance Considerations

1. **Index Coverage**: All RLS-filtered queries use `tenant_id` indexes
2. **Partial Indexes**: Reduce index size for sparse conditions
3. **Generated Columns**: `jobs.total_cost` computed at write time
4. **Cache Table**: `property_enrichment_cache` reduces API calls
5. **Materialized Views**: Consider for complex reporting queries

---

## File References

| File | Purpose |
|------|---------|
| `/Users/ccai/roofing saas/DATABASE_SCHEMA_v2.sql` | Master schema definition |
| `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/` | All migration files (37 files) |
| `20251003_knocks_table.sql` | Knocks table and functions |
| `20251003_jobs_table.sql` | Jobs table and views |
| `20251003_territories_table.sql` | Territories and spatial functions |
| `20251003_call_logs_table.sql` | Call logging with Twilio |
| `20251004_quickbooks_integration.sql` | QuickBooks integration tables |
| `20251002_gamification_functions.sql` | Points and achievements |
| `202511030002_storm_targeting_system.sql` | Storm targeting (PostGIS) |
| `20251119000100_campaigns_system.sql` | Campaign automation (6 tables) |
| `20251119000400_configurable_filters.sql` | Filter configuration system |

---

## Validation Record

### Files Examined
- `/Users/ccai/roofing saas/DATABASE_SCHEMA_v2.sql` - Master schema (731 lines) - All core tables verified
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251003_knocks_table.sql` - 281 lines - Verified 7 dispositions, 12 indexes
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251003_jobs_table.sql` - 374 lines - Verified generated total_cost column
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251003_territories_table.sql` - 277 lines - Verified GeoJSON boundary storage
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251003_call_logs_table.sql` - 251 lines - Verified Twilio fields
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251004_quickbooks_integration.sql` - 173 lines - Verified 3 QB tables
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251002_gamification_functions.sql` - 199 lines - Verified award_points, check_achievements
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/202511030002_storm_targeting_system.sql` - 557 lines - Verified PostGIS, 5 tables
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251119000100_campaigns_system.sql` - 496 lines - Verified 6 campaign tables
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251119000400_configurable_filters.sql` - 200+ lines - Verified filter configuration

### Archon RAG Queries
- No RAG queries required - all information sourced from SQL files

### Verification Steps
1. Counted all tables defined across schema and migrations - 40+ tables identified
2. Verified all foreign key relationships reference valid tables
3. Confirmed RLS policies exist for all tenant-owned tables
4. Validated function signatures match their usages
5. Cross-referenced index definitions with query patterns

### Validated By
PRD Documentation Agent - Session 30
Date: 2025-12-11T16:20:00Z

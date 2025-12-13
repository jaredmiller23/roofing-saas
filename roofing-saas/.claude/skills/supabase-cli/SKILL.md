---
name: supabase-cli
description: Execute SQL queries and manage Supabase database operations. Use when querying the database, running migrations, inspecting schema, or checking RLS policies. Provides three methods: npx supabase CLI, direct psql, and curl to REST API.
allowed-tools: Bash, Read, Grep
---

# Supabase CLI Skill

Execute SQL queries and manage database operations for the Tennessee Roofing SaaS project.

## Connection Details

- **Project URL**: `https://wfifizczqvogbcqamnmw.supabase.co`
- **Project ID**: `wfifizczqvogbcqamnmw`
- **Environment variables**: Defined in `.env.local`

## SQL Execution Methods

### Method 1: REST API via curl (Recommended)

```bash
# Query via PostgREST (works for remote database)
curl -s "https://wfifizczqvogbcqamnmw.supabase.co/rest/v1/TABLE?select=COLUMNS&limit=N" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY"

# Example: Get 5 contacts
curl -s "https://wfifizczqvogbcqamnmw.supabase.co/rest/v1/contacts?select=id,first_name,last_name&limit=5" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY"

# With filters
curl -s "https://wfifizczqvogbcqamnmw.supabase.co/rest/v1/projects?select=*&is_deleted=eq.false&limit=10" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY"
```

### Method 2: Supabase CLI (Migrations Only)

```bash
# Run migrations (push local schema to remote)
npx supabase db push

# Pull remote schema to local
npx supabase db pull

# Create new migration file
npx supabase migration new description_here

# List migrations
npx supabase migration list

# Note: There is NO `npx supabase db execute` command for raw SQL
```

### Method 3: Direct psql (Most Powerful)

```bash
# Using DATABASE_URL from .env.local
source /Users/ccai/Roofing\ SaaS/roofing-saas/.env.local
psql "$DATABASE_URL" -c "SELECT * FROM projects LIMIT 5"

# Multi-line query with heredoc
psql "$DATABASE_URL" << 'EOF'
SELECT
  p.id,
  p.name,
  p.pipeline_stage,
  c.first_name || ' ' || c.last_name as contact_name
FROM projects p
LEFT JOIN contacts c ON p.contact_id = c.id
WHERE p.is_deleted = false
LIMIT 10;
EOF

# Output to file
psql "$DATABASE_URL" -c "SELECT * FROM projects" -o output.csv -A -F ','
```

### Method 3: curl to REST API (Remote/Serverless)

```bash
# Load environment variables
source /Users/ccai/Roofing\ SaaS/roofing-saas/.env.local

# Query via PostgREST (read operations)
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/projects?select=*&limit=5" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" | jq

# Query with filters
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/projects?pipeline_stage=eq.won&select=id,name,estimated_value" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" | jq

# Insert (requires service role for bypassing RLS)
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/projects" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"name": "Test Project", "org_id": "your-org-id"}'
```

## Common Queries for This Project

### Projects & Pipeline

```sql
-- Count projects by pipeline stage
SELECT pipeline_stage, COUNT(*)
FROM projects
WHERE is_deleted = false
GROUP BY pipeline_stage
ORDER BY COUNT(*) DESC;

-- Pipeline value by stage
SELECT
  pipeline_stage,
  COUNT(*) as count,
  SUM(estimated_value) as total_value
FROM projects
WHERE is_deleted = false
GROUP BY pipeline_stage;

-- Projects in production
SELECT id, name, job_number, production_start_date
FROM projects
WHERE pipeline_stage = 'production'
AND is_deleted = false;
```

### Contacts

```sql
-- Recent contacts
SELECT id, first_name, last_name, email, phone, created_at
FROM contacts
WHERE is_deleted = false
ORDER BY created_at DESC
LIMIT 20;

-- Contacts with projects
SELECT
  c.first_name || ' ' || c.last_name as name,
  COUNT(p.id) as project_count
FROM contacts c
LEFT JOIN projects p ON c.id = p.contact_id
WHERE c.is_deleted = false
GROUP BY c.id, c.first_name, c.last_name
HAVING COUNT(p.id) > 0;
```

### Schema Inspection

```sql
-- List all tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;

-- RLS policies for a table
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'projects';

-- Check if RLS is enabled
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname = 'projects';
```

### Organizations & Multi-tenant

```sql
-- All organizations
SELECT id, name, slug, created_at
FROM organizations
WHERE is_deleted = false;

-- Users in an organization
SELECT
  u.id,
  u.email,
  m.role,
  m.created_at as joined_at
FROM organization_members m
JOIN auth.users u ON m.user_id = u.id
WHERE m.org_id = 'your-org-id';
```

## Migration Patterns

### Create Migration File

```bash
# Create new migration
npx supabase migration new description_of_change

# This creates: supabase/migrations/YYYYMMDDHHMMSS_description_of_change.sql
```

### Migration File Template

```sql
-- Migration: description_of_change
-- Created: YYYY-MM-DD

-- Up Migration
ALTER TABLE projects ADD COLUMN new_field TEXT;

-- Create index if needed
CREATE INDEX idx_projects_new_field ON projects(new_field);

-- Update RLS if needed
CREATE POLICY "Users can view own org projects new field" ON projects
  FOR SELECT USING (org_id = get_user_org_id());

-- Rollback (in comment for reference)
-- ALTER TABLE projects DROP COLUMN new_field;
-- DROP INDEX idx_projects_new_field;
```

### Apply Migrations

```bash
# Apply pending migrations to remote
npx supabase db push

# Check migration status
npx supabase migration list

# Generate types after schema change
npx supabase gen types typescript --project-id wfifizczqvogbcqamnmw > lib/database.types.ts
```

## When to Use Each Method

| Method | Best For | Pros | Cons |
|--------|----------|------|------|
| npx supabase | Local dev, migrations | Clean CLI, good DX | Requires CLI setup |
| psql | Complex queries, debugging | Full SQL power | Requires connection string |
| curl/REST | Remote ops, serverless | Works anywhere | Limited to REST API capabilities |

## Troubleshooting

### Connection Issues

```bash
# Check if Supabase CLI is linked
npx supabase projects list

# Link to project (if not linked)
npx supabase link --project-ref wfifizczqvogbcqamnmw

# Test database connection
npx supabase db execute "SELECT 1"
```

### Permission Denied

```bash
# Check RLS is the likely cause
# Use service role key for admin operations
# Or check the RLS policies on the table
```

### Slow Queries

```sql
-- Add EXPLAIN to see query plan
EXPLAIN ANALYZE SELECT * FROM projects WHERE pipeline_stage = 'won';
```

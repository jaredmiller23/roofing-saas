# Migration Files Structure

## Active Migrations
- `001_complete_schema.sql` - Consolidated complete database schema (Oct 2, 2025)

## Archived Migrations
Individual migration files have been moved to `/archive/` folder for reference:

### Phase 1 - Core CRM (Archived)
- `20251001_quickbooks_connections.sql` - QuickBooks integration tables
- `20251001_fix_tenant_users_recursion.sql` - Fix for tenant users RLS
- `20251001_fix_tenant_users_select_policy.sql` - Tenant users select policy fix

### Phase 2 - Communication (Archived)
- `20251001_sms_compliance.sql` - SMS opt-in/opt-out tracking
- `20251001_email_tracking.sql` - Email tracking fields

### Phase 3 - Mobile PWA (Archived)
- `20251001_create_territories_table.sql` - Territory management
- `20251002_create_photos_table.sql` - Photo storage
- `20251002_fix_photos_rls_*.sql` - Photo RLS policy fixes
- `20251002_storage_bucket_policies.sql` - Storage bucket configuration
- `20251002_create_gamification_tables.sql` - Gamification system

### Performance & Infrastructure (Archived)
- `20251001_add_performance_indexes.sql` - Performance indexes
- `20251001_phase3_5_indexes.sql` - Additional indexes
- `20251001_automation_workflows.sql` - Workflow automation tables

### Deferred Features
- `20251001_encryption_deferred_to_phase5.md` - Encryption (Phase 5)

## Migration Strategy
All migrations have been applied to production. The consolidated schema in `001_complete_schema.sql` represents the current state of the database as of October 2, 2025.

For new features, create new numbered migrations (002, 003, etc.)
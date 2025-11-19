# Organizations Migration Guide
**Migration**: `20251119_merge_organizations_into_contacts.sql`
**Date**: November 19, 2025
**Risk Level**: LOW (organizations table unused)

---

## Overview

This migration merges the `organizations` table into `contacts` with an enhanced type system, allowing contacts to represent both individuals and companies with combined types like "Lead-Homeowner" or "Customer-Adjuster".

---

## Pre-Migration Checklist

### 1. Verify Current State
```sql
-- Count organizations (should be 0)
SELECT COUNT(*) as org_count FROM organizations WHERE is_deleted = false;

-- Count contacts
SELECT COUNT(*) as contact_count FROM contacts WHERE is_deleted = false;

-- Count projects with organization links
SELECT COUNT(*) as project_org_count FROM projects WHERE organization_id IS NOT NULL;
```

### 2. Backup Database
```bash
# Full database backup
pg_dump -h your-db-host -U postgres -d your-database > backup_pre_org_migration_$(date +%Y%m%d).sql

# Or use Supabase Dashboard > Database > Backups
```

### 3. Schedule Maintenance Window
- **Estimated downtime**: 2-5 minutes
- **Best time**: Low-traffic period
- **Notification**: Alert users of brief maintenance

---

## Migration Execution

### Step 1: Run Migration
```bash
# Using Supabase CLI
supabase db reset  # In development
# OR
psql -h your-db-host -U postgres -d your-database -f supabase/migrations/20251119_merge_organizations_into_contacts.sql
```

### Step 2: Monitor Output
Watch for these key messages:
```
✓ Organizations table successfully dropped
✓ New contact columns successfully added
✓ All projects have contact assignments
=== MIGRATION COMPLETE ===
```

### Step 3: Verify Results
```sql
-- Check new columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'contacts'
  AND column_name IN ('is_organization', 'company', 'website', 'contact_category');

-- Verify organizations table is gone
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'organizations';
-- Should return 0 rows

-- Check backup tables created
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE '%backup_20251119%';
-- Should return 3 tables
```

---

## Post-Migration Validation

### 1. Data Integrity Checks
```sql
-- Verify all contacts have contact_category
SELECT COUNT(*) as missing_category
FROM contacts
WHERE contact_category IS NULL;
-- Should be 0

-- Check organization contacts
SELECT
  COUNT(*) as org_contacts,
  COUNT(DISTINCT tenant_id) as tenants
FROM contacts
WHERE is_organization = true;

-- Verify projects still linked correctly
SELECT
  COUNT(*) as total_projects,
  COUNT(contact_id) as with_contact,
  COUNT(*) - COUNT(contact_id) as without_contact
FROM projects;
```

### 2. Application Testing
- [ ] Create new contact (individual)
- [ ] Create new contact (organization)
- [ ] Update contact with company field
- [ ] Search contacts by company name
- [ ] Filter contacts by category
- [ ] Create project linked to contact
- [ ] Verify contact display in UI
- [ ] Test combined type labels

### 3. Performance Checks
```sql
-- Verify indexes created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'contacts'
  AND indexname LIKE '%company%'
  OR indexname LIKE '%category%'
  OR indexname LIKE '%organization%';

-- Check query performance
EXPLAIN ANALYZE
SELECT * FROM contacts
WHERE is_organization = true
  AND contact_category = 'adjuster';
```

---

## Rollback Procedure

### When to Rollback
- Migration fails with errors
- Data validation checks fail
- Critical application bugs discovered
- User requests reversal

### Rollback Steps

#### 1. Stop Application (if running)
```bash
# Prevent new data from being created
```

#### 2. Restore from Backup Tables
```sql
-- ROLLBACK SCRIPT
-- WARNING: This will undo the migration

BEGIN;

-- 1. Restore organizations table
CREATE TABLE organizations AS
SELECT * FROM organizations_backup_20251119;

-- 2. Re-add RLS policies to organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view organizations in their tenant"
  ON organizations FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update organizations"
  ON organizations FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete organizations"
  ON organizations FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- 3. Restore contacts table (removes new fields)
DROP TABLE contacts CASCADE;
CREATE TABLE contacts AS
SELECT * FROM contacts_backup_20251119;

-- Re-enable RLS on contacts (assuming it was enabled)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
-- (Re-create contact RLS policies here if needed)

-- 4. Restore organization_id to projects
ALTER TABLE projects ADD COLUMN organization_id UUID REFERENCES organizations(id);

UPDATE projects p
SET organization_id = pb.organization_id
FROM projects_backup_20251119 pb
WHERE p.id = pb.id;

-- 5. Re-create organizations indexes
CREATE INDEX idx_organizations_tenant_id ON organizations(tenant_id);
CREATE INDEX idx_organizations_org_type ON organizations(org_type);
CREATE INDEX idx_organizations_stage ON organizations(stage);
CREATE INDEX idx_organizations_primary_contact_id ON organizations(primary_contact_id);
CREATE INDEX idx_organizations_created_at ON organizations(created_at DESC);
CREATE INDEX idx_projects_organization_id ON projects(organization_id);

-- 6. Re-create organizations triggers
CREATE OR REPLACE FUNCTION update_organization_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_updated_at();

-- 7. Verify rollback
DO $$
DECLARE
  org_table_exists BOOLEAN;
  contact_has_company BOOLEAN;
BEGIN
  -- Check organizations table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'organizations'
  ) INTO org_table_exists;

  -- Check contacts no longer has company field
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'company'
  ) INTO contact_has_company;

  IF org_table_exists AND NOT contact_has_company THEN
    RAISE NOTICE '✓ Rollback successful - organizations table restored';
  ELSE
    RAISE WARNING '✗ Rollback may have failed - manual intervention needed';
  END IF;
END $$;

COMMIT;

-- 8. Cleanup backup tables (only after verifying rollback worked)
-- DROP TABLE organizations_backup_20251119;
-- DROP TABLE contacts_backup_20251119;
-- DROP TABLE projects_backup_20251119;
```

#### 3. Restart Application
```bash
# Restart services
```

#### 4. Verify Rollback
- Test organizations CRUD operations
- Verify projects link to organizations
- Check data integrity

---

## Troubleshooting

### Issue: Migration hangs
**Solution**: Check for long-running transactions
```sql
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%';

-- Kill if needed (use with caution)
SELECT pg_terminate_backend(pid);
```

### Issue: Constraint violation errors
**Solution**: Check data that violates new constraints
```sql
-- Check invalid contact_category values
SELECT DISTINCT contact_category
FROM contacts
WHERE contact_category NOT IN (
  'homeowner', 'adjuster', 'sub_contractor', 'real_estate_agent',
  'developer', 'property_manager', 'local_business', 'other'
);
```

### Issue: Projects without contacts after migration
**Solution**: Manually assign contacts
```sql
-- Find orphaned projects
SELECT id, name FROM projects WHERE contact_id IS NULL;

-- Manually assign (example)
UPDATE projects
SET contact_id = 'some-contact-uuid'
WHERE id = 'project-uuid';
```

### Issue: Performance degradation
**Solution**: Rebuild indexes and analyze
```sql
-- Rebuild indexes
REINDEX TABLE contacts;

-- Update statistics
ANALYZE contacts;
```

---

## Cleanup (After 7 Days)

Once migration is confirmed successful and stable:

```sql
-- Drop backup tables to reclaim space
DROP TABLE IF EXISTS organizations_backup_20251119;
DROP TABLE IF EXISTS contacts_backup_20251119;
DROP TABLE IF EXISTS projects_backup_20251119;

RAISE NOTICE 'Backup tables dropped - migration cleanup complete';
```

---

## Next Steps After Migration

1. **Update TypeScript Types**
   - Modify `/lib/types/contact.ts`
   - Add new fields and enums
   - Update API request/response types

2. **Update UI Components**
   - Add company, website, category fields to contact forms
   - Update contact list to display combined types
   - Add organization toggle
   - Update contact detail pages

3. **Update API Validation**
   - Validate contact_category enum
   - Handle is_organization flag
   - Update search to include company field

4. **Update Documentation**
   - Update user guides
   - Update API documentation
   - Update ERD diagrams

5. **Monitor Production**
   - Watch error logs for issues
   - Monitor query performance
   - Gather user feedback

---

## Support

If issues arise:
1. Check migration output logs
2. Run validation queries
3. Review troubleshooting section
4. Consider rollback if critical
5. Document issue for future reference

---

## Migration Metadata

| Property | Value |
|----------|-------|
| Migration File | `20251119_merge_organizations_into_contacts.sql` |
| Research Document | `/docs/research/ORGANIZATIONS_MIGRATION_RESEARCH.md` |
| Backup Tables | `*_backup_20251119` |
| Risk Level | LOW (table unused) |
| Estimated Duration | 2-5 minutes |
| Rollback Time | 5-10 minutes |
| Can Rollback? | YES (within 7 days) |

---

**Status**: Ready for execution
**Approved by**: Pending client approval
**Executed on**: Pending

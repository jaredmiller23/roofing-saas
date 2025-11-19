# Proline CRM Data Migration Guide

**Data Migration from Proline to Roofing SaaS**
**Date**: November 18, 2025
**Status**: Ready for Execution

---

## Overview

This guide walks through the complete process of migrating data from Proline CRM to our Roofing SaaS platform.

### What Gets Migrated

- ✅ **Contacts** (leads and customers)
- ✅ **Projects** (jobs/deals)
- ✅ **Activities** (call logs, emails, notes)

### Features

- **Field Mapping**: Automatically maps Proline fields to our schema
- **Data Validation**: Validates emails, phones, required fields
- **Duplicate Detection**: Prevents importing duplicate contacts
- **Relationship Preservation**: Links projects and activities to correct contacts
- **Dry Run Mode**: Preview migration without making changes
- **Rollback Support**: Undo migration if something goes wrong
- **Progress Logging**: Detailed logs of migration process

---

## Prerequisites

Before starting the migration:

1. ✅ **Administrator Access**: You must be a tenant administrator
2. ✅ **Proline Export**: Export contacts, projects, and activities as CSV files
3. ✅ **Backup Recommended**: Consider backing up Supabase database
4. ✅ **Maintenance Window**: Schedule migration during low-usage period
5. ✅ **User IDs**: Know your tenant_id and user_id for migration

---

## Step 1: Export Data from Proline

### Export Contacts

1. Log in to **Proline CRM**
2. Navigate to **Contacts** or **Leads**
3. Click **Export** or **Download CSV**
4. Include all fields:
   - Contact information (name, email, phone, mobile)
   - Address (street, city, state, zip)
   - Status/Stage
   - Source
   - Notes
   - Dates (created, modified)
   - Custom fields
5. Save as `proline_contacts.csv`

### Export Projects (Optional)

1. Navigate to **Projects** or **Deals**
2. Click **Export**
3. Include all fields:
   - Project name and description
   - Contact ID (reference to contact)
   - Status/Stage
   - Value/Amount
   - Dates (start, end, close)
   - Notes
4. Save as `proline_projects.csv`

### Export Activities (Optional)

1. Navigate to **Activities** or **History**
2. Click **Export**
3. Include all fields:
   - Activity type (call, email, meeting, note)
   - Subject/Description
   - Contact ID (reference to contact)
   - Project ID (reference to project, if applicable)
   - Date
   - Created by
4. Save as `proline_activities.csv`

---

## Step 2: Review Field Mappings

The migration script automatically maps Proline fields to our schema.

### Contact Field Mappings

| Proline Field | Our Field | Notes |
|---------------|-----------|-------|
| `first_name` | `first_name` | Required |
| `last_name` | `last_name` | Required |
| `email` | `email` | Validated format |
| `phone` or `mobile` | `phone` | Formatted to E.164 (+1XXXXXXXXXX) |
| `address` | `street_address` | |
| `city` | `city` | |
| `state` | `state` | |
| `zip` | `zip_code` | |
| `status` | `type` + `stage` | Mapped automatically (see below) |
| `source` | `source` | Defaults to "Proline Migration" |
| `notes` | `notes` | Proline ID appended for linking |
| `created_date` | `created_at` | Preserved |
| `modified_date` | `updated_at` | Preserved |

### Status Mappings

Proline status values are automatically mapped to our type + stage:

| Proline Status | Our Type | Our Stage |
|----------------|----------|-----------|
| "Customer", "Client" | `customer` | `closed_won` |
| "Lost", "Dead" | `lead` | `closed_lost` |
| "Proposal", "Quote" | `lead` | `proposal` |
| "Qualified" | `lead` | `qualified` |
| "Contacted", "Working" | `lead` | `contacted` |
| Other | `lead` | `new` |

### Project Field Mappings

| Proline Field | Our Field | Notes |
|---------------|-----------|-------|
| `name` | `name` | Required |
| `contact_id` | Linked via Proline ID | Must match contact |
| `status` or `stage` | `stage` | Mapped to pipeline stage |
| `value` | `estimated_value` | Parsed as number |
| `close_date` or `end_date` | `expected_close_date` | |
| `description` | `description` | |
| `notes` | `notes` | Proline ID appended |

### Project Stage Mappings

| Proline Status/Stage | Our Stage |
|----------------------|-----------|
| "Complete", "Won" | `complete` |
| "Lost", "Dead" | `lost` |
| "Install", "Installation" | `installation` |
| "Contract", "Signed" | `contract` |
| "Proposal", "Quote" | `proposal` |
| "Qualified" | `qualified` |
| "Contact", "Contacted" | `contacted` |
| Other | `lead` |

---

## Step 3: Update Field Mappings (If Needed)

If your Proline export has different field names:

1. Open `/lib/migrations/proline-field-mappings.ts`
2. Update the interfaces:
   ```typescript
   export interface ProlineContact {
     id?: string | number
     first_name?: string  // ← Update field names here
     last_name?: string
     // ... add your fields
   }
   ```
3. Update the mapping constants if needed
4. Update status mapping functions if your status values are different

---

## Step 4: Run Migration (Dry Run First!)

### Option A: Using Next.js API Route (Recommended)

Create a temporary API route to run the migration:

1. Create `/app/api/admin/migrate-proline/route.ts`:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server'
   import { migrateProlineData } from '@/lib/migrations/migrate-proline'
   import * as fs from 'fs'
   import * as path from 'path'

   export async function POST(request: NextRequest) {
     try {
       const body = await request.json()
       const { tenant_id, user_id, dry_run = true } = body

       // Path to uploaded CSV files
       const contactsCsvPath = path.join(process.cwd(), 'data', 'proline_contacts.csv')
       const projectsCsvPath = path.join(process.cwd(), 'data', 'proline_projects.csv')
       const activitiesCsvPath = path.join(process.cwd(), 'data', 'proline_activities.csv')

       // Run migration
       const result = await migrateProlineData(
         contactsCsvPath,
         fs.existsSync(projectsCsvPath) ? projectsCsvPath : undefined,
         fs.existsSync(activitiesCsvPath) ? activitiesCsvPath : undefined,
         {
           tenant_id,
           user_id,
           dry_run,
           skip_duplicates: true,
           log_file: path.join(process.cwd(), 'logs', `migration_${Date.now()}.log`),
         }
       )

       return NextResponse.json(result)
     } catch (error) {
       return NextResponse.json(
         { error: error instanceof Error ? error.message : String(error) },
         { status: 500 }
       )
     }
   }
   ```

2. Upload CSV files to `/data/` folder in project root

3. Test with dry run:
   ```bash
   curl -X POST http://localhost:3000/api/admin/migrate-proline \
     -H "Content-Type: application/json" \
     -d '{
       "tenant_id": "your-tenant-id",
       "user_id": "your-user-id",
       "dry_run": true
     }'
   ```

4. Review the response:
   - Check `summary.contacts_processed` vs `summary.contacts_imported`
   - Review `errors` array for any issues
   - Check `validation_report` for duplicates and invalid records

5. If dry run looks good, run for real:
   ```bash
   curl -X POST http://localhost:3000/api/admin/migrate-proline \
     -H "Content-Type: application/json" \
     -d '{
       "tenant_id": "your-tenant-id",
       "user_id": "your-user-id",
       "dry_run": false
     }'
   ```

### Option B: Using Node.js Script

1. Create `/scripts/run-migration.ts`:
   ```typescript
   import { migrateProlineData } from '../lib/migrations/migrate-proline'
   import * as path from 'path'

   async function main() {
     const result = await migrateProlineData(
       path.join(__dirname, '../data/proline_contacts.csv'),
       path.join(__dirname, '../data/proline_projects.csv'),
       path.join(__dirname, '../data/proline_activities.csv'),
       {
         tenant_id: 'your-tenant-id',
         user_id: 'your-user-id',
         dry_run: true,  // ← Set to false when ready
         skip_duplicates: true,
         log_file: path.join(__dirname, `../logs/migration_${Date.now()}.log`),
       }
     )

     console.log(JSON.stringify(result, null, 2))
   }

   main().catch(console.error)
   ```

2. Run:
   ```bash
   npx tsx scripts/run-migration.ts
   ```

---

## Step 5: Validate Migration

After migration completes, validate the data:

1. Create validation script `/scripts/validate-migration.ts`:
   ```typescript
   import { validateMigration, printValidationReport } from '../lib/migrations/validate-migration'

   async function main() {
     const result = await validateMigration({
       tenant_id: 'your-tenant-id',
       expected_counts: {
         contacts: 500,    // Expected from Proline export
         projects: 150,    // Expected from Proline export
         activities: 1200, // Expected from Proline export
       },
       check_relationships: true,
       check_data_integrity: true,
     })

     printValidationReport(result)

     if (!result.success) {
       process.exit(1)
     }
   }

   main().catch(console.error)
   ```

2. Run validation:
   ```bash
   npx tsx scripts/validate-migration.ts
   ```

3. Review validation report:
   - All checks should pass ✓
   - No orphaned projects or activities
   - No invalid emails or phone numbers
   - No duplicate contacts

---

## Step 6: Manual Verification

After automated validation, manually verify:

### Check Contacts

1. Navigate to **Contacts** in dashboard
2. Filter by source: "Proline Migration"
3. Verify:
   - Names are correct
   - Email addresses are valid
   - Phone numbers are formatted correctly (+1XXXXXXXXXX)
   - Addresses are complete
   - Contact stages are appropriate

### Check Projects

1. Navigate to **Pipeline** or **Projects**
2. Filter by contacts imported from Proline
3. Verify:
   - Project names are correct
   - Projects are linked to correct contacts
   - Project stages are appropriate
   - Estimated values are correct
   - Close dates are reasonable

### Check Activities

1. Navigate to any contact imported from Proline
2. Check **Activity Timeline**
3. Verify:
   - Activities are linked to correct contacts
   - Activity types are correct (call, email, meeting, note)
   - Activity dates are preserved
   - Notes/descriptions are complete

---

## Step 7: Rollback (If Needed)

If something went wrong, you can rollback the migration.

### Preview Rollback (Dry Run)

1. Create rollback script `/scripts/rollback-migration.ts`:
   ```typescript
   import { rollbackProlineMigration, printRollbackSummary } from '../lib/migrations/rollback-migration'

   async function main() {
     const result = await rollbackProlineMigration({
       tenant_id: 'your-tenant-id',
       dry_run: true,  // ← Preview only
       confirm: false,
     })

     printRollbackSummary(result)
   }

   main().catch(console.error)
   ```

2. Run:
   ```bash
   npx tsx scripts/rollback-migration.ts
   ```

3. Review what would be deleted

### Execute Rollback

1. Update script:
   ```typescript
   const result = await rollbackProlineMigration({
     tenant_id: 'your-tenant-id',
     dry_run: false,
     confirm: true,  // ← REQUIRED for safety
   })
   ```

2. Run:
   ```bash
   npx tsx scripts/rollback-migration.ts
   ```

3. Verify deletion:
   - All Proline contacts removed
   - Related projects removed
   - Related activities removed

### Rollback Today's Migration Only

If you want to rollback only today's migration:

```typescript
import { rollbackTodaysMigration } from '../lib/migrations/rollback-migration'

const result = await rollbackTodaysMigration('your-tenant-id', {
  dry_run: false,
  confirm: true,
})
```

---

## Troubleshooting

### Issue: "Missing contact_id" errors for projects

**Cause**: Projects reference contacts that don't exist

**Solution**:
1. Ensure contacts are migrated first
2. Check that `contact_id` in projects CSV matches `id` in contacts CSV
3. Verify Proline ID is stored in contact notes

### Issue: Invalid email format errors

**Cause**: Proline export has malformed email addresses

**Solution**:
1. Clean up emails in Proline before export
2. Or manually update field mappings to handle special cases
3. Or skip contacts with invalid emails (they'll be logged as errors)

### Issue: Phone number format errors

**Cause**: Phone numbers not in US format

**Solution**:
1. Update `formatPhoneNumber` function in `proline-field-mappings.ts`
2. Add international phone number support
3. Or skip contacts with invalid phone numbers

### Issue: Duplicate contacts detected

**Cause**: Same contact already exists (by email or phone)

**Solution**:
- This is expected if you re-run migration
- Use `skip_duplicates: true` option to skip them
- Or manually deduplicate in Proline before export
- Or rollback and re-run with deduplicated data

### Issue: Projects not linking to contacts

**Cause**: Proline ID lookup failing

**Solution**:
1. Verify contacts were migrated with Proline ID in notes
2. Check that notes field contains "[Migrated from Proline - Proline ID: XXX]"
3. Verify contact_id in projects CSV matches id in contacts CSV

---

## Best Practices

### ✅ Do's

- **Always run dry run first** to preview changes
- **Validate before and after** migration
- **Keep CSV backups** of Proline exports
- **Test on staging** environment first
- **Schedule during maintenance window** to avoid disrupting users
- **Document custom mappings** if you modify field mappings
- **Monitor logs** during migration for errors
- **Verify relationships** between contacts, projects, and activities

### ❌ Don'ts

- **Don't skip dry run** - always preview first
- **Don't run during business hours** - schedule downtime
- **Don't delete Proline data** until migration is verified
- **Don't ignore validation errors** - fix them before proceeding
- **Don't re-run without rollback** - rollback first, then fix and re-run
- **Don't forget to backup** Supabase database

---

## Migration Checklist

### Pre-Migration

- [ ] Export contacts from Proline as CSV
- [ ] Export projects from Proline as CSV (optional)
- [ ] Export activities from Proline as CSV (optional)
- [ ] Review field mappings and update if needed
- [ ] Get tenant_id and user_id
- [ ] Backup Supabase database
- [ ] Schedule maintenance window

### Migration

- [ ] Upload CSV files to `/data/` folder
- [ ] Run migration in dry-run mode
- [ ] Review dry-run results (counts, errors, duplicates)
- [ ] Fix any validation errors
- [ ] Run migration for real (dry_run: false)
- [ ] Wait for completion
- [ ] Review migration logs

### Post-Migration

- [ ] Run automated validation script
- [ ] Verify all checks pass
- [ ] Manually verify contacts in dashboard
- [ ] Manually verify projects in dashboard
- [ ] Manually verify activities in contact timelines
- [ ] Check relationship integrity (projects → contacts, activities → contacts)
- [ ] Notify users that migration is complete
- [ ] Monitor for issues over next 24 hours
- [ ] Delete CSV files from server (security)

---

## Support

If you encounter issues during migration:

1. **Check logs** in `/logs/migration_*.log`
2. **Review errors** in migration result JSON
3. **Run validation** to identify specific issues
4. **Rollback if needed** and fix issues before re-running
5. **Contact support** with logs and error details

---

## File Reference

- **Migration Script**: `/lib/migrations/migrate-proline.ts`
- **Field Mappings**: `/lib/migrations/proline-field-mappings.ts`
- **Validation Script**: `/lib/migrations/validate-migration.ts`
- **Rollback Script**: `/lib/migrations/rollback-migration.ts`
- **This Guide**: `/docs/setup/PROLINE_MIGRATION.md`

---

**Status**: ✅ **Ready for execution** - All scripts and documentation complete

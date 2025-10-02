# Deduplication Setup Guide

This guide explains how to set up and use the deduplication system for safely importing Proline data multiple times without creating duplicates.

---

## Step 1: Run Database Migration

### Option A: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Open the file `ADD_PROLINE_ID_MIGRATION.sql` in this directory
5. Copy and paste the entire contents
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. You should see output showing 3 rows:

```
table_name          | column_name    | data_type
-------------------+----------------+-----------
projects           | proline_id     | text
contacts           | proline_id     | text
gamification_scores| enzy_user_id   | text
```

✅ **Done!** Your database now has deduplication support.

### Option B: Via Supabase CLI (Alternative)

```bash
cd "/Users/ccai/Roofing SaaS/roofing-saas"
supabase db push
```

(Only works if `supabase link` is configured)

---

## Step 2: Prepare Your Exports

Export the CSV files from Proline as described in the main exploration reports:

1. `proline_sales_insurance_complete.csv` (1,162 projects)
2. `proline_production_complete.csv` (56 projects)
3. `proline_billing_complete.csv` (17 projects)
4. `proline_closed_complete.csv` (54 projects)

Place them in a folder like: `/Users/ccai/Roofing SaaS/roofing-saas/exports/`

---

## Step 3: Run Import Script

### First Time Import

```bash
cd "/Users/ccai/Roofing SaaS/roofing-saas"

# Install dependencies if needed
npm install csv-parse

# Import each file
npx tsx scripts/import-with-deduplication.ts exports/proline_sales_insurance_complete.csv
npx tsx scripts/import-with-deduplication.ts exports/proline_production_complete.csv
npx tsx scripts/import-with-deduplication.ts exports/proline_billing_complete.csv
npx tsx scripts/import-with-deduplication.ts exports/proline_closed_complete.csv
```

**Output example:**
```
🚀 Starting Proline data import with deduplication...

📁 File: exports/proline_sales_insurance_complete.csv
🏢 Tenant ID: 00000000-0000-0000-0000-000000000000

📖 Parsing CSV file...
✅ Found 1162 records

⚙️  Processing records...

✅ Created: Mike Currens (1759354835784x738374090799908400)
✅ Created: Huston Yaden (1759355012345x987654321098765432)
...
   Progress: 10/1162 records processed
   Progress: 20/1162 records processed
   ...

============================================================
📊 IMPORT SUMMARY
============================================================
🆕 Created:  835 new projects
🔄 Updated:  327 existing projects
⏭️  Skipped:  0 records (missing data)
❌ Errors:   0 failed
📈 Total:    1162 projects in database
============================================================

✨ Import complete!
```

### Re-running Import (Safe!)

You can run the same import again - it will UPDATE existing records instead of creating duplicates:

```bash
npx tsx scripts/import-with-deduplication.ts exports/proline_sales_insurance_complete.csv
```

**Output:**
```
============================================================
📊 IMPORT SUMMARY
============================================================
🆕 Created:  0 new projects
🔄 Updated:  1162 existing projects
⏭️  Skipped:  0 records (missing data)
❌ Errors:   0 failed
📈 Total:    1162 projects in database
============================================================
```

✅ **No duplicates!** All 1,162 projects were updated, not duplicated.

---

## Step 4: Verify Import

### Check Project Count

Run this in Supabase SQL Editor:

```sql
-- Total projects
SELECT COUNT(*) as total_projects FROM projects;

-- Projects by pipeline
SELECT
  custom_fields->>'proline_pipeline' as pipeline,
  COUNT(*) as count
FROM projects
WHERE is_deleted = false
GROUP BY custom_fields->>'proline_pipeline'
ORDER BY count DESC;
```

**Expected output:**
```
pipeline            | count
-------------------+-------
SALES INSURANCE    | 1162
PRODUCTION         | 56
BILLING            | 17
CLOSED             | 54
-------------------+-------
TOTAL              | 1289 (excluding OLD RECRUITING)
```

### Check for Duplicates

Run this to verify no duplicates:

```sql
-- Should return 0 rows if no duplicates
SELECT
  proline_id,
  COUNT(*) as duplicate_count
FROM projects
WHERE proline_id IS NOT NULL
GROUP BY proline_id
HAVING COUNT(*) > 1;
```

✅ If this returns 0 rows, you have no duplicates!

---

## How Deduplication Works

### Unique Key: `proline_id`

Every project in Proline has a unique identifier like:
- `1759354835784x738374090799908400`

We store this in our `projects.proline_id` column.

### UPSERT Logic

```typescript
// Check if project exists
const { exists, id } = await projectExists(prolineId)

if (exists) {
  // UPDATE existing record (no duplicate created)
  await supabase
    .from('projects')
    .update({ ...projectData, updated_at: NOW() })
    .eq('proline_id', prolineId)
} else {
  // INSERT new record
  await supabase
    .from('projects')
    .insert(projectData)
}
```

### Benefits

✅ **Safe to re-run** - Import same file 100 times, always 1,391 projects (not 139,100!)
✅ **Data refresh** - Re-export from Proline monthly, re-import to update
✅ **Incremental** - Import partial exports, no risk of duplicates
✅ **Audit trail** - `created_at` vs `updated_at` tracks original import vs updates

---

## Troubleshooting

### Error: "Missing proline_id"

**Cause**: CSV doesn't have ProLine ID column
**Fix**: Check CSV column names. Script looks for:
- `ProLine ID`
- `proline_id`
- `ID`

Make sure your Proline export includes this field.

### Error: "File not found"

**Cause**: Wrong file path
**Fix**: Use absolute path or relative from project root:

```bash
# Absolute path
npx tsx scripts/import-with-deduplication.ts /Users/ccai/exports/proline.csv

# Relative path from project root
npx tsx scripts/import-with-deduplication.ts exports/proline.csv
```

### Error: "Missing Supabase credentials"

**Cause**: `.env.local` not loaded
**Fix**: Make sure `.env.local` exists with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Some projects showing as "Updated: 0"

**Cause**: Data hasn't changed since last import
**Result**: This is normal! The script still ran successfully.

---

## Advanced Usage

### Custom Tenant ID

If you have multiple tenants:

```bash
npx tsx scripts/import-with-deduplication.ts \
  exports/proline.csv \
  12345678-1234-1234-1234-123456789abc
```

### Dry Run (Coming Soon)

To preview what would happen without actually importing:

```bash
npx tsx scripts/import-with-deduplication.ts exports/proline.csv --dry-run
```

(Not yet implemented - let me know if you need this!)

---

## Next Steps

After importing all Proline data:

1. ✅ Verify project counts match Proline (1,391 total)
2. ✅ Spot-check random projects for data accuracy
3. ✅ Review any errors in import summary
4. ✅ Move to Phase 1 Extension (Organizations, Tasks)

---

## Summary

You now have:
- ✅ Database columns for deduplication (`proline_id`, `enzy_user_id`)
- ✅ Import script that prevents duplicates
- ✅ Safe re-import capability (run anytime for data refresh)
- ✅ Clear audit trail (created vs updated timestamps)

**You can now safely import and re-import Proline data without fear of duplicates!** 🎉

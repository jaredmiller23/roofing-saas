# Quick Database Cleanup Instructions

## Option 1: Via Supabase Dashboard (Easiest)

1. **Go to SQL Editor**:
   - Open: https://supabase.com/dashboard/project/pcduofjokergeakxgjpp/sql
   - You should see a SQL editor interface

2. **Run Investigation Query First**:
   ```sql
   -- See how many 403 errors we have
   SELECT COUNT(*) as twilio_errors
   FROM archon_crawled_pages
   WHERE url LIKE '%twilio.com%'
   AND content = '403 ERROR #';
   ```

3. **Clean Up Bad Data**:
   ```sql
   -- Delete all Twilio 403 errors
   DELETE FROM archon_crawled_pages
   WHERE content = '403 ERROR #'
   AND url LIKE '%twilio.com%';
   ```

4. **Verify Our Guides Are Safe**:
   ```sql
   -- Check our uploaded guides are still there
   SELECT source_display_name, total_word_count
   FROM archon_sources
   WHERE source_display_name LIKE '%Implementation%'
   OR source_display_name LIKE '%Guide%';
   ```

## Option 2: Using psql Command Line

If you have the database password:

```bash
# Get connection string from Supabase Dashboard
# Settings > Database > Connection string

# Connect
psql "postgresql://postgres.pcduofjokergeakxgjpp:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres"

# Run cleanup
\i /Users/ccai/Roofing SaaS/ARCHON_DATABASE_CLEANUP.sql
```

## Option 3: Through Archon Server (Docker)

```bash
# Access the Archon server container
docker exec -it archon-server bash

# Use Python to run cleanup
python3 << 'EOF'
import asyncio
from src.server.services.storage.supabase_storage_service import SupabaseStorageService

async def cleanup():
    service = SupabaseStorageService()

    # Delete 403 errors
    result = await service.supabase.table('archon_crawled_pages').delete().eq('content', '403 ERROR #').like('url', '%twilio.com%').execute()
    print(f"Deleted {len(result.data)} Twilio 403 error records")

    # Clean sources
    result = await service.supabase.table('archon_sources').delete().like('source_url', '%twilio.com%').eq('total_word_count', 0).execute()
    print(f"Deleted {len(result.data)} failed Twilio sources")

asyncio.run(cleanup())
EOF
```

## Expected Results After Cleanup

✅ **Before**: ~43 Twilio pages with "403 ERROR #"
✅ **After**: 0 Twilio error pages
✅ **Preserved**: All our implementation guides
✅ **Preserved**: ElevenLabs documentation (if successfully crawled)

## Quick Verification

Run this to confirm cleanup worked:

```sql
SELECT
    CASE
        WHEN url LIKE '%twilio%' THEN 'Twilio Errors'
        WHEN source_display_name LIKE '%Guide%' THEN 'Our Guides'
        ELSE 'Other'
    END as category,
    COUNT(*) as count
FROM archon_crawled_pages
WHERE content = '403 ERROR #'
OR source_display_name LIKE '%Guide%'
GROUP BY category;
```

Should show:
- Twilio Errors: 0
- Our Guides: [some number > 0]

## Why This Works

1. **403 ERROR #** is the exact content stored for failed crawls
2. We only delete Twilio failures, not our uploaded guides
3. Our guides have different source IDs and content
4. This is safe and reversible (we can always re-upload guides)
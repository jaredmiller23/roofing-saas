# Archon Final Upgrade Plan
**Date**: September 30, 2025
**Approach**: Validated implementation with checkpoints
**Goal**: Make Archon production-ready with tested improvements

---

## Phase 1: Pre-Flight Checks & Cleanup ✅

### Task 1.1: Clean Up Project Folders
**Time**: 30 minutes
**Location**: `/Users/ccai/Roofing SaaS/`, `/Users/ccai/archon/`

**Actions**:
1. Remove test scripts from Archon root:
   - `test_mistral_ocr.py`
   - `test_voyage_embeddings.py`
   - Already copied to `python/tests/`

2. Consolidate documentation:
   - Keep: `ARCHON_CODE_ANALYSIS.md` (master reference)
   - Keep: `ARCHON_FINAL_UPGRADE_PLAN.md` (this file)
   - Archive: Old implementation docs
   - Remove: Temporary notes

3. Clean up test files in `/Users/ccai/archon/python/tests/`:
   - Remove: Duplicate test files
   - Keep: Working validated tests

**Validation Checkpoint**:
```bash
# Verify cleanup
ls /Users/ccai/archon/*.py  # Should be empty
ls /Users/ccai/archon/python/tests/test_*direct.py  # Should show only needed tests
ls /Users/ccai/"Roofing SaaS"/*.md | wc -l  # Should be reduced count
```

**Success Criteria**: Clean directory structure, no duplicate files

---

## Phase 2: Fix Critical Bugs 🔧

### Task 2.1: Fix Embedding Dimensions Parameter
**Time**: 1 hour
**File**: `/Users/ccai/archon/python/src/server/services/embeddings/embedding_service.py`
**Priority**: CRITICAL (blocks Voyage provider)

**Problem**:
```python
# Line 224-228: Always passes dimensions, but Voyage rejects it
response = await client.embeddings.create(
    model=embedding_model,
    input=batch,
    dimensions=embedding_dimensions,  # ❌ Breaks Voyage
)
```

**Solution**:
```python
# Get provider info to determine if dimensions parameter is supported
provider_config = await credential_service.get_active_provider("embedding")
provider_name = provider_config["provider"]

# Build request parameters conditionally
create_params = {
    "model": embedding_model,
    "input": batch,
}

# Only OpenAI supports dimensions parameter
if provider_name == "openai":
    create_params["dimensions"] = embedding_dimensions

response = await client.embeddings.create(**create_params)
```

**Changes Required**:
1. Import `credential_service` if not already imported (already is)
2. Replace lines 224-228 with conditional parameter building
3. Add comment explaining provider compatibility

**Validation Checkpoint**:
```bash
# Test with Voyage provider
cd /Users/ccai/archon
docker compose exec archon-server python /app/tests/test_voyage_direct.py

# Should see: ✅ All Voyage-3 tests passed!
```

**Success Criteria**: Voyage embeddings work without dimensions parameter error

---

### Task 2.2: Add Missing EMBEDDING_DIMENSIONS Setting
**Time**: 15 minutes
**File**: Database migration SQL
**Priority**: HIGH (proper configuration)

**Problem**: Python code loads `EMBEDDING_DIMENSIONS` from settings, but schema doesn't create it

**Solution**:
Create migration: `/Users/ccai/archon/migration/add_embedding_dimensions_setting.sql`

```sql
-- Add EMBEDDING_DIMENSIONS setting if it doesn't exist
INSERT INTO archon_settings (key, value, is_encrypted, category, description) VALUES
('EMBEDDING_DIMENSIONS', '1536', false, 'rag_strategy', 'Vector embedding dimensions (must match database VECTOR column type: 1536 for OpenAI, 1024 for Voyage)')
ON CONFLICT (key) DO UPDATE SET
    description = EXCLUDED.description;

-- Add comment
COMMENT ON TABLE archon_settings IS 'Stores application configuration. EMBEDDING_DIMENSIONS must match database VECTOR() type definition.';
```

**Validation Checkpoint**:
```bash
# Run migration via Supabase SQL editor
# Then verify:
docker compose exec archon-server python -c "
import asyncio
from src.server.services.credential_service import credential_service

async def check():
    settings = await credential_service.get_credentials_by_category('rag_strategy')
    print('EMBEDDING_DIMENSIONS:', settings.get('EMBEDDING_DIMENSIONS', 'NOT FOUND'))

asyncio.run(check())
"

# Should see: EMBEDDING_DIMENSIONS: 1536
```

**Success Criteria**: Setting exists in database and loads correctly

---

### Task 2.3: Update Semantic Chunker for Python 3.9 Compatibility
**Time**: 30 minutes
**File**: `/Users/ccai/archon/python/src/server/services/chunking/semantic_chunker.py`
**Priority**: MEDIUM (already fixed, verify integration)

**Current Status**:
- File exists with `from __future__ import annotations`
- Type hints converted to Python 3.9 compatible format
- Tested and working

**Actions**:
1. Verify no Python 3.10+ syntax remains
2. Check imports work in Docker environment
3. Add integration point documentation

**Validation Checkpoint**:
```bash
# Test semantic chunker in Docker
docker compose exec archon-server python /app/tests/test_semantic_chunker.py

# Should see: ✅ All semantic chunker tests passed!
```

**Success Criteria**: Semantic chunker runs without syntax errors

---

## Phase 3: Configuration & Database Setup 🗄️

### Task 3.1: Add Voyage API Key to Database
**Time**: 10 minutes
**Tool**: Archon UI or SQL

**Via UI** (Recommended):
1. Go to http://localhost:3737
2. Settings → API Keys
3. Add: `VOYAGE_API_KEY` = `pa-VhIxx4Xaj3rjtmW4pGQRybEY18kzXjdlI87HAvGpG3G`

**Via SQL**:
```sql
-- Encrypt and store Voyage API key
INSERT INTO archon_settings (key, encrypted_value, is_encrypted, category, description) VALUES
('VOYAGE_API_KEY', crypt('pa-VhIxx4Xaj3rjtmW4pGQRybEY18kzXjdlI87HAvGpG3G', gen_salt('bf')), true, 'api_keys', 'Voyage AI API key for embeddings')
ON CONFLICT (key) DO UPDATE SET
    encrypted_value = EXCLUDED.encrypted_value;
```

**Validation Checkpoint**:
```bash
# Test Voyage client creation via llm_provider_service
docker compose exec archon-server python -c "
import asyncio
from src.server.services.llm_provider_service import get_llm_client, get_embedding_model

async def test():
    async with get_llm_client(provider='voyage', use_embedding_provider=True) as client:
        model = await get_embedding_model(provider='voyage')
        print(f'✅ Voyage client created, model: {model}')

asyncio.run(test())
"
```

**Success Criteria**: Voyage client creates without "API key not found" error

---

### Task 3.2: Enable Contextual Embeddings
**Time**: 5 minutes
**Priority**: MEDIUM (quick win)

**Action**:
```sql
-- Enable contextual embeddings (already fully implemented)
UPDATE archon_settings
SET value = 'true'
WHERE key = 'USE_CONTEXTUAL_EMBEDDINGS';

-- Optionally adjust worker count (default is 3)
UPDATE archon_settings
SET value = '4'
WHERE key = 'CONTEXTUAL_EMBEDDINGS_MAX_WORKERS';
```

**Validation Checkpoint**:
```bash
# Verify setting loaded
docker compose exec archon-server python -c "
import asyncio
from src.server.services.credential_service import credential_service

async def check():
    val = await credential_service.get_credential('USE_CONTEXTUAL_EMBEDDINGS', 'false')
    print('Contextual embeddings:', val)

asyncio.run(check())
"
```

**Success Criteria**: Returns 'true'

---

### Task 3.3: Document Current Configuration
**Time**: 15 minutes
**File**: `/Users/ccai/archon/CURRENT_CONFIG.md`

**Action**: Create snapshot of active settings:
```bash
# Extract current configuration
docker compose exec archon-server python -c "
import asyncio
from src.server.services.credential_service import credential_service

async def dump():
    rag = await credential_service.get_credentials_by_category('rag_strategy')
    print('=== RAG Strategy Settings ===')
    for k, v in sorted(rag.items()):
        print(f'{k}: {v}')

asyncio.run(dump())
" > /Users/ccai/archon/CURRENT_CONFIG.md
```

**Success Criteria**: Config file shows all active settings

---

## Phase 4: Optional Enhancements 🚀

### Task 4.1: Integrate Semantic Chunker (OPTIONAL)
**Time**: 3-4 hours
**Priority**: LOW (marginal improvement)
**Decision Point**: Only proceed if we want better code block preservation

**Investigation Required**:
1. Find where chunking currently happens (likely `crawling_service.py`)
2. Assess current chunking quality
3. Decide if semantic chunking worth the integration effort

**If Proceeding**:

**Step 1**: Locate chunking logic
```bash
grep -r "chunk" /Users/ccai/archon/python/src/server/services/crawling/ | grep -i "def\|class"
```

**Step 2**: Add configuration
```sql
INSERT INTO archon_settings (key, value, category, description) VALUES
('CHUNKING_STRATEGY', 'semantic', 'rag_strategy', 'Chunking strategy: semantic or fixed')
ON CONFLICT (key) DO NOTHING;

INSERT INTO archon_settings (key, value, category, description) VALUES
('CHUNK_SIZE', '4000', 'rag_strategy', 'Maximum chunk size in characters'),
('CHUNK_MIN_SIZE', '500', 'rag_strategy', 'Minimum chunk size in characters'),
('CHUNK_OVERLAP', '200', 'rag_strategy', 'Character overlap between chunks')
ON CONFLICT (key) DO NOTHING;
```

**Step 3**: Integrate semantic chunker into crawling pipeline

**Validation Checkpoint**:
```bash
# Crawl a test page with code examples
# Verify code blocks not split mid-function
# Compare chunk boundaries before/after
```

**Success Criteria**: Code blocks preserved across chunk boundaries

**GO/NO-GO Decision**: Evaluate if improvement justifies integration time

---

### Task 4.2: Database Migration for Voyage (OPTIONAL)
**Time**: 6-8 hours (includes re-embedding)
**Priority**: LOW (requires downtime, data re-processing)
**Decision Point**: Only if we commit to Voyage as primary provider

**Risk Assessment**:
- Requires altering vector column type
- All existing embeddings must be recreated
- Downtime during migration
- Cannot easily revert

**If Proceeding**:

**Step 1**: Create migration SQL
```sql
-- migration/migrate_to_1024_dimensions.sql

-- Drop existing indexes on embedding columns
DROP INDEX IF EXISTS archon_crawled_pages_embedding_idx;
DROP INDEX IF EXISTS archon_code_examples_embedding_idx;

-- Alter vector dimensions
ALTER TABLE archon_crawled_pages
ALTER COLUMN embedding TYPE vector(1024);

ALTER TABLE archon_code_examples
ALTER COLUMN embedding TYPE vector(1024);

-- Recreate indexes
CREATE INDEX archon_crawled_pages_embedding_idx
ON archon_crawled_pages USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX archon_code_examples_embedding_idx
ON archon_code_examples USING ivfflat (embedding vector_cosine_ops);

-- Update SQL functions (all functions with vector(1536) parameter)
CREATE OR REPLACE FUNCTION hybrid_search_archon_crawled_pages(
    query_embedding vector(1024),  -- Changed from 1536
    query_text TEXT,
    match_count INT DEFAULT 10,
    filter JSONB DEFAULT '{}'::jsonb,
    source_filter TEXT DEFAULT NULL
)
-- ... rest of function
```

**Step 2**: Update configuration
```sql
UPDATE archon_settings
SET value = '1024'
WHERE key = 'EMBEDDING_DIMENSIONS';

UPDATE archon_settings
SET value = 'voyage'
WHERE key = 'LLM_PROVIDER';  -- Or whatever the embedding provider setting is
```

**Step 3**: Clear and re-embed all content
```sql
-- Backup first!
TRUNCATE archon_crawled_pages CASCADE;
TRUNCATE archon_code_examples CASCADE;
-- Then re-crawl everything
```

**Validation Checkpoint**:
```bash
# Verify new embeddings are 1024 dims
docker compose exec archon-server python -c "
import asyncio
from src.utils import get_supabase_client

async def check():
    client = get_supabase_client()
    result = client.table('archon_crawled_pages').select('embedding').limit(1).execute()
    if result.data:
        embedding = result.data[0]['embedding']
        print(f'Embedding dimensions: {len(embedding)}')

asyncio.run(check())
"
```

**Success Criteria**: Embeddings are 1024 dimensions, search works

**GO/NO-GO Decision**: Consider staying with OpenAI 1536-dim for now

---

### Task 4.3: Mistral OCR Integration (ON HOLD)
**Time**: TBD
**Status**: BLOCKED - Mistral API unavailable
**Priority**: LOW - new capability, not critical

**Blockers**:
1. Mistral OCR API returning 500 errors
2. Uncertain correct model name
3. Alternative: GPT-4o or Claude 3.5 Sonnet for vision

**Decision Required**:
- Wait for Mistral API stability?
- Switch to GPT-4o/Claude for vision?
- Skip OCR integration for now?

**Recommendation**: Defer until API issues resolved

---

## Phase 5: Knowledge Base Rebuild 📚

### Task 5.1: Export Current Sources (Backup)
**Time**: 15 minutes

**Action**:
```bash
# Export current sources for reference
docker compose exec archon-server python -c "
import asyncio
from src.utils import get_supabase_client

async def export():
    client = get_supabase_client()
    sources = client.table('archon_sources').select('*').execute()

    with open('/app/sources_backup.json', 'w') as f:
        import json
        json.dump(sources.data, f, indent=2)

asyncio.run(export())
"

# Copy backup out
docker compose cp archon-server:/app/sources_backup.json /Users/ccai/archon/sources_backup.json
```

**Success Criteria**: Backup file created

---

### Task 5.2: Define Target Documentation Sources
**Time**: 30 minutes

**Priority Sources for Roofing SaaS Project**:
1. **Supabase**:
   - https://supabase.com/docs/guides/auth
   - https://supabase.com/docs/guides/database
   - https://supabase.com/docs/guides/storage
   - https://supabase.com/docs/guides/realtime

2. **Next.js 14**:
   - https://nextjs.org/docs/app
   - https://nextjs.org/docs/app/building-your-application/routing
   - https://nextjs.org/docs/app/building-your-application/data-fetching

3. **shadcn/ui**:
   - https://ui.shadcn.com/docs
   - https://ui.shadcn.com/docs/components

4. **Tailwind CSS**:
   - https://tailwindcss.com/docs

5. **QuickBooks API**:
   - https://developer.intuit.com/app/developer/qbo/docs/get-started

**Action**: Create source list file

**Success Criteria**: Documented list of sources to crawl

---

### Task 5.3: Clear Existing Data
**Time**: 10 minutes
**WARNING**: Destructive operation

**Action**:
```sql
-- Via Supabase SQL Editor
TRUNCATE archon_crawled_pages CASCADE;
TRUNCATE archon_code_examples CASCADE;
DELETE FROM archon_sources;
```

**Validation**: Tables empty

---

### Task 5.4: Crawl New Sources
**Time**: 2-4 hours (depends on size)

**Action**: Via Archon UI
1. Go to http://localhost:3737
2. Knowledge Base → Crawl Website
3. For each source, enter URL and crawl
4. Monitor progress and errors

**Validation Checkpoint**: After each source
```bash
# Check crawl results
docker compose exec archon-server python -c "
import asyncio
from src.utils import get_supabase_client

async def check():
    client = get_supabase_client()

    # Count pages by source
    result = client.rpc('get_source_stats').execute()

    for row in result.data:
        print(f'{row[\"source_id\"]}: {row[\"page_count\"]} pages')

asyncio.run(check())
"
```

**Success Criteria**: All target sources crawled, reasonable page counts

---

### Task 5.5: Validate Search Quality
**Time**: 1 hour

**Test Queries**:
```bash
# Via MCP or UI, test these searches:
1. "Next.js authentication with Supabase" → Should return auth guides
2. "shadcn form component" → Should return form docs
3. "QuickBooks OAuth setup" → Should return OAuth guide
4. "Tailwind responsive design" → Should return responsive docs
5. "Supabase Row Level Security" → Should return RLS docs
```

**Validation Checkpoint**:
- Results are relevant
- Top 3 results match expected docs
- No Python/n8n docs appearing

**Success Criteria**: 80%+ of queries return correct docs in top 3

---

## Phase 6: Final Validation & Documentation ✅

### Task 6.1: Run Full Test Suite
**Time**: 30 minutes

**Action**:
```bash
cd /Users/ccai/archon

# Run all tests
docker compose exec archon-server python -m pytest tests/ -v

# Run specific integration tests
docker compose exec archon-server python tests/test_rag_simple.py
docker compose exec archon-server python tests/test_voyage_direct.py
docker compose exec archon-server python tests/test_semantic_chunker.py
```

**Success Criteria**: All tests pass

---

### Task 6.2: Performance Baseline
**Time**: 30 minutes

**Metrics to Capture**:
1. Query response time (vector search)
2. Query response time (hybrid search)
3. Embedding creation time (batch of 100)
4. Crawl throughput (pages/minute)

**Action**: Run benchmark script

**Success Criteria**: Metrics documented for future comparison

---

### Task 6.3: Update Documentation
**Time**: 1 hour

**Files to Update**:
1. `/Users/ccai/archon/README.md` - Note Voyage support
2. `/Users/ccai/archon/CLAUDE.md` - Update with findings
3. `/Users/ccai/Roofing SaaS/CLAUDE.md` - Update Archon section
4. Create: `/Users/ccai/archon/CONFIGURATION.md` - Active settings reference

**Success Criteria**: Documentation reflects current state

---

## Summary & Checkpoints

### Mandatory Tasks (Must Complete)
- ✅ Phase 1: Cleanup folders
- ✅ Phase 2: Fix critical bugs (dimensions parameter, missing setting)
- ✅ Phase 3: Configuration (Voyage API key, enable contextual embeddings)

### Recommended Tasks (High Value)
- ✅ Phase 5: Knowledge base rebuild (correct content)
- ✅ Phase 6: Validation

### Optional Tasks (Evaluate GO/NO-GO)
- ⏸️ Phase 4.1: Semantic chunker integration (if worth effort)
- ⏸️ Phase 4.2: Database migration to 1024 dims (if committing to Voyage)
- ⏸️ Phase 4.3: Mistral OCR (blocked by API issues)

### Validation Gates

**Gate 1** (After Phase 2): Bugs Fixed
- Voyage embeddings work without error
- Settings load correctly
- All tests pass

**Gate 2** (After Phase 3): System Configured
- Voyage provider accessible
- Contextual embeddings enabled
- Configuration documented

**Gate 3** (After Phase 5): Content Correct
- Relevant docs crawled
- Search returns correct results
- No wrong content

**Gate 4** (After Phase 6): Production Ready
- All tests pass
- Performance acceptable
- Documentation complete

---

## Execution Order

### Session 1 (Now): Cleanup & Critical Fixes
1. Clean up folders (30 min)
2. Fix dimensions parameter (1 hour)
3. Add missing setting (15 min)
4. Verify tests pass (30 min)
**Checkpoint**: Gate 1 validation

### Session 2: Configuration & Content
5. Add Voyage API key (10 min)
6. Enable contextual embeddings (5 min)
7. Document configuration (15 min)
8. Clear old data (10 min)
9. Crawl new sources (3 hours)
**Checkpoint**: Gate 3 validation

### Session 3: Optional Enhancements (If Desired)
10. Evaluate semantic chunker integration
11. Evaluate Voyage migration
12. Skip OCR for now

### Session 4: Final Validation
13. Run test suite (30 min)
14. Capture baseline metrics (30 min)
15. Update documentation (1 hour)
**Checkpoint**: Gate 4 validation

---

## Risk Management

### High Risk Items
- Database migration (Phase 4.2): Requires downtime, can't easily revert
- Knowledge base rebuild (Phase 5): Time-consuming if sources large

### Mitigation
- Backup before destructive operations
- Test in staging/local first
- Document rollback procedures

### Rollback Plans
- Dimensions fix: Revert code change
- Configuration: Reset settings to defaults
- Content: Restore from backup

---

## Success Definition

**System is production-ready when**:
1. ✅ All critical bugs fixed
2. ✅ Voyage provider works
3. ✅ Contextual embeddings enabled
4. ✅ Correct documentation crawled
5. ✅ Search quality validated (80%+ accuracy)
6. ✅ All tests pass
7. ✅ Configuration documented

**Stretch goals** (nice to have):
- Semantic chunking integrated
- Database migrated to 1024 dims
- OCR capability added

---

## Next Steps

Start with Phase 1: Cleanup folders and validate environment before proceeding to code changes.
# Archon RAG System Upgrade Guide
## Production-Scale Enhancements (Sept 2025)

### 🎯 Overview
This document outlines the enhancements made to transform Archon into a production-scale, future-proof RAG system capable of handling millions of documents.

---

## ✅ Completed Enhancements

### 1. Voyage-3-Large Embedding Integration

**Files Modified**:
- `/Users/ccai/archon/python/src/server/services/llm_provider_service.py`
- `/Users/ccai/archon/python/src/server/services/credential_service.py`

**What Changed**:
- Added Voyage AI as a supported embedding provider
- Configured `voyage-3-large` as the default Voyage model
- Added API key mapping for `VOYAGE_API_KEY`
- Set base URL to `https://api.voyageai.com/v1`

**Configuration Steps**:

1. **Get Voyage AI API Key**:
   - Sign up at https://www.voyageai.com/
   - Navigate to API Keys
   - Create new key (200M free tokens included)

2. **Add to Archon Database**:
   ```sql
   -- Add Voyage API key
   INSERT INTO archon_settings (key, encrypted_value, is_encrypted, category, description)
   VALUES (
     'VOYAGE_API_KEY',
     '[your_encrypted_key_here]',
     true,
     'api_keys',
     'Voyage AI API Key for voyage-3-large embeddings'
   );

   -- Set embedding provider
   UPDATE archon_settings
   SET value = 'voyage'
   WHERE key = 'embedding_provider';

   -- Set embedding model
   UPDATE archon_settings
   SET value = 'voyage-3-large'
   WHERE key = 'EMBEDDING_MODEL';

   -- Update dimensions for Voyage (1024 vs OpenAI's 1536)
   UPDATE archon_settings
   SET value = '1024'
   WHERE key = 'EMBEDDING_DIMENSIONS';
   ```

3. **Enable Contextual Embeddings** (Already Built):
   ```sql
   UPDATE archon_settings
   SET value = 'true'
   WHERE key = 'USE_CONTEXTUAL_EMBEDDINGS';
   ```

**Benefits**:
- **Better Accuracy**: 9.74% improvement over OpenAI v3-large
- **Lower Storage**: 33% smaller vectors (1024 vs 1536 dims)
- **Free Tier**: 200M tokens free (covers initial rebuild)
- **Matryoshka Support**: Can query at 512/256/128 dims for speed

---

## 📋 Next Steps (In Progress)

### 2. Semantic Chunking Service
**Status**: Implementation starting
**Purpose**: Chunk documents at meaning boundaries, not arbitrary character counts
**Benefits**:
- Code examples stay intact
- API docs chunked by endpoint
- Better search relevance

### 3. Mistral OCR Integration
**Status**: Planned
**Purpose**: Handle PDFs, images, screenshots
**Benefits**:
- Process any documentation format
- 95% accuracy (best-in-class)
- $1 per 1000 pages

### 4. Matryoshka Adaptive Retrieval
**Status**: Planned
**Purpose**: Multi-stage search (fast filter → accurate rerank)
**Benefits**:
- 14x faster for large-scale search
- No accuracy loss
- Scales to millions of documents

---

## 🔄 Migration Strategy

### Phase 1: Foundation (Current)
1. ✅ Add Voyage-3 provider support
2. ✅ Update credential service
3. ⏳ Configure database settings
4. ⏳ Test with sample embeddings

### Phase 2: Clean Rebuild
1. Export current valid sources (Twilio, ElevenLabs, your docs)
2. Truncate old data:
   ```sql
   TRUNCATE archon_crawled_pages, archon_code_examples, archon_sources CASCADE;
   ```
3. Recrawl with Voyage-3 embeddings
4. Validate search quality

### Phase 3: Advanced Features
5. Deploy semantic chunking
6. Add Mistral OCR preprocessing
7. Implement Matryoshka retrieval
8. Performance tuning

---

## 🧪 Testing Voyage-3 Integration

### Test 1: Verify Provider Available
```python
# In Archon Python environment
from src.server.services.llm_provider_service import get_llm_client, get_embedding_model

async def test_voyage():
    async with get_llm_client(provider="voyage", use_embedding_provider=True) as client:
        model = await get_embedding_model(provider="voyage")
        print(f"Model: {model}")  # Should print: voyage-3-large

        # Test embedding creation
        response = await client.embeddings.create(
            model=model,
            input=["Test document for Voyage-3"],
            dimensions=1024
        )
        print(f"Embedding length: {len(response.data[0].embedding)}")  # Should be 1024
```

### Test 2: Compare Search Quality
```python
# Before (OpenAI) vs After (Voyage)
# Query: "Next.js authentication with Supabase"
# Expected: Should return Supabase auth docs, not Salesforce/n8n
```

---

## 📊 Cost Projections

### Current Scale (Post-Cleanup):
- ~20 high-quality sources
- ~10,000 chunks
- ~10M tokens

**Embedding Cost**:
- First rebuild: **$0** (free tier covers 200M tokens)
- Weekly updates: ~$0.50/week
- Monthly full refresh: ~$1.20/month

**Storage Savings**:
- OpenAI: 1536 dims × 10K chunks = 15.36M values
- Voyage: 1024 dims × 10K chunks = 10.24M values
- **Savings**: 33% reduction in vector DB storage

### Future Scale (1M Documents):
- 1M chunks × 1000 tokens = 1B tokens
- Embedding cost: 1B × $0.12/M = **$120** (one-time)
- Ongoing updates: ~$10-20/month

---

## 🔧 Troubleshooting

### Issue: "Voyage AI API key not found"
**Solution**: Ensure `VOYAGE_API_KEY` is in `archon_settings` with `is_encrypted=true`

### Issue: "Dimension mismatch in vector DB"
**Solution**:
1. Check `EMBEDDING_DIMENSIONS` setting (should be 1024 for Voyage)
2. If migrating from OpenAI, you'll need to rebuild embeddings (can't mix 1536 and 1024)

### Issue: "Embeddings are still using OpenAI"
**Solution**:
1. Verify `embedding_provider` setting is set to 'voyage'
2. Clear settings cache (restart Archon server)
3. Check logs for provider initialization

---

## 📖 References

- Voyage AI Docs: https://docs.voyageai.com/
- Voyage-3-Large Announcement: https://blog.voyageai.com/2025/01/07/voyage-3-large/
- Matryoshka Embeddings: https://supabase.com/blog/matryoshka-embeddings
- Archon GitHub: https://github.com/yourusername/archon (update with actual URL)

---

## 🚀 Next Session Tasks

1. Run migration SQL to configure Voyage-3
2. Test embedding creation with sample documents
3. Begin semantic chunking implementation
4. Plan Mistral OCR integration strategy

**Status**: Foundation complete, ready for database configuration.
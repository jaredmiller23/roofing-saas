# Roofing Knowledge Base Setup Guide

The voice assistant now has access to a comprehensive roofing knowledge base powered by semantic search using OpenAI embeddings.

## Overview

**What's Included:**
- 13 seed knowledge entries covering warranties, materials, installation, codes, safety, pricing, and troubleshooting
- Vector similarity search using pgvector
- Full-text search fallback
- Multi-tenant support (global + tenant-specific knowledge)
- Analytics tracking for search queries

**Cost:**
- Embeddings: ~$0.0001 per knowledge entry (one-time cost)
- Search queries: ~$0.000004 per search
- 13 seed entries: ~$0.0013 total

## Setup Steps

### 1. Verify Database Migration

The migration `20251004_roofing_knowledge_base.sql` should already be applied. Verify:

```bash
# Check if tables exist
npx supabase db diff
```

You should see:
- ✅ `roofing_knowledge` table
- ✅ `knowledge_search_queries` table
- ✅ 13 seed entries (without embeddings yet)

### 2. Generate Embeddings for Seed Data

Run this command to generate embeddings for all knowledge entries:

```bash
curl -X POST http://localhost:3000/api/knowledge/generate-embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

**Expected Output:**
```json
{
  "message": "Embeddings generated successfully",
  "processed": 13,
  "total": 13,
  "totalTokens": ~3500,
  "estimatedCost": "$0.0007"
}
```

**Note:** You need to be logged in as an admin to run this endpoint.

### 3. Test Knowledge Search

Try searching the knowledge base:

```bash
curl -X POST http://localhost:3000/api/knowledge/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "query": "What is the GAF System Plus warranty?",
    "limit": 3
  }'
```

**Expected Output:**
```json
{
  "results": [
    {
      "id": "...",
      "title": "GAF System Plus Warranty",
      "content": "GAF System Plus warranty provides 50-year non-prorated coverage...",
      "category": "warranties",
      "subcategory": "shingles",
      "manufacturer": "GAF",
      "similarity": 0.92
    }
  ],
  "query": "What is the GAF System Plus warranty?",
  "tokens_used": 12,
  "threshold": 0.7
}
```

### 4. Test Voice Assistant Integration

Start a voice session and ask:
- "What's the GAF warranty coverage?"
- "Tell me about ice and water shield"
- "What are the Tennessee roofing codes?"
- "How do I diagnose a roof leak?"

The assistant will now provide accurate, detailed answers from the knowledge base!

## Knowledge Categories

The seed data includes 8 categories:

1. **warranties** - Manufacturer warranty details (GAF, Owens Corning, CertainTeed)
2. **materials** - Shingle types, underlayment, materials
3. **installation** - Nailing patterns, valley methods, best practices
4. **codes** - Tennessee building codes and requirements
5. **safety** - OSHA requirements, fall protection
6. **pricing** - Tennessee cost breakdowns and estimates
7. **troubleshooting** - Leak diagnosis, common issues
8. **manufacturer** - Specific brand information

## Adding Custom Knowledge

### Via API

```bash
curl -X POST http://localhost:3000/api/knowledge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "title": "Copper Flashing Installation",
    "content": "Copper flashing should be installed with...",
    "category": "installation",
    "subcategory": "flashing",
    "manufacturer": null,
    "tags": ["copper", "metal", "flashing"],
    "is_global": true,
    "generate_embedding": true
  }'
```

### Via Database

```sql
INSERT INTO roofing_knowledge (
  title, content, category, subcategory,
  manufacturer, is_global, tags
) VALUES (
  'Your Title',
  'Your detailed content...',
  'materials',
  'metal',
  'Acme Roofing',
  true,
  ARRAY['metal', 'commercial']
);

-- Then generate embedding via API
-- POST /api/knowledge/generate-embeddings
```

## Search Configuration

### Similarity Threshold
- **Default**: 0.7 (70% similarity required)
- **Strict**: 0.8+ (more precise, fewer results)
- **Loose**: 0.6+ (more results, less precise)

### Result Limit
- **Default**: 5 results
- **Voice Assistant**: 3 results (for concise responses)
- **UI Search**: 10 results (for comprehensive display)

## API Endpoints

### Search Knowledge Base
```
POST /api/knowledge/search
Body: { query: string, category?: string, threshold?: number, limit?: number }
```

### Generate Embeddings
```
POST /api/knowledge/generate-embeddings
(Admin only, no body required)
```

### List Knowledge
```
GET /api/knowledge?category=warranties&manufacturer=GAF
```

### Add Knowledge
```
POST /api/knowledge
Body: { title, content, category, ... }
```

### Update Knowledge
```
PATCH /api/knowledge
Body: { id, regenerate_embedding?: boolean, ... }
```

### Delete Knowledge (Soft Delete)
```
DELETE /api/knowledge?id=<uuid>
```

## Voice Assistant Integration

The voice assistant automatically uses the knowledge base when users ask:
- "What's the warranty on..."
- "How do I install..."
- "What are the codes for..."
- "Tell me about..."
- "Search for..."

The assistant receives:
1. Top 3 most relevant results
2. A formatted summary combining the results
3. Metadata (category, manufacturer, etc.)

## Analytics

All searches are logged to `knowledge_search_queries` for:
- Popular search terms
- Low-relevance queries (improve content)
- Usage patterns by user/tenant
- Effectiveness metrics

Query the analytics:
```sql
SELECT
  query_text,
  COUNT(*) as search_count,
  AVG(relevance_score) as avg_relevance,
  COUNT(DISTINCT user_id) as unique_users
FROM knowledge_search_queries
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY query_text
ORDER BY search_count DESC
LIMIT 20;
```

## Maintenance

### Update Embeddings
When content changes:
```bash
curl -X PATCH http://localhost:3000/api/knowledge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "id": "<knowledge-id>",
    "content": "Updated content...",
    "regenerate_embedding": true
  }'
```

### Verify Embeddings
```sql
SELECT
  id, title,
  CASE WHEN embedding IS NULL THEN 'Missing' ELSE 'Present' END as embedding_status
FROM roofing_knowledge
WHERE is_active = true;
```

### Cost Monitoring
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as searches,
  COUNT(*) * 0.000004 as estimated_cost
FROM knowledge_search_queries
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Troubleshooting

### Embeddings Not Generated
```bash
# Check API key
echo $OPENAI_API_KEY

# Regenerate manually
curl -X POST http://localhost:3000/api/knowledge/generate-embeddings \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

### Low Relevance Scores
- Lower the threshold to 0.6
- Add more specific keywords to content
- Use multiple knowledge entries for related topics
- Check query phrasing

### Voice Assistant Not Using Knowledge Base
1. Check `/api/voice/search-rag` is working
2. Verify embeddings exist (run generate-embeddings)
3. Test direct API call to confirm results
4. Check browser console for errors

## Next Steps

1. ✅ Generate embeddings for seed data
2. ✅ Test voice assistant with knowledge queries
3. 📝 Add tenant-specific knowledge (installation procedures, pricing, etc.)
4. 📊 Monitor search analytics to improve content
5. 🔄 Schedule monthly embedding regeneration for updated content

---

## Setup Complete! 🎉

Your voice assistant now has instant access to roofing expertise. Field reps can ask about:
- Warranty details
- Material specifications
- Installation best practices
- Building codes
- Safety requirements
- Cost estimates
- Troubleshooting tips

All through natural voice conversation!

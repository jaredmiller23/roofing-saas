# Full Database Re-Embedding Plan
**Date**: September 29, 2025
**Current Status**: 13 project docs re-embedded, 50% search improvement

## 📊 Database Statistics
- **Total chunks**: 43,216
- **Already re-embedded**: 13 (project docs)
- **Remaining**: 43,203
- **Current embeddings**: Cohere embed-multilingual-v3.0 (1024 dims)
- **New embeddings**: OpenAI text-embedding-3-small (1536 dims)

## 💰 Cost Analysis

### OpenAI Embedding Costs
- **Model**: text-embedding-3-small
- **Price**: $0.02 per 1M tokens
- **Estimated tokens per chunk**: ~500 tokens
- **Total tokens**: 43,203 × 500 = 21.6M tokens
- **Embedding cost**: 21.6 × $0.02 = **$0.43**

### Rate Limiting Considerations
- **OpenAI limit**: 3,000 RPM (requests per minute)
- **Safe rate**: 2,500 RPM (with buffer)
- **Time to complete**: 43,203 ÷ 2,500 = ~18 minutes

## 🎯 Prioritized Re-Embedding Strategy

### Phase 1: High-Value Content (Immediate)
**Goal**: Re-embed most valuable content first
**Chunks**: ~5,000
**Cost**: ~$0.05
**Time**: 2 minutes

1. **Project documentation** ✅ Already done (13 chunks)
2. **Roofing-specific content** (search for roofing, construction, contractor keywords)
3. **Business/CRM content** (search for CRM, sales, pipeline keywords)
4. **Integration docs** (Twilio, QuickBooks, Stripe, etc.)

### Phase 2: Technical Documentation (Secondary)
**Goal**: Improve technical search accuracy
**Chunks**: ~15,000
**Cost**: ~$0.15
**Time**: 6 minutes

1. **API documentation** (REST, GraphQL, webhooks)
2. **Framework docs** (Next.js, React, Supabase, n8n)
3. **Code examples** (already have their own table)

### Phase 3: General Knowledge (Optional)
**Goal**: Complete coverage
**Chunks**: ~23,000
**Cost**: ~$0.23
**Time**: 10 minutes

1. **General programming docs**
2. **Third-party service docs**
3. **Community content**

## 🚀 Implementation Script

```python
#!/usr/bin/env python3
"""
Optimized full database re-embedding with prioritization
"""

import os
import time
from typing import List, Dict
import psycopg2
from openai import OpenAI
from tqdm import tqdm
from dotenv import load_dotenv

load_dotenv('.env.reembedding')

class OptimizedReEmbedder:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.conn = psycopg2.connect(os.getenv('SUPABASE_DB_URL'))
        self.model = os.getenv('EMBEDDING_MODEL', 'text-embedding-3-small')

    def get_priority_chunks(self, phase: int) -> List[Dict]:
        """Get chunks based on priority phase"""
        with self.conn.cursor() as cur:
            if phase == 1:
                # High-value content
                cur.execute("""
                    SELECT id, content, source_url, source_display_name
                    FROM archon_crawled_pages cp
                    JOIN archon_sources s ON cp.source_id = s.source_id
                    WHERE embedding IS NULL OR (
                        content ILIKE '%roofing%' OR
                        content ILIKE '%contractor%' OR
                        content ILIKE '%CRM%' OR
                        content ILIKE '%QuickBooks%' OR
                        content ILIKE '%Twilio%' OR
                        content ILIKE '%pipeline%' OR
                        content ILIKE '%invoice%'
                    )
                    LIMIT 5000
                """)
            elif phase == 2:
                # Technical documentation
                cur.execute("""
                    SELECT id, content, source_url, source_display_name
                    FROM archon_crawled_pages cp
                    JOIN archon_sources s ON cp.source_id = s.source_id
                    WHERE embedding IS NULL OR (
                        content ILIKE '%API%' OR
                        content ILIKE '%REST%' OR
                        content ILIKE '%GraphQL%' OR
                        content ILIKE '%Next.js%' OR
                        content ILIKE '%React%' OR
                        content ILIKE '%Supabase%'
                    )
                    LIMIT 15000
                """)
            else:
                # Everything else
                cur.execute("""
                    SELECT id, content, source_url, source_display_name
                    FROM archon_crawled_pages cp
                    JOIN archon_sources s ON cp.source_id = s.source_id
                    WHERE embedding IS NULL
                    LIMIT 25000
                """)

            return cur.fetchall()

    def add_contextual_prefix(self, content: str, source: str) -> str:
        """Add context based on content type"""
        lower_source = source.lower()
        lower_content = content.lower()

        if 'roofing' in lower_source or 'roofing' in lower_content:
            return f"Roofing industry documentation: {content}"
        elif 'quickbooks' in lower_content:
            return f"QuickBooks accounting integration: {content}"
        elif 'twilio' in lower_content:
            return f"Twilio SMS/calling integration: {content}"
        elif 'crm' in lower_content or 'pipeline' in lower_content:
            return f"CRM and sales pipeline management: {content}"
        elif 'api' in lower_content:
            return f"API documentation: {content}"
        else:
            return content

    def reembed_batch(self, chunks: List[Dict], batch_size: int = 100):
        """Re-embed chunks in batches for efficiency"""
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i+batch_size]

            # Generate embeddings for batch
            texts = [self.add_contextual_prefix(c['content'], c['source_display_name'])
                     for c in batch]

            response = self.client.embeddings.create(
                model=self.model,
                input=texts
            )

            # Update database
            with self.conn.cursor() as cur:
                for chunk, embedding in zip(batch, response.data):
                    embedding_str = '[' + ','.join(map(str, embedding.embedding)) + ']'
                    cur.execute(
                        "UPDATE archon_crawled_pages SET embedding = %s::vector WHERE id = %s",
                        (embedding_str, chunk['id'])
                    )
                self.conn.commit()

            # Rate limiting
            time.sleep(0.1)

def main():
    embedder = OptimizedReEmbedder()

    print("🚀 Optimized Re-Embedding Plan")
    print("=" * 60)

    # Phase 1: High-value content
    print("\n📌 Phase 1: High-Value Content (5,000 chunks)")
    chunks = embedder.get_priority_chunks(1)
    print(f"Found {len(chunks)} high-value chunks")

    if input("Re-embed Phase 1? (y/n): ").lower() == 'y':
        with tqdm(total=len(chunks), desc="Phase 1") as pbar:
            embedder.reembed_batch(chunks)
            pbar.update(len(chunks))
        print("✅ Phase 1 complete!")

    # Phase 2: Technical docs
    print("\n📚 Phase 2: Technical Documentation (15,000 chunks)")
    if input("Continue to Phase 2? (y/n): ").lower() == 'y':
        chunks = embedder.get_priority_chunks(2)
        with tqdm(total=len(chunks), desc="Phase 2") as pbar:
            embedder.reembed_batch(chunks)
            pbar.update(len(chunks))
        print("✅ Phase 2 complete!")

    # Phase 3: Everything else
    print("\n📦 Phase 3: General Knowledge (23,000 chunks)")
    print("⚠️  This will cost approximately $0.23")
    if input("Continue to Phase 3? (y/n): ").lower() == 'y':
        chunks = embedder.get_priority_chunks(3)
        with tqdm(total=len(chunks), desc="Phase 3") as pbar:
            embedder.reembed_batch(chunks)
            pbar.update(len(chunks))
        print("✅ Phase 3 complete!")

    print("\n🎉 Re-embedding complete!")
    print("Total cost: ~$0.43")

if __name__ == "__main__":
    main()
```

## ⚡ Quick Start Commands

```bash
# Test with Phase 1 only (high-value content)
python3 reembed_optimized.py --phase 1

# Run all phases with confirmation prompts
python3 reembed_optimized.py --interactive

# Run everything automatically (no prompts)
python3 reembed_optimized.py --all --no-confirm
```

## 🎯 Success Metrics

### Expected Improvements
- **Project doc searches**: 50% → 80% accuracy
- **Technical searches**: 60% → 85% accuracy
- **Business searches**: 30% → 60% accuracy

### Testing Plan
1. Run Phase 1 first (5,000 chunks, $0.05)
2. Test with 10 diverse queries
3. If >70% success rate, proceed to Phase 2
4. If Phase 2 shows improvement, complete Phase 3

## 🔧 Alternative: Hybrid Approach

Instead of full re-embedding, consider:

1. **Keep existing embeddings** for technical content
2. **Re-embed only**:
   - Content with "roofing" keywords
   - Business/CRM content
   - Integration documentation
3. **Add Cohere reranking** on top for better results

This would reduce cost to ~$0.10 and time to ~5 minutes.

## 📝 Next Steps

1. **Review this plan** and decide on approach
2. **Run Phase 1** as a test ($0.05 cost)
3. **Measure improvement** with diverse queries
4. **Decide on full re-embedding** based on results

## 🚨 Important Notes

- Always backup the database before bulk operations
- Monitor OpenAI API usage to avoid rate limits
- Consider running during off-peak hours
- The embedding column in Archon DB uses pgvector extension
- New embeddings are 1536-dimensional (vs current 1024)
#!/usr/bin/env python3
"""
Create Knowledge Base Infrastructure Project in Archon

Sets up a complete local knowledge base system for autonomous agents:
- PostgreSQL + pgvector
- Embedding pipeline
- Content ingestion
- Search/retrieval
- Harness integration
"""

import asyncio
import httpx
from datetime import datetime

ARCHON_BASE_URL = "http://localhost:8181"
PROJECT_NAME = "Knowledge Base Infrastructure"
PROJECT_DESCRIPTION = """
Build a local knowledge base system for autonomous agents using:
- PostgreSQL + pgvector for vector storage
- Ollama for local embeddings (nomic-embed-text)
- Python pipeline for content ingestion
- Integration with the autonomous agent harness

Hardware: Mac Studio M3 Ultra (96GB)
Goal: 100% local, zero ongoing costs, production-ready

Based on: KNOWLEDGE_BASE_ARCHITECTURE.md
"""

TASKS = [
    # Phase 1: Foundation
    {
        "title": "Install and Configure PostgreSQL + pgvector",
        "description": """Set up PostgreSQL with vector extension.

**Steps**:
1. Install PostgreSQL 16 via Homebrew
   ```bash
   brew install postgresql@16
   brew services start postgresql@16
   ```

2. Create database:
   ```bash
   createdb autonomous_kb
   ```

3. Enable pgvector extension:
   ```sql
   CREATE EXTENSION vector;
   ```

4. Verify installation:
   ```sql
   SELECT * FROM pg_available_extensions WHERE name = 'vector';
   ```

**Success Criteria**:
- PostgreSQL running and accessible
- pgvector extension enabled
- Test query executes successfully

**Deliverable**: PostgreSQL database ready for vectors

**Time**: 30 minutes
""",
        "priority": 100,
        "feature": "infrastructure",
        "estimated_hours": 0.5,
        "dependencies": []
    },

    {
        "title": "Create Knowledge Base Schema",
        "description": """Design and create database schema for knowledge storage.

**Schema**:
```sql
CREATE TABLE knowledge_base (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  source_file TEXT,
  source_type TEXT,  -- 'docs', 'code', 'prd', 'adr'
  chunk_index INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Vector similarity index (IVFFlat)
CREATE INDEX ON knowledge_base
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Metadata index for filtering
CREATE INDEX ON knowledge_base USING gin (metadata);

-- Source file index
CREATE INDEX ON knowledge_base (source_file);
```

**Success Criteria**:
- Tables created
- Indexes built
- Test insert/query works

**Deliverable**: SQL schema file + migration script

**Time**: 1 hour
""",
        "priority": 100,
        "feature": "infrastructure",
        "estimated_hours": 1,
        "dependencies": ["Install and Configure PostgreSQL + pgvector"]
    },

    {
        "title": "Set Up Ollama for Local Embeddings",
        "description": """Install Ollama and download embedding model.

**Steps**:
1. Install Ollama:
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. Pull embedding model:
   ```bash
   ollama pull nomic-embed-text
   ```

3. Test embedding generation:
   ```python
   import ollama
   response = ollama.embeddings(
       model="nomic-embed-text",
       prompt="Hello world"
   )
   print(f"Embedding dim: {len(response['embedding'])}")
   ```

**Success Criteria**:
- Ollama installed and running
- nomic-embed-text model available
- Can generate 768-dim embeddings

**Deliverable**: Working local embedding service

**Time**: 30 minutes
""",
        "priority": 100,
        "feature": "infrastructure",
        "estimated_hours": 0.5,
        "dependencies": []
    },

    # Phase 2: Content Processing
    {
        "title": "Build Document Chunking Pipeline",
        "description": """Create intelligent document chunking system.

**Features**:
- Markdown-aware splitting (preserve headers)
- Code block preservation
- Semantic chunking (don't split mid-sentence)
- Overlap between chunks (100 words)
- Metadata extraction (title, section, type)

**Implementation**:
```python
class DocumentChunker:
    def __init__(self, chunk_size=500, overlap=100):
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk_markdown(self, content, source_file):
        # Split by headers first
        # Then by paragraphs
        # Preserve code blocks
        # Add overlap
        pass

    def extract_metadata(self, chunk, source_file):
        # Extract title, section, code language
        pass
```

**Success Criteria**:
- Preserves document structure
- No split code blocks
- Sensible chunk boundaries
- Metadata captured

**Deliverable**: Python chunking library

**Time**: 3 hours
""",
        "priority": 90,
        "feature": "ingestion",
        "estimated_hours": 3,
        "dependencies": []
    },

    {
        "title": "Create Embedding Pipeline",
        "description": """Build pipeline to generate and store embeddings.

**Pipeline**:
1. Read documents
2. Chunk content
3. Generate embeddings (batched)
4. Store in PostgreSQL
5. Track progress (resume on failure)

**Implementation**:
```python
class EmbeddingPipeline:
    def __init__(self, db_conn, embedding_model="nomic-embed-text"):
        self.db = db_conn
        self.model = embedding_model

    def process_directory(self, path, source_type):
        # Scan for documents
        # Chunk each document
        # Generate embeddings (batch)
        # Store in database
        # Show progress bar
        pass

    def embed_text(self, text):
        # Call Ollama
        pass

    def store_chunk(self, chunk, embedding, metadata):
        # Insert into PostgreSQL
        pass
```

**Success Criteria**:
- Batch processing (10 chunks at a time)
- Progress tracking
- Error handling and resume
- Performance: >100 chunks/minute

**Deliverable**: Embedding pipeline script

**Time**: 4 hours
""",
        "priority": 90,
        "feature": "ingestion",
        "estimated_hours": 4,
        "dependencies": ["Set Up Ollama for Local Embeddings", "Build Document Chunking Pipeline"]
    },

    {
        "title": "Ingest Technology Documentation",
        "description": """Index Next.js, React, Supabase, TypeScript docs.

**Content Sources**:
- Next.js: https://nextjs.org/docs (download as markdown)
- React: https://react.dev/reference
- Supabase: https://supabase.com/docs
- TypeScript: https://www.typescriptlang.org/docs/

**Process**:
1. Download/scrape docs
2. Convert to markdown
3. Run through chunking pipeline
4. Generate embeddings
5. Store in knowledge base

**Success Criteria**:
- ~50MB of docs indexed
- ~50K chunks stored
- Test queries return relevant results

**Deliverable**: Technology docs in knowledge base

**Time**: 2 hours
""",
        "priority": 85,
        "feature": "ingestion",
        "estimated_hours": 2,
        "dependencies": ["Create Embedding Pipeline"]
    },

    {
        "title": "Ingest Completed PRD Documentation",
        "description": """Add all completed PRDs to knowledge base.

**Content**:
- 25+ PRD sections from Test PRD/
- Total ~500KB of validated documentation
- Metadata: section number, feature area, validation notes

**Process**:
1. Read all PRD markdown files
2. Extract sections and metadata
3. Chunk preserving structure
4. Generate embeddings
5. Store with proper metadata

**Success Criteria**:
- All PRDs indexed
- Can search across PRDs
- Metadata enables filtering

**Deliverable**: PRD knowledge base

**Time**: 1 hour
""",
        "priority": 85,
        "feature": "ingestion",
        "estimated_hours": 1,
        "dependencies": ["Create Embedding Pipeline"]
    },

    {
        "title": "Extract and Index Code Examples",
        "description": """Find and index reusable code patterns from codebase.

**Strategy**:
1. Search for common patterns:
   - API route handlers
   - Supabase client usage
   - Authentication helpers
   - Database queries
   - Component patterns

2. Extract with context (5 lines before/after)

3. Add metadata:
   - File path
   - Language
   - Pattern type
   - Description

**Success Criteria**:
- 100+ code examples indexed
- Can search by pattern type
- Code is syntactically complete

**Deliverable**: Code example knowledge base

**Time**: 3 hours
""",
        "priority": 80,
        "feature": "ingestion",
        "estimated_hours": 3,
        "dependencies": ["Create Embedding Pipeline"]
    },

    # Phase 3: Retrieval
    {
        "title": "Build Semantic Search System",
        "description": """Create semantic search with filtering.

**Features**:
- Vector similarity search (cosine)
- Metadata filtering (source_type, date)
- Hybrid search (vector + keyword)
- Reranking for quality
- Configurable top-k

**Implementation**:
```python
class KnowledgeBaseSearch:
    def __init__(self, db_conn):
        self.db = db_conn

    def search(self, query, top_k=5, filters=None):
        # 1. Generate query embedding
        # 2. Vector similarity search
        # 3. Apply metadata filters
        # 4. Rerank results
        # 5. Return with similarity scores
        pass

    def hybrid_search(self, query, top_k=5):
        # Combine vector + full-text search
        pass
```

**Success Criteria**:
- Sub-100ms search latency
- Relevant results (manual testing)
- Filtering works correctly

**Deliverable**: Search library

**Time**: 3 hours
""",
        "priority": 90,
        "feature": "retrieval",
        "estimated_hours": 3,
        "dependencies": ["Create Knowledge Base Schema"]
    },

    {
        "title": "Create Search Quality Tests",
        "description": """Build test suite for search quality.

**Test Cases**:
1. Technology questions:
   - "How do I use Supabase RLS?"
   - "Next.js App Router authentication"
   - Expected: Relevant docs returned

2. Code pattern searches:
   - "Example of authenticated API route"
   - Expected: Code examples returned

3. Cross-document queries:
   - "How does email integration work with campaigns?"
   - Expected: Multiple PRD sections

**Metrics**:
- Precision@5 (% relevant in top 5)
- Recall (% relevant docs found)
- MRR (Mean Reciprocal Rank)

**Success Criteria**:
- Precision@5 > 80%
- All test queries return relevant results

**Deliverable**: Test suite + quality metrics

**Time**: 2 hours
""",
        "priority": 80,
        "feature": "retrieval",
        "estimated_hours": 2,
        "dependencies": ["Build Semantic Search System"]
    },

    # Phase 4: Integration
    {
        "title": "Integrate Knowledge Base with Archon MCP",
        "description": """Add knowledge base as Archon MCP tool.

**New MCP Tool**:
```typescript
mcp__kb__semantic_search({
  query: string,
  top_k?: number,
  source_types?: string[],  // ['docs', 'code', 'prd']
})

Returns:
{
  results: [
    {
      content: string,
      similarity: number,
      metadata: object,
      source: string
    }
  ]
}
```

**Implementation**:
- Add tool to Archon MCP server
- Connect to PostgreSQL knowledge base
- Expose via MCP protocol

**Success Criteria**:
- Tool callable from harness
- Returns relevant results
- Performance acceptable (<200ms)

**Deliverable**: Archon MCP integration

**Time**: 4 hours
""",
        "priority": 95,
        "feature": "integration",
        "estimated_hours": 4,
        "dependencies": ["Build Semantic Search System"]
    },

    {
        "title": "Update Harness to Use Knowledge Base",
        "description": """Modify harness to leverage local knowledge base.

**Changes**:
1. Update prompts to mention KB availability
2. Add KB search to allowed tools
3. Encourage agent to search KB before guessing
4. Log KB usage for metrics

**Prompt Addition**:
```markdown
You have access to a local knowledge base via:
mcp__kb__semantic_search(query, top_k, source_types)

Use this to:
- Verify technology usage (search 'docs')
- Find code examples (search 'code')
- Check previous PRD patterns (search 'prd')

Always search KB before making claims about APIs or patterns.
```

**Success Criteria**:
- Harness can call KB
- Agent uses KB proactively
- Quality improves (manual testing)

**Deliverable**: Updated harness code + prompts

**Time**: 2 hours
""",
        "priority": 95,
        "feature": "integration",
        "estimated_hours": 2,
        "dependencies": ["Integrate Knowledge Base with Archon MCP"]
    },

    # Phase 5: Production
    {
        "title": "Build Knowledge Base Admin CLI",
        "description": """Create CLI for KB management.

**Commands**:
```bash
# Index new content
kb index --path ./docs --type docs

# Search knowledge base
kb search "supabase authentication"

# Show statistics
kb stats

# Rebuild index
kb rebuild

# Export/import
kb export --output kb_backup.sql
kb import --input kb_backup.sql
```

**Implementation**: Click or Typer CLI

**Success Criteria**:
- All operations work
- Good error messages
- Progress indicators

**Deliverable**: kb CLI tool

**Time**: 3 hours
""",
        "priority": 70,
        "feature": "tooling",
        "estimated_hours": 3,
        "dependencies": ["Create Embedding Pipeline", "Build Semantic Search System"]
    },

    {
        "title": "Create Continuous Indexing System",
        "description": """Auto-update KB when codebase/docs change.

**Features**:
- Watch file system for changes
- Detect new/modified/deleted docs
- Incrementally update embeddings
- Maintain index consistency

**Implementation**:
```python
class KnowledgeBaseWatcher:
    def __init__(self, watch_paths):
        self.paths = watch_paths

    def watch(self):
        # Use watchdog library
        # On file change:
        #   - Reprocess file
        #   - Update embeddings
        #   - Remove old chunks
        pass
```

**Success Criteria**:
- Detects changes within 10 seconds
- Updates index automatically
- No manual reindexing needed

**Deliverable**: File watcher daemon

**Time**: 4 hours
""",
        "priority": 60,
        "feature": "automation",
        "estimated_hours": 4,
        "dependencies": ["Create Embedding Pipeline"]
    },

    {
        "title": "Performance Optimization & Monitoring",
        "description": """Optimize performance and add monitoring.

**Optimizations**:
1. Query optimization:
   - Index tuning (IVFFlat lists parameter)
   - Query plan analysis
   - Connection pooling

2. Embedding optimization:
   - Batch processing
   - Caching
   - Parallel generation

**Monitoring**:
- Query latency metrics
- Index size tracking
- Search quality metrics
- Usage patterns

**Success Criteria**:
- Search latency < 50ms (p95)
- Indexing > 200 chunks/minute
- Dashboard shows metrics

**Deliverable**: Optimized system + monitoring

**Time**: 4 hours
""",
        "priority": 65,
        "feature": "production",
        "estimated_hours": 4,
        "dependencies": ["Build Semantic Search System", "Create Embedding Pipeline"]
    },

    {
        "title": "Documentation & Deployment Guide",
        "description": """Complete documentation for the KB system.

**Documentation**:
1. Architecture overview
2. Setup guide (step-by-step)
3. Usage examples
4. API reference
5. Troubleshooting
6. Performance tuning guide

**Deployment Guide**:
- Local development setup
- Production deployment
- Backup/restore procedures
- Scaling considerations

**Success Criteria**:
- Someone can set up KB from docs alone
- All common issues covered
- Examples work

**Deliverable**: Complete docs in /docs/kb/

**Time**: 3 hours
""",
        "priority": 75,
        "feature": "documentation",
        "estimated_hours": 3,
        "dependencies": []  # Can write in parallel
    },
]


async def create_project():
    """Create the knowledge base project in Archon."""

    async with httpx.AsyncClient(timeout=30.0) as client:
        print("Creating Knowledge Base Infrastructure project...\n")

        # Create project
        project_data = {
            "title": PROJECT_NAME,
            "description": PROJECT_DESCRIPTION,
            "status": "active",
        }

        response = await client.post(
            f"{ARCHON_BASE_URL}/api/projects",
            json=project_data
        )

        # Extract project_id from response
        result = response.json()
        if "project_id" in result:
            project_id = result["project_id"]
        elif "id" in result:
            project_id = result["id"]
        else:
            print(f"Unexpected response: {result}")
            return

        print(f"✓ Project created: {project_id}\n")

        # Create META task
        meta_task = {
            "project_id": project_id,
            "title": "[META] Knowledge Base Project Tracker",
            "description": f"""
Meta task for tracking knowledge base infrastructure project.

Created: {datetime.now().isoformat()}
Total tasks: {len(TASKS)}

**Goal**: Build production-ready local knowledge base

**Components**:
- PostgreSQL + pgvector
- Local embeddings (Ollama)
- Content ingestion pipeline
- Semantic search
- Harness integration

**Success Criteria**:
- 100% local operation
- Sub-100ms search latency
- 50MB+ content indexed
- Integration with autonomous agents

Session notes and progress updates go here.
""",
            "status": "doing",
            "priority": 100,
            "task_order": 1
        }

        response = await client.post(
            f"{ARCHON_BASE_URL}/api/tasks",
            json=meta_task
        )

        meta_result = response.json()
        print(f"✓ META task created\n")

        # Create tasks
        print(f"Creating {len(TASKS)} tasks...\n")

        for idx, task_def in enumerate(TASKS):
            task_data = {
                "project_id": project_id,
                "title": task_def["title"],
                "description": task_def["description"],
                "status": "todo",
                "priority": task_def["priority"],
                "task_order": task_def["priority"],
                "labels": [task_def["feature"]],
                "estimated_hours": task_def.get("estimated_hours", 0),
            }

            response = await client.post(
                f"{ARCHON_BASE_URL}/api/tasks",
                json=task_data
            )

            if response.status_code == 201:
                print(f"  ✓ [{idx+1:2d}/{len(TASKS)}] {task_def['title']}")
            else:
                print(f"  ✗ [{idx+1:2d}/{len(TASKS)}] {task_def['title']}")

        print(f"\n{'='*70}")
        print("KNOWLEDGE BASE PROJECT CREATED")
        print(f"{'='*70}\n")
        print(f"Project: {PROJECT_NAME}")
        print(f"ID: {project_id}")
        print(f"Tasks: {len(TASKS)}")

        # Show phases
        phases = {}
        total_hours = 0
        for task in TASKS:
            feature = task["feature"]
            phases[feature] = phases.get(feature, 0) + 1
            total_hours += task.get("estimated_hours", 0)

        print(f"\nPhases:")
        for feature, count in sorted(phases.items()):
            print(f"  - {feature}: {count} tasks")

        print(f"\nEstimated effort: {total_hours} hours (~{total_hours/8:.1f} days)")

        print(f"\n{'='*70}")
        print("NEXT STEPS:")
        print("1. Start with Phase 1 (Infrastructure)")
        print("2. Install PostgreSQL + pgvector")
        print("3. Set up Ollama for embeddings")
        print("4. Build ingestion pipeline")
        print("5. Index initial content")
        print(f"{'='*70}\n")

        return project_id


if __name__ == "__main__":
    print(f"\n{'='*70}")
    print("KNOWLEDGE BASE INFRASTRUCTURE SETUP")
    print("Creating Archon project for local KB system")
    print(f"{'='*70}\n")

    asyncio.run(create_project())

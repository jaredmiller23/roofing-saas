#!/usr/bin/env python3
"""
Archon Knowledge Base Re-Embedding Tool
========================================
Re-embeds content using OpenAI's latest embedding models for better search relevance.

Usage:
    python reembed_archon.py --test      # Test with project docs only
    python reembed_archon.py --all       # Re-embed everything
    python reembed_archon.py --search "your query"  # Test search
"""

import os
import sys
import argparse
import time
from typing import List, Dict, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from openai import OpenAI
from tqdm import tqdm
import json

# Load environment variables
load_dotenv('.env.reembedding')

# Configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
DATABASE_URL = os.getenv('SUPABASE_DB_URL')
EMBEDDING_MODEL = os.getenv('EMBEDDING_MODEL', 'text-embedding-3-small')

if not OPENAI_API_KEY:
    print("❌ Error: OPENAI_API_KEY not found in .env.reembedding")
    sys.exit(1)

if not DATABASE_URL:
    print("❌ Error: SUPABASE_DB_URL not found in .env.reembedding")
    sys.exit(1)

class ArchonReEmbedder:
    """Re-embed Archon knowledge base with OpenAI embeddings"""

    def __init__(self):
        self.client = OpenAI(api_key=OPENAI_API_KEY)
        self.conn = psycopg2.connect(DATABASE_URL)
        print(f"✅ Connected to database")
        print(f"✅ Using embedding model: {EMBEDDING_MODEL}")

    def get_stats(self) -> Dict:
        """Get current statistics"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    COUNT(*) as total_chunks,
                    COUNT(embedding) as chunks_with_embeddings,
                    COUNT(CASE WHEN source_url LIKE 'file://%' THEN 1 END) as file_chunks,
                    COUNT(CASE WHEN source_url LIKE 'http%' THEN 1 END) as web_chunks
                FROM archon_crawled_pages cp
                JOIN archon_sources s ON cp.source_id = s.source_id
            """)
            return cur.fetchone()

    def get_project_docs(self) -> List[Dict]:
        """Get project documentation chunks"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    cp.id,
                    cp.content,
                    cp.url,
                    s.source_url,
                    s.source_display_name,
                    s.source_id
                FROM archon_crawled_pages cp
                JOIN archon_sources s ON cp.source_id = s.source_id
                WHERE s.source_url LIKE 'file://%.md'
                AND (
                    LOWER(s.source_url) LIKE '%prd%'
                    OR LOWER(s.source_url) LIKE '%claude%'
                    OR LOWER(s.source_url) LIKE '%roofing%'
                    OR LOWER(s.source_url) LIKE '%knowledge%'
                )
                ORDER BY s.source_display_name, cp.chunk_number
            """)
            return cur.fetchall()

    def create_contextual_content(self, chunk: Dict) -> str:
        """Add context to improve embedding quality"""
        content = chunk['content']
        display_name = chunk['source_display_name']

        # Add strong contextual prefixes for project docs
        if 'PRD.md' in display_name:
            return f"Project Requirements Document for Tennessee Roofing SaaS Platform: {content}"
        elif 'CLAUDE.md' in display_name:
            return f"Developer Implementation Guide for Roofing Project: {content}"
        elif 'knowledge_base_roofing' in display_name:
            return f"Roofing Industry Technical Knowledge Base: {content}"
        elif 'roofing_industry_apis' in display_name:
            return f"Roofing Industry API Integration Documentation: {content}"
        elif 'TWILIO' in display_name:
            return f"Twilio SMS Implementation Guide for Roofing Project: {content}"
        elif 'ESIGNING' in display_name:
            return f"E-Signature Options for Roofing Contracts: {content}"
        else:
            return f"Project Documentation: {content}"

    def generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding using OpenAI"""
        try:
            response = self.client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=text[:8000]  # Ensure we don't exceed token limits
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"❌ Error generating embedding: {e}")
            return None

    def update_embedding(self, chunk_id: int, embedding: List[float]) -> bool:
        """Update embedding in database"""
        try:
            with self.conn.cursor() as cur:
                # Convert to pgvector format
                embedding_str = '[' + ','.join(map(str, embedding)) + ']'
                cur.execute(
                    "UPDATE archon_crawled_pages SET embedding = %s::vector WHERE id = %s",
                    (embedding_str, chunk_id)
                )
                self.conn.commit()
                return True
        except Exception as e:
            print(f"❌ Error updating embedding for chunk {chunk_id}: {e}")
            self.conn.rollback()
            return False

    def reembed_project_docs(self):
        """Re-embed project documentation only"""
        chunks = self.get_project_docs()

        if not chunks:
            print("❌ No project documentation found")
            return

        print(f"\n📚 Found {len(chunks)} project documentation chunks to re-embed")
        print("\nDocuments to process:")

        # Group by source for display
        sources = {}
        for chunk in chunks:
            name = chunk['source_display_name']
            if name not in sources:
                sources[name] = 0
            sources[name] += 1

        for name, count in sources.items():
            print(f"  • {name}: {count} chunks")

        # Confirm before proceeding
        response = input("\n⚠️  This will update embeddings in the database. Continue? (y/n): ")
        if response.lower() != 'y':
            print("Cancelled")
            return

        success_count = 0
        error_count = 0

        with tqdm(total=len(chunks), desc="Re-embedding") as pbar:
            for chunk in chunks:
                # Add context
                contextual_content = self.create_contextual_content(chunk)

                # Generate embedding
                embedding = self.generate_embedding(contextual_content)

                if embedding and self.update_embedding(chunk['id'], embedding):
                    success_count += 1
                else:
                    error_count += 1

                pbar.update(1)
                pbar.set_postfix({"✅": success_count, "❌": error_count})

                # Rate limiting (3000 RPM = 50 RPS max)
                time.sleep(0.02)

        print(f"\n✅ Successfully re-embedded: {success_count} chunks")
        if error_count > 0:
            print(f"❌ Errors: {error_count} chunks")

    def test_search(self, query: str):
        """Test search with current embeddings"""
        print(f"\n🔍 Testing search for: '{query}'")

        # Generate query embedding
        contextual_query = f"Search for roofing project documentation about: {query}"
        embedding = self.generate_embedding(contextual_query)

        if not embedding:
            print("❌ Failed to generate query embedding")
            return

        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            embedding_str = '[' + ','.join(map(str, embedding)) + ']'

            cur.execute("""
                SELECT
                    cp.id,
                    LEFT(cp.content, 200) as content_preview,
                    s.source_display_name,
                    s.source_url,
                    (cp.embedding <=> %s::vector) as distance,
                    1 - (cp.embedding <=> %s::vector) as similarity
                FROM archon_crawled_pages cp
                JOIN archon_sources s ON cp.source_id = s.source_id
                WHERE cp.embedding IS NOT NULL
                ORDER BY cp.embedding <=> %s::vector
                LIMIT 10
            """, (embedding_str, embedding_str, embedding_str))

            results = cur.fetchall()

        print(f"\nTop 10 results:")
        print("-" * 80)

        for i, result in enumerate(results, 1):
            print(f"\n{i}. {result['source_display_name']}")
            print(f"   Similarity: {result['similarity']:.4f}")
            print(f"   Source: {result['source_url'][:50]}...")
            print(f"   Preview: {result['content_preview'][:100]}...")


def main():
    parser = argparse.ArgumentParser(description='Re-embed Archon knowledge base')
    parser.add_argument('--test', action='store_true',
                       help='Re-embed project docs only (for testing)')
    parser.add_argument('--all', action='store_true',
                       help='Re-embed all content (43K+ chunks)')
    parser.add_argument('--search', type=str,
                       help='Test search with query')
    parser.add_argument('--stats', action='store_true',
                       help='Show database statistics')

    args = parser.parse_args()

    embedder = ArchonReEmbedder()

    if args.stats or (not args.test and not args.all and not args.search):
        stats = embedder.get_stats()
        print("\n📊 Archon Knowledge Base Statistics:")
        print(f"  • Total chunks: {stats['total_chunks']:,}")
        print(f"  • With embeddings: {stats['chunks_with_embeddings']:,}")
        print(f"  • File-based: {stats['file_chunks']:,}")
        print(f"  • Web-based: {stats['web_chunks']:,}")

        if not args.stats:
            print("\nUse --test to re-embed project docs or --search 'query' to test search")

    if args.test:
        embedder.reembed_project_docs()

    if args.all:
        print("❌ Full re-embedding not yet implemented (would cost ~$2-3)")
        print("Use --test first to verify it works with project docs")

    if args.search:
        embedder.test_search(args.search)


if __name__ == "__main__":
    main()
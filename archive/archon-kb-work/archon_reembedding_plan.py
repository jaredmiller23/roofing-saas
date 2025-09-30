"""
Archon Knowledge Base Re-Embedding Plan
========================================
This script outlines how to re-embed all content with OpenAI embeddings
and add Cohere reranking for better search relevance.

Required packages:
pip install openai cohere psycopg2-binary python-dotenv tqdm
"""

import os
import openai
import cohere
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Any
import numpy as np
from tqdm import tqdm
import time

# Configuration
OPENAI_API_KEY = "your-openai-key"
COHERE_API_KEY = "your-cohere-key"
DATABASE_URL = "postgresql://user:pass@host/dbname"

# Embedding models to consider:
# - "text-embedding-3-small": 1536 dims, $0.02/1M tokens, good quality
# - "text-embedding-3-large": 3072 dims, $0.13/1M tokens, best quality
# - "text-embedding-ada-002": 1536 dims, $0.10/1M tokens, legacy but reliable
EMBEDDING_MODEL = "text-embedding-3-small"

# Cohere reranker model
RERANK_MODEL = "rerank-english-v3.0"

class ArchonReEmbedder:
    """Re-embed Archon knowledge base with better embeddings"""

    def __init__(self):
        self.openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)
        self.cohere_client = cohere.Client(COHERE_API_KEY)
        self.conn = psycopg2.connect(DATABASE_URL)

    def get_chunks_to_embed(self, source_filter: str = None) -> List[Dict]:
        """Get all chunks that need embedding"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT
                    cp.id,
                    cp.content,
                    cp.url,
                    s.source_url,
                    s.source_display_name
                FROM archon_crawled_pages cp
                JOIN archon_sources s ON cp.source_id = s.source_id
                WHERE 1=1
            """
            if source_filter:
                query += f" AND s.source_url LIKE '{source_filter}'"
            query += " ORDER BY cp.id"

            cur.execute(query)
            return cur.fetchall()

    def create_contextual_content(self, chunk: Dict) -> str:
        """
        Add context to improve embedding quality for project docs
        This is KEY for making project docs more findable!
        """
        content = chunk['content']

        # Add context based on source type
        if 'file://' in chunk['source_url']:
            # Project documentation gets special treatment
            if 'PRD' in chunk['source_display_name']:
                content = f"Project Requirements Document (PRD): {content}"
            elif 'CLAUDE' in chunk['source_display_name']:
                content = f"Project Implementation Guide: {content}"
            elif 'knowledge_base' in chunk['source_display_name']:
                content = f"Technical Knowledge Base: {content}"
            elif 'roofing' in chunk['source_display_name'].lower():
                content = f"Roofing Industry Documentation: {content}"
            else:
                content = f"Project Documentation: {content}"

        return content

    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding using OpenAI"""
        try:
            response = self.openai_client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"Error generating embedding: {e}")
            return None

    def update_embedding(self, chunk_id: int, embedding: List[float]):
        """Update embedding in database"""
        with self.conn.cursor() as cur:
            # Convert to pgvector format
            embedding_str = f"[{','.join(map(str, embedding))}]"
            cur.execute(
                "UPDATE archon_crawled_pages SET embedding = %s WHERE id = %s",
                (embedding_str, chunk_id)
            )
            self.conn.commit()

    def re_embed_all(self, batch_size: int = 100):
        """Re-embed all content with progress tracking"""
        chunks = self.get_chunks_to_embed()
        print(f"Found {len(chunks)} chunks to re-embed")

        with tqdm(total=len(chunks)) as pbar:
            for chunk in chunks:
                # Add context for better embeddings
                contextual_content = self.create_contextual_content(chunk)

                # Generate new embedding
                embedding = self.generate_embedding(contextual_content)

                if embedding:
                    self.update_embedding(chunk['id'], embedding)

                pbar.update(1)

                # Rate limiting (OpenAI: 3000 RPM for tier 1)
                time.sleep(0.02)  # ~50 requests per second max

    def re_embed_project_docs_only(self):
        """Just re-embed project documentation for testing"""
        chunks = self.get_chunks_to_embed(source_filter="file://%")
        print(f"Found {len(chunks)} project doc chunks to re-embed")

        for chunk in tqdm(chunks):
            contextual_content = self.create_contextual_content(chunk)
            embedding = self.generate_embedding(contextual_content)

            if embedding:
                self.update_embedding(chunk['id'], embedding)

            time.sleep(0.02)


class CohereReranker:
    """Add Cohere reranking on top of existing search"""

    def __init__(self):
        self.client = cohere.Client(COHERE_API_KEY)

    def rerank_results(self, query: str, documents: List[Dict],
                       top_n: int = 10) -> List[Dict]:
        """
        Rerank search results using Cohere

        Args:
            query: The search query
            documents: List of documents with 'content' field
            top_n: Number of results to return
        """
        if not documents:
            return []

        # Prepare documents for reranking
        doc_texts = [doc['content'] for doc in documents]

        try:
            response = self.client.rerank(
                model=RERANK_MODEL,
                query=query,
                documents=doc_texts,
                top_n=min(top_n, len(documents)),
                return_documents=False
            )

            # Reorder documents based on rerank scores
            reranked = []
            for result in response.results:
                doc = documents[result.index].copy()
                doc['rerank_score'] = result.relevance_score
                reranked.append(doc)

            return reranked

        except Exception as e:
            print(f"Reranking failed: {e}")
            return documents[:top_n]


# Enhanced search function that could replace the current one
def enhanced_rag_search(query: str, match_count: int = 10) -> List[Dict]:
    """
    Enhanced search with better embeddings and reranking
    """
    # Step 1: Generate query embedding with context
    openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)

    # Add context to query for better matching
    contextual_query = f"Search for project documentation about: {query}"

    response = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=contextual_query
    )
    query_embedding = response.data[0].embedding

    # Step 2: Retrieve candidates using vector similarity
    conn = psycopg2.connect(DATABASE_URL)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        embedding_str = f"[{','.join(map(str, query_embedding))}]"

        # Modified query to boost project documents
        cur.execute("""
            WITH ranked_results AS (
                SELECT
                    cp.id,
                    cp.content,
                    cp.url,
                    s.source_display_name,
                    s.source_url,
                    cp.embedding <=> %s::vector as distance,
                    -- Boost file sources
                    CASE
                        WHEN s.source_url LIKE 'file://%%' THEN 0.8
                        ELSE 1.0
                    END as boost_factor
                FROM archon_crawled_pages cp
                JOIN archon_sources s ON cp.source_id = s.source_id
                WHERE cp.embedding IS NOT NULL
                ORDER BY (cp.embedding <=> %s::vector) *
                    CASE
                        WHEN s.source_url LIKE 'file://%%' THEN 0.8
                        ELSE 1.0
                    END
                LIMIT %s
            )
            SELECT * FROM ranked_results
        """, (embedding_str, embedding_str, match_count * 3))

        candidates = cur.fetchall()

    # Step 3: Rerank with Cohere
    reranker = CohereReranker()
    reranked = reranker.rerank_results(query, candidates, top_n=match_count)

    return reranked


if __name__ == "__main__":
    print("=== Archon Re-Embedding Tool ===")
    print("\nOptions:")
    print("1. Re-embed all content (43K+ chunks)")
    print("2. Re-embed project docs only (test)")
    print("3. Test enhanced search")

    choice = input("\nSelect option (1-3): ")

    if choice == "1":
        embedder = ArchonReEmbedder()
        embedder.re_embed_all()
    elif choice == "2":
        embedder = ArchonReEmbedder()
        embedder.re_embed_project_docs_only()
    elif choice == "3":
        query = input("Enter search query: ")
        results = enhanced_rag_search(query)
        for i, result in enumerate(results[:5]):
            print(f"\n{i+1}. {result['source_display_name']}")
            print(f"   Score: {result.get('rerank_score', 'N/A')}")
            print(f"   Preview: {result['content'][:200]}...")
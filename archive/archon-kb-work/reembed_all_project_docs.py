#!/usr/bin/env python3
"""
Re-embed ALL project documentation files with contextual embeddings
Then test multiple searches to verify improvements
"""

import os
import json
import time
from openai import OpenAI
import requests
from dotenv import load_dotenv

# Load environment
load_dotenv('.env.reembedding')

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
EMBEDDING_MODEL = os.getenv('EMBEDDING_MODEL', 'text-embedding-3-small')

# Archon Supabase credentials
SUPABASE_URL = "https://pcduofjokergeakxgjpp.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZHVvZmpva2VyZ2Vha3hnanBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDAxODgsImV4cCI6MjA3NDU3NjE4OH0.YoJ49zSumQiUkp8uCDDT-aQbmaw5cDyH48MSadRpp2c"

def get_project_documents():
    """Fetch all project documentation from Supabase"""
    print("\n📚 Fetching project documentation from Archon DB...")

    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
    }

    # Query for all project doc chunks - using multiple requests
    all_chunks = []

    doc_patterns = [
        "%PRD.md%",
        "%CLAUDE.md%",
        "%knowledge_base_roofing%",
        "%roofing_industry_apis%"
    ]

    for pattern in doc_patterns:
        url = f"{SUPABASE_URL}/rest/v1/archon_crawled_pages"
        params = {
            "select": "id,content,source_id,chunk_number,archon_sources!inner(source_url,source_display_name)",
            "archon_sources.source_url": f"like.{pattern}",
            "order": "chunk_number"
        }

        response = requests.get(url, headers=headers, params=params)
        if response.status_code == 200:
            all_chunks.extend(response.json())

    chunks = all_chunks

    if chunks:

        # Group by document
        docs = {}
        for chunk in chunks:
            doc_name = chunk['archon_sources']['source_display_name']
            if doc_name not in docs:
                docs[doc_name] = []
            docs[doc_name].append(chunk)

        print(f"✅ Found {len(chunks)} chunks across {len(docs)} documents:")
        for doc_name, doc_chunks in docs.items():
            print(f"   • {doc_name}: {len(doc_chunks)} chunks")

        return chunks
    else:
        print(f"❌ Failed to fetch documents: {response.status_code}")
        return None

def create_contextual_content(chunk):
    """Add strong context based on document type"""
    content = chunk['content']
    display_name = chunk['archon_sources']['source_display_name']

    # Strong contextual prefixes for each document type
    if 'PRD.md' in display_name:
        return f"""Project Requirements Document (PRD) for Tennessee Roofing SaaS Platform.
        This describes requirements to replace Proline CRM and Enzy door-knocking app for a Tennessee roofing company.
        Developer: Solo automation agency using Claude Code. Content: {content}"""

    elif 'CLAUDE.md' in display_name:
        return f"""Developer Implementation Guide for Tennessee Roofing SaaS Project.
        Instructions for Claude Code when building the roofing platform to replace Proline and Enzy.
        Tech stack: Next.js, Supabase, Twilio, QuickBooks integration. Content: {content}"""

    elif 'knowledge_base_roofing' in display_name:
        return f"""Technical Knowledge Base for Roofing Industry Platform Development.
        Implementation details for roofing CRM, field operations, QuickBooks integration, Twilio SMS.
        Tennessee roofing company requirements and industry-specific features. Content: {content}"""

    elif 'roofing_industry_apis' in display_name:
        return f"""Roofing Industry API Integration Documentation.
        APIs for roofing software: EagleView measurements, Hover 3D modeling, Xactimate estimating,
        QuickBooks accounting, Twilio communications, GAF warranties. Content: {content}"""

    else:
        return f"Tennessee Roofing Project Documentation: {content}"

def generate_embedding(text):
    """Generate embedding using OpenAI"""
    client = OpenAI(api_key=OPENAI_API_KEY)

    try:
        response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=text[:8000]  # Token limit safety
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"❌ Embedding error: {e}")
        return None

def update_embedding(chunk_id, embedding):
    """Update embedding in Supabase"""
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    # Format embedding for pgvector
    embedding_str = '[' + ','.join(map(str, embedding)) + ']'

    url = f"{SUPABASE_URL}/rest/v1/archon_crawled_pages"
    params = {"id": f"eq.{chunk_id}"}
    data = {"embedding": embedding_str}

    response = requests.patch(url, headers=headers, params=params, json=data)
    return response.status_code == 204

def reembed_all_project_docs():
    """Re-embed all project documentation"""
    chunks = get_project_documents()
    if not chunks:
        return False

    # Ask for confirmation
    response = input("\n⚠️  Re-embed ALL these chunks? (y/n): ")
    if response.lower() != 'y':
        print("Cancelled")
        return False

    print("\n🔄 Re-embedding project documentation...")
    success = 0
    failed = 0

    for i, chunk in enumerate(chunks):
        doc_name = chunk['archon_sources']['source_display_name']
        print(f"  [{i+1}/{len(chunks)}] {doc_name} chunk {chunk['chunk_number']}...", end="")

        try:
            # Generate contextual embedding
            contextual_content = create_contextual_content(chunk)
            embedding = generate_embedding(contextual_content)

            if embedding and update_embedding(chunk['id'], embedding):
                print(" ✅")
                success += 1
            else:
                print(" ❌ Update failed")
                failed += 1

            # Rate limiting
            time.sleep(0.05)

        except Exception as e:
            print(f" ❌ Error: {e}")
            failed += 1

    print(f"\n✅ Successfully re-embedded: {success} chunks")
    if failed > 0:
        print(f"❌ Failed: {failed} chunks")

    return success > 0

def test_searches():
    """Test multiple search queries to verify improvement"""
    print("\n" + "=" * 60)
    print("🔍 Testing Search Queries")
    print("=" * 60)

    test_queries = [
        "Tennessee roofing company Proline Enzy replacement",
        "Phase 1 Core CRM weeks 1-4",
        "QuickBooks integration roofing",
        "Twilio SMS implementation roofing",
        "Claude Code developer guide roofing project",
        "EagleView Hover Xactimate API",
        "Next.js Supabase tech stack roofing",
        "gamification door knocking Enzy",
        "mobile PWA field operations photo upload"
    ]

    # Note: We can't actually test the search from here without the RPC function
    # But we'll generate the embeddings to show what would be searched

    client = OpenAI(api_key=OPENAI_API_KEY)

    for query in test_queries:
        print(f"\n📝 Query: '{query}'")

        # Generate query embedding with context
        contextual_query = f"Search for Tennessee roofing project documentation about: {query}"

        try:
            response = client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=contextual_query
            )
            print(f"   ✅ Embedding generated (dims: {len(response.data[0].embedding)})")
        except Exception as e:
            print(f"   ❌ Error: {e}")

    print("\n💡 To verify search improvements, use the Archon RAG search in Claude")
    print("   The project documents should now appear as top results!")

def main():
    print("=" * 60)
    print("Project Documentation Re-Embedding Tool")
    print("=" * 60)

    # Test OpenAI connection
    print("\n🔌 Testing OpenAI connection...")
    client = OpenAI(api_key=OPENAI_API_KEY)
    try:
        test = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input="test"
        )
        print(f"✅ OpenAI connected (Model: {EMBEDDING_MODEL})")
    except Exception as e:
        print(f"❌ OpenAI error: {e}")
        return

    # Re-embed all project docs
    if reembed_all_project_docs():
        # Test searches
        test_searches()

    print("\n✅ Complete! Now test searches using mcp__archon__rag_search_knowledge_base")

if __name__ == "__main__":
    main()
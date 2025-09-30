#!/usr/bin/env python3
"""
Simple test to re-embed just the PRD using OpenAI
This uses the Supabase REST API instead of direct DB connection
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

def test_openai_connection():
    """Test OpenAI API connection"""
    print("Testing OpenAI connection...")
    client = OpenAI(api_key=OPENAI_API_KEY)

    try:
        response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input="Test embedding generation"
        )
        print(f"✅ OpenAI connection successful!")
        print(f"   Model: {EMBEDDING_MODEL}")
        print(f"   Embedding dimensions: {len(response.data[0].embedding)}")
        return True
    except Exception as e:
        print(f"❌ OpenAI connection failed: {e}")
        return False

def get_prd_content():
    """Fetch PRD content from Supabase"""
    print("\nFetching PRD content from Archon DB...")

    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
    }

    # Query for PRD chunks
    url = f"{SUPABASE_URL}/rest/v1/archon_crawled_pages"
    params = {
        "select": "id,content,source_id,chunk_number,archon_sources!inner(source_url,source_display_name)",
        "archon_sources.source_url": "like.%PRD.md%",
        "order": "chunk_number"
    }

    response = requests.get(url, headers=headers, params=params)

    if response.status_code == 200:
        chunks = response.json()
        print(f"✅ Found {len(chunks)} PRD chunks")
        return chunks
    else:
        print(f"❌ Failed to fetch PRD: {response.status_code} - {response.text}")
        return None

def generate_contextual_embedding(content):
    """Generate embedding with context"""
    client = OpenAI(api_key=OPENAI_API_KEY)

    # Add strong context for PRD
    contextual_content = f"""Project Requirements Document for Tennessee Roofing SaaS Platform.
    This document describes requirements for replacing Proline CRM and Enzy door-knocking app
    for a local Tennessee roofing company. Content: {content}"""

    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=contextual_content[:8000]  # Limit to avoid token issues
    )

    return response.data[0].embedding

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

def test_search(query):
    """Test search after re-embedding"""
    print(f"\n🔍 Testing search for: '{query}'")

    # Generate query embedding
    client = OpenAI(api_key=OPENAI_API_KEY)
    contextual_query = f"Search for roofing project documentation about: {query}"

    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=contextual_query
    )

    query_embedding = response.data[0].embedding

    # Call Supabase RPC function for search
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json"
    }

    # This would need the actual RPC function, so let's skip for now
    print("⚠️  Search test requires RPC function setup")

def main():
    print("=" * 60)
    print("PRD Re-Embedding Test")
    print("=" * 60)

    # Test OpenAI
    if not test_openai_connection():
        return

    # Get PRD chunks
    chunks = get_prd_content()
    if not chunks:
        return

    # Display what we found
    print("\nPRD chunks to re-embed:")
    for chunk in chunks:
        preview = chunk['content'][:100] + "..." if len(chunk['content']) > 100 else chunk['content']
        print(f"  Chunk {chunk['chunk_number']}: {preview}")

    # Ask for confirmation
    response = input("\n⚠️  Re-embed these chunks? (y/n): ")
    if response.lower() != 'y':
        print("Cancelled")
        return

    # Re-embed
    print("\nRe-embedding PRD chunks...")
    success = 0
    failed = 0

    for chunk in chunks:
        print(f"  Processing chunk {chunk['chunk_number']}...", end="")

        try:
            # Generate new embedding
            embedding = generate_contextual_embedding(chunk['content'])

            # Update in database
            if update_embedding(chunk['id'], embedding):
                print(" ✅")
                success += 1
            else:
                print(" ❌ Update failed")
                failed += 1

            # Rate limit
            time.sleep(0.1)

        except Exception as e:
            print(f" ❌ Error: {e}")
            failed += 1

    print(f"\n✅ Successfully re-embedded: {success} chunks")
    if failed > 0:
        print(f"❌ Failed: {failed} chunks")

    # Test search
    print("\n" + "=" * 60)
    test_search("Phase 1 Core CRM Tennessee roofing")

if __name__ == "__main__":
    main()
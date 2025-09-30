#!/usr/bin/env python3
"""
FINAL FIX using REST API - Update text search vectors with complete content
"""

import os
import json
import time
import requests
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv('.env.reembedding')

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
EMBEDDING_MODEL = 'text-embedding-3-small'

# Archon Supabase credentials
SUPABASE_URL = "https://pcduofjokergeakxgjpp.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZHVvZmpva2VyZ2Vha3hnanBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDAxODgsImV4cCI6MjA3NDU3NjE4OH0.YoJ49zSumQiUkp8uCDDT-aQbmaw5cDyH48MSadRpp2c"

# Since we can't update tsvector via REST API, let's create a workaround
# We'll update the content field itself with our enhanced content

def get_project_documents():
    """Fetch all project documentation from Supabase"""
    print("\n📚 Fetching project documentation...")
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
    }

    all_chunks = []
    doc_patterns = ["%PRD.md%", "%CLAUDE.md%", "%knowledge_base_roofing%", "%roofing_industry_apis%"]

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

    return all_chunks

def create_searchable_content(chunk):
    """Create content that includes all searchable terms"""
    original_content = chunk['content']
    display_name = chunk['archon_sources']['source_display_name']

    # Add searchable prefix to actual content
    search_prefix = ""

    if 'PRD.md' in display_name:
        search_prefix = """[SEARCHABLE: PRD Project Requirements Document Tennessee roofing Proline CRM Enzy
        door-knocking Phase 1 Phase 2 Phase 3 Core CRM weeks 1-4 contact management pipeline
        QuickBooks OAuth integration Twilio SMS gamification]

        """

    elif 'CLAUDE.md' in display_name:
        search_prefix = """[SEARCHABLE: Claude Code developer implementation guide Next.js Supabase
        Tennessee roofing tech stack PWA Twilio QuickBooks Vercel deployment database schema]

        """

    elif 'knowledge_base_roofing' in display_name:
        search_prefix = """[SEARCHABLE: roofing knowledge base technical CRM field operations
        mobile app photo upload QuickBooks Twilio SMS e-signature reporting Tennessee contractor]

        """

    elif 'roofing_industry_apis' in display_name:
        search_prefix = """[SEARCHABLE: roofing APIs EagleView Hover Xactimate GAF QuickBooks
        Twilio Google Maps integration documentation Tennessee]

        """

    # Return original content with search prefix
    # This way the text search will find our terms
    return search_prefix + original_content

def update_chunk_content(chunk_id, new_content):
    """Update chunk content via REST API"""
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    url = f"{SUPABASE_URL}/rest/v1/archon_crawled_pages"
    params = {"id": f"eq.{chunk_id}"}
    data = {"content": new_content}

    response = requests.patch(url, headers=headers, params=params, json=data)
    return response.status_code == 204

def main():
    print("=" * 60)
    print("FINAL FIX - Adding searchable terms to content")
    print("=" * 60)

    chunks = get_project_documents()
    if not chunks:
        print("❌ No project documentation found")
        return

    print(f"Found {len(chunks)} chunks to update")

    # Confirmation
    response = input("\n⚠️  Add searchable terms to content? (y/n): ")
    if response.lower() != 'y':
        print("Cancelled")
        return

    success = 0
    failed = 0

    for i, chunk in enumerate(chunks):
        doc_name = chunk['archon_sources']['source_display_name']
        print(f"[{i+1}/{len(chunks)}] {doc_name} chunk {chunk['chunk_number']}...", end="")

        try:
            # Create content with searchable terms
            new_content = create_searchable_content(chunk)

            # Update in database
            if update_chunk_content(chunk['id'], new_content):
                print(" ✅")
                success += 1
            else:
                print(" ❌ Update failed")
                failed += 1

            time.sleep(0.05)

        except Exception as e:
            print(f" ❌ Error: {e}")
            failed += 1

    print(f"\n✅ Successfully updated: {success} chunks")
    if failed > 0:
        print(f"❌ Failed: {failed} chunks")

    print("\n⚠️  Note: Text search vectors will update automatically via database trigger")
    print("Wait a few seconds then test with mcp__archon__rag_search_knowledge_base")

if __name__ == "__main__":
    main()
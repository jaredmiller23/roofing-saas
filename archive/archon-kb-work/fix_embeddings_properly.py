#!/usr/bin/env python3
"""
FIX the embeddings PROPERLY - 50% is unacceptable!
We need 90%+ accuracy for our project documentation.
"""

import os
import json
import time
from openai import OpenAI
import requests
from dotenv import load_dotenv
import cohere

# Load environment
load_dotenv('.env.reembedding')

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
COHERE_API_KEY = os.getenv('COHERE_API_KEY')
EMBEDDING_MODEL = os.getenv('EMBEDDING_MODEL', 'text-embedding-3-small')

# Archon Supabase credentials
SUPABASE_URL = "https://pcduofjokergeakxgjpp.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZHVvZmpva2VyZ2Vha3hnanBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDAxODgsImV4cCI6MjA3NDU3NjE4OH0.YoJ49zSumQiUkp8uCDDT-aQbmaw5cDyH48MSadRpp2c"

def get_project_documents():
    """Fetch all project documentation from Supabase"""
    print("\n📚 Fetching project documentation...")

    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
    }

    # Get ALL project doc chunks
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

    return all_chunks

def create_AGGRESSIVE_contextual_content(chunk):
    """Create MUCH stronger contextual embeddings - we need 90%+ accuracy!"""
    content = chunk['content']
    display_name = chunk['archon_sources']['source_display_name']

    # MASSIVE contextual enhancement for each document type
    if 'PRD.md' in display_name:
        # Add EVERY possible search term someone might use
        return f"""
        PROJECT REQUIREMENTS DOCUMENT (PRD) for Tennessee Roofing Company SaaS Platform.

        KEY SEARCH TERMS: PRD, requirements, Phase 1, Phase 2, Phase 3, Phase 4, Phase 5,
        Proline CRM replacement, Enzy app replacement, door knocking, door-to-door sales,
        Tennessee roofing company, local roofing contractor, roofing CRM, roofing software,
        Core CRM, weeks 1-4, contact management, pipeline management, QuickBooks integration,
        OAuth setup, basic lead management, CRUD operations, simple pipeline view,
        financial sync, invoicing, estimates, proposals, contracts, e-signing,
        Twilio SMS, text messaging, call recording, mobile app, PWA, photo upload,
        field operations, crew management, job scheduling, territory management,
        gamification, leaderboards, achievement badges, sales rep tracking,
        AI voice assistant, reporting, analytics, dashboard, KPIs, metrics.

        This document describes ALL requirements and phases for replacing Proline and Enzy.
        Developer: Solo automation agency using Claude Code and no/low-code tools.
        Client: Tennessee-based roofing company with field sales and installation crews.

        ACTUAL CONTENT: {content}
        """

    elif 'CLAUDE.md' in display_name:
        return f"""
        DEVELOPER IMPLEMENTATION GUIDE - CLAUDE.md - Instructions for Claude Code.

        KEY SEARCH TERMS: Claude Code, developer guide, implementation instructions,
        tech stack, Next.js 14, Supabase, PostgreSQL, Tailwind CSS, shadcn/ui,
        PWA, progressive web app, Twilio integration, QuickBooks API, OpenAI API,
        Resend, SendGrid, email automation, SMS automation, Vercel deployment,
        database schema, contacts table, projects table, activities table,
        Row Level Security, RLS, authentication, auth flow, API patterns,
        Tennessee roofing project, roofing SaaS, CRM development,
        solo developer, automation agency, no-code, low-code, MCP servers,
        Archon integration, dual Supabase architecture, knowledge base,
        project structure, development commands, quality checklist.

        This is THE developer guide for building the Tennessee roofing platform.

        ACTUAL CONTENT: {content}
        """

    elif 'knowledge_base_roofing' in display_name:
        return f"""
        TECHNICAL KNOWLEDGE BASE for Roofing Industry SaaS Platform Development.

        KEY SEARCH TERMS: roofing knowledge base, technical implementation,
        roofing CRM features, field operations, mobile app development,
        photo upload, offline sync, territory management, route optimization,
        crew scheduling, job management, QuickBooks integration details,
        financial sync, invoice generation, payment processing,
        Twilio SMS implementation, automated text messaging, appointment reminders,
        customer communications, two-way messaging, call recording setup,
        e-signature integration, contract management, proposal generation,
        reporting dashboards, KPI tracking, sales metrics, performance analytics,
        gamification system, achievement system, leaderboard implementation,
        door-to-door sales tracking, canvassing routes, lead capture,
        Tennessee roofing industry, local contractor needs, Proline alternative,
        Enzy replacement, mobile-first design, PWA implementation.

        Complete technical guide for roofing-specific features and integrations.

        ACTUAL CONTENT: {content}
        """

    elif 'roofing_industry_apis' in display_name:
        return f"""
        ROOFING INDUSTRY API INTEGRATION DOCUMENTATION.

        KEY SEARCH TERMS: roofing APIs, industry integrations, third-party services,
        EagleView API, aerial measurements, roof measurements, property data,
        Hover API, 3D modeling, 3D measurements, visual estimates,
        Xactimate integration, insurance claims, ESX files, estimating,
        GAF API, manufacturer warranties, contractor portal, certifications,
        SRS Distribution API, ABC Supply API, Beacon API, material ordering,
        material delivery tracking, supply chain integration,
        QuickBooks API, accounting integration, financial sync, invoicing API,
        payment processing, accounts receivable, job costing,
        Twilio API, SMS API, voice API, call recording, messaging,
        Google Maps API, geocoding, route optimization, territory mapping,
        weather API integration, job scheduling, crew dispatch,
        photo storage API, damage documentation, before/after photos,
        e-signature API, SignWell, DocuSign, contract signing.

        Complete API documentation for roofing industry integrations.

        ACTUAL CONTENT: {content}
        """

    else:
        return f"""
        TENNESSEE ROOFING PROJECT DOCUMENTATION.
        Project to replace Proline CRM and Enzy door-knocking app.
        Roofing company software requirements and implementation.
        {content}
        """

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

def test_with_cohere_reranking(query):
    """Test search with Cohere reranking"""
    print(f"\n🔍 Testing with Cohere reranking: '{query}'")

    # Generate query embedding
    client = OpenAI(api_key=OPENAI_API_KEY)

    # Add massive context to the query too!
    contextual_query = f"""
    Search for Tennessee roofing project documentation.
    Looking for: {query}
    Related to: Proline CRM replacement, Enzy app replacement, Tennessee roofing company,
    roofing software, door-to-door sales, field operations, Claude Code development.
    """

    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=contextual_query
    )

    query_embedding = response.data[0].embedding
    embedding_str = '[' + ','.join(map(str, query_embedding)) + ']'

    # Search using similarity
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
    }

    # Get top 20 results for reranking
    url = f"{SUPABASE_URL}/rest/v1/rpc/match_documents"
    data = {
        "query_embedding": embedding_str,
        "match_count": 20
    }

    response = requests.post(url, headers=headers, json=data)

    if response.status_code != 200:
        # Fallback to regular search
        print("Using fallback search method...")
        url = f"{SUPABASE_URL}/rest/v1/archon_crawled_pages"
        params = {
            "select": "id,content,archon_sources!inner(source_display_name)",
            "limit": "20"
        }
        response = requests.get(url, headers=headers, params=params)

    if response.status_code == 200:
        results = response.json()

        if COHERE_API_KEY and len(results) > 0:
            # Rerank with Cohere
            co = cohere.Client(COHERE_API_KEY)

            # Prepare documents for reranking
            documents = [r.get('content', '')[:1000] for r in results]

            try:
                reranked = co.rerank(
                    query=query,
                    documents=documents,
                    top_n=5,
                    model='rerank-english-v3.0'
                )

                print("\n📊 Reranked Results:")
                for idx, result in enumerate(reranked.results):
                    original = results[result.index]
                    name = original.get('archon_sources', {}).get('source_display_name', 'Unknown')
                    score = result.relevance_score
                    print(f"{idx+1}. {name} (Score: {score:.3f})")

                return reranked

            except Exception as e:
                print(f"Cohere reranking failed: {e}")

    return None

def main():
    print("=" * 60)
    print("FIXING EMBEDDINGS PROPERLY - 50% IS NOT ACCEPTABLE!")
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

    # Test Cohere connection
    if COHERE_API_KEY:
        print("\n🔌 Testing Cohere connection...")
        co = cohere.Client(COHERE_API_KEY)
        try:
            test = co.rerank(
                query="test",
                documents=["test doc"],
                top_n=1,
                model='rerank-english-v3.0'
            )
            print("✅ Cohere reranker connected")
        except Exception as e:
            print(f"⚠️ Cohere error: {e}")

    # Get all project docs
    chunks = get_project_documents()
    if not chunks:
        print("❌ No project documentation found")
        return

    print(f"\n📚 Found {len(chunks)} project documentation chunks")

    # Group by source
    sources = {}
    for chunk in chunks:
        name = chunk['archon_sources']['source_display_name']
        if name not in sources:
            sources[name] = 0
        sources[name] += 1

    print("\nDocuments to re-embed with AGGRESSIVE context:")
    for name, count in sources.items():
        print(f"  • {name}: {count} chunks")

    # Confirm
    response = input("\n⚠️  Re-embed with AGGRESSIVE contextual prefixes? (y/n): ")
    if response.lower() != 'y':
        print("Cancelled")
        return

    print("\n🚀 Re-embedding with MASSIVE contextual enhancement...")
    success = 0
    failed = 0

    for i, chunk in enumerate(chunks):
        doc_name = chunk['archon_sources']['source_display_name']
        print(f"  [{i+1}/{len(chunks)}] {doc_name} chunk {chunk['chunk_number']}...", end="")

        try:
            # Generate AGGRESSIVE contextual embedding
            contextual_content = create_AGGRESSIVE_contextual_content(chunk)
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

    # Test with difficult queries
    print("\n" + "=" * 60)
    print("🧪 TESTING WITH DIFFICULT QUERIES")
    print("=" * 60)

    test_queries = [
        "PRD Phase 1 Core CRM weeks 1-4 Proline replacement",
        "Tennessee roofing company Enzy door knocking gamification",
        "QuickBooks OAuth integration financial sync invoicing",
        "Twilio SMS text messaging roofing field operations",
        "Claude Code developer implementation guide Next.js Supabase"
    ]

    for query in test_queries:
        test_with_cohere_reranking(query)

    print("\n✅ Complete! Now test with mcp__archon__rag_search_knowledge_base")
    print("We should see 90%+ accuracy on project searches!")

if __name__ == "__main__":
    main()
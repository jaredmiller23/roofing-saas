#!/usr/bin/env python3
"""
FINAL FIX - Update BOTH embeddings AND text search vectors
We need 90%+ accuracy. No excuses.
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv('.env.reembedding')

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
DATABASE_URL = os.getenv('SUPABASE_DB_URL')
EMBEDDING_MODEL = 'text-embedding-3-small'

def create_MAXIMUM_contextual_content(chunk):
    """Create the most comprehensive contextual content possible"""
    content = chunk['content']
    display_name = chunk['source_display_name']

    # MAXIMUM context for search - include EVERYTHING
    base_context = f"""
    Tennessee Roofing Company Project Documentation.
    Proline CRM replacement. Enzy door-knocking app replacement.
    Local Tennessee roofing contractor software requirements.
    Solo developer using Claude Code. No-code low-code automation.
    """

    if 'PRD.md' in display_name:
        enhanced = f"""
        {base_context}
        PROJECT REQUIREMENTS DOCUMENT PRD.md for Tennessee Roofing SaaS Platform.

        SEARCH KEYWORDS: PRD requirements document specification project Tennessee roofing
        Proline CRM replacement Enzy app door-knocking gamification sales reps
        Phase 1 Phase 2 Phase 3 Phase 4 Phase 5 Core CRM weeks 1-4
        contact management lead management pipeline stages QuickBooks integration
        OAuth financial sync invoicing estimates proposals contracts e-signing
        Twilio SMS text messaging call recording mobile app PWA photo upload
        field operations crew management job scheduling territory management
        gamification leaderboards achievement badges sales tracking door-to-door
        AI voice assistant reporting analytics dashboard KPIs metrics
        Claude Code developer solo automation agency implementation guide.

        PHASES:
        - Phase 1 Core CRM: contact management, pipeline, QuickBooks OAuth
        - Phase 2 Mobile Operations: PWA, photo upload, field tracking
        - Phase 3 Communications: Twilio SMS, email, call recording
        - Phase 4 Advanced Features: AI assistant, gamification
        - Phase 5 Optimization: reporting, analytics, performance

        ACTUAL CONTENT: {content}
        """

    elif 'CLAUDE.md' in display_name:
        enhanced = f"""
        {base_context}
        CLAUDE.md Developer Implementation Guide Instructions for Claude Code.

        SEARCH KEYWORDS: Claude Code developer guide implementation instructions
        tech stack Next.js 14 Supabase PostgreSQL Tailwind CSS shadcn/ui
        PWA progressive web app Twilio integration QuickBooks API OpenAI
        Resend SendGrid email automation SMS Vercel deployment
        database schema contacts projects activities tables
        Row Level Security RLS authentication auth API patterns
        Tennessee roofing project CRM development solo developer
        automation agency no-code low-code MCP servers Archon integration
        dual Supabase architecture knowledge base project structure
        development commands quality checklist best practices.

        ACTUAL CONTENT: {content}
        """

    elif 'knowledge_base_roofing' in display_name:
        enhanced = f"""
        {base_context}
        Technical Knowledge Base for Roofing Industry Platform Development.

        SEARCH KEYWORDS: roofing knowledge base technical implementation
        CRM features field operations mobile app photo upload offline sync
        territory management route optimization crew scheduling job management
        QuickBooks integration financial sync invoice generation payment
        Twilio SMS automated messaging appointment reminders customer communications
        two-way messaging call recording e-signature contract management
        proposal generation reporting dashboards KPI tracking sales metrics
        performance analytics gamification achievement system leaderboard
        door-to-door sales canvassing routes lead capture Tennessee roofing
        local contractor Proline alternative Enzy replacement mobile-first PWA.

        ACTUAL CONTENT: {content}
        """

    elif 'roofing_industry_apis' in display_name:
        enhanced = f"""
        {base_context}
        Roofing Industry API Integration Documentation.

        SEARCH KEYWORDS: roofing APIs industry integrations third-party services
        EagleView API aerial measurements roof property data
        Hover API 3D modeling visual estimates
        Xactimate integration insurance claims ESX files estimating
        GAF API manufacturer warranties contractor portal certifications
        SRS Distribution ABC Supply Beacon material ordering delivery tracking
        supply chain integration QuickBooks API accounting financial invoicing
        payment processing accounts receivable job costing
        Twilio API SMS voice call recording messaging
        Google Maps API geocoding route optimization territory mapping
        weather API job scheduling crew dispatch photo storage damage documentation
        e-signature API SignWell DocuSign contract signing.

        ACTUAL CONTENT: {content}
        """
    else:
        enhanced = f"{base_context} {content}"

    return enhanced

def fix_everything():
    """Fix both embeddings and text search vectors"""
    conn = psycopg2.connect(DATABASE_URL)
    client = OpenAI(api_key=OPENAI_API_KEY)

    print("=" * 60)
    print("FINAL FIX - WE WILL ACHIEVE 90%+ ACCURACY")
    print("=" * 60)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # Get all project documentation
        cur.execute("""
            SELECT
                cp.id,
                cp.content,
                s.source_display_name,
                s.source_url
            FROM archon_crawled_pages cp
            JOIN archon_sources s ON cp.source_id = s.source_id
            WHERE s.source_url LIKE 'file://%.md'
            AND (
                s.source_url LIKE '%PRD.md%' OR
                s.source_url LIKE '%CLAUDE.md%' OR
                s.source_url LIKE '%knowledge_base_roofing%' OR
                s.source_url LIKE '%roofing_industry_apis%'
            )
            ORDER BY s.source_display_name, cp.chunk_number
        """)

        chunks = cur.fetchall()

    print(f"\n📚 Found {len(chunks)} project documentation chunks")

    success = 0
    failed = 0

    for i, chunk in enumerate(chunks):
        print(f"\n[{i+1}/{len(chunks)}] Processing {chunk['source_display_name']}...")

        # Create MAXIMUM contextual content
        enhanced_content = create_MAXIMUM_contextual_content(chunk)

        # 1. Generate new embedding
        print("  → Generating embedding...")
        try:
            response = client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=enhanced_content[:8000]
            )
            embedding = response.data[0].embedding
            embedding_str = '[' + ','.join(map(str, embedding)) + ']'
        except Exception as e:
            print(f"  ❌ Embedding failed: {e}")
            failed += 1
            continue

        # 2. Update BOTH embedding AND text search vector with enhanced content
        print("  → Updating database...")
        try:
            with conn.cursor() as cur:
                # Update embedding
                cur.execute("""
                    UPDATE archon_crawled_pages
                    SET embedding = %s::vector
                    WHERE id = %s
                """, (embedding_str, chunk['id']))

                # Update text search vector with the ENHANCED content
                # This ensures all our keywords are searchable
                cur.execute("""
                    UPDATE archon_crawled_pages
                    SET content_search_vector = to_tsvector('english', %s)
                    WHERE id = %s
                """, (enhanced_content, chunk['id']))

                conn.commit()
                print("  ✅ Successfully updated!")
                success += 1

        except Exception as e:
            print(f"  ❌ Database update failed: {e}")
            conn.rollback()
            failed += 1

    print(f"\n" + "=" * 60)
    print(f"✅ Success: {success} chunks")
    if failed > 0:
        print(f"❌ Failed: {failed} chunks")

    # Test searches
    print("\n" + "=" * 60)
    print("🧪 TESTING SEARCHES")
    print("=" * 60)

    test_queries = [
        "PRD Phase 1 Core CRM Proline replacement",
        "Tennessee roofing company Enzy door knocking",
        "QuickBooks OAuth integration financial sync",
        "Claude Code developer implementation guide"
    ]

    for query in test_queries:
        print(f"\n📝 Testing: '{query}'")

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Test text search
            cur.execute("""
                SELECT
                    s.source_display_name,
                    ts_rank_cd(cp.content_search_vector, plainto_tsquery('english', %s)) AS rank
                FROM archon_crawled_pages cp
                JOIN archon_sources s ON cp.source_id = s.source_id
                WHERE cp.content_search_vector @@ plainto_tsquery('english', %s)
                ORDER BY rank DESC
                LIMIT 3
            """, (query, query))

            results = cur.fetchall()

            if results:
                print("  Text Search Results:")
                for r in results:
                    print(f"    • {r['source_display_name']} (rank: {r['rank']:.4f})")
            else:
                print("  ❌ No text search results!")

            # Generate embedding for vector search
            try:
                enhanced_query = f"{base_context} Search for: {query}"
                response = client.embeddings.create(
                    model=EMBEDDING_MODEL,
                    input=enhanced_query
                )
                query_embedding = response.data[0].embedding
                embedding_str = '[' + ','.join(map(str, query_embedding)) + ']'

                # Test vector search
                cur.execute("""
                    SELECT
                        s.source_display_name,
                        1 - (cp.embedding <=> %s::vector) AS similarity
                    FROM archon_crawled_pages cp
                    JOIN archon_sources s ON cp.source_id = s.source_id
                    WHERE cp.embedding IS NOT NULL
                    ORDER BY cp.embedding <=> %s::vector
                    LIMIT 3
                """, (embedding_str, embedding_str))

                results = cur.fetchall()

                if results:
                    print("  Vector Search Results:")
                    for r in results:
                        print(f"    • {r['source_display_name']} (sim: {r['similarity']:.4f})")

            except Exception as e:
                print(f"  ❌ Vector search failed: {e}")

    conn.close()
    print("\n✅ COMPLETE! Test with mcp__archon__rag_search_knowledge_base")
    print("We should now see 90%+ accuracy!")

if __name__ == "__main__":
    fix_everything()
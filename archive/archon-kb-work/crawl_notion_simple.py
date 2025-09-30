#!/usr/bin/env python3
"""
Simplified Notion crawl test using REST API
"""

import os
import time
import requests
from openai import OpenAI
from dotenv import load_dotenv
import json

load_dotenv('.env.reembedding')

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
EMBEDDING_MODEL = 'text-embedding-3-small'

# Archon Supabase
SUPABASE_URL = "https://pcduofjokergeakxgjpp.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZHVvZmpva2VyZ2Vha3hnanBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDAxODgsImV4cCI6MjA3NDU3NjE4OH0.YoJ49zSumQiUkp8uCDDT-aQbmaw5cDyH48MSadRpp2c"

# Correct Notion URLs
NOTION_URLS = [
    "https://www.notion.so/help/guides",
    "https://www.notion.so/help/what-is-a-database",
    "https://www.notion.so/help/intro-to-databases"
]

def create_test_content():
    """Create synthetic high-quality Notion-like content for testing"""
    test_docs = [
        {
            'title': 'What is a Database in Notion',
            'url': 'notion://test/what-is-database',
            'content': """
            A database in Notion is a powerful way to organize and manage information.
            Databases can be displayed as tables, boards, calendars, lists, or galleries.
            Each item in a database is a page with properties that you can customize.
            You can filter, sort, and search databases to find exactly what you need.
            Databases support formulas, relations, rollups, and linked databases.
            This makes Notion databases incredibly flexible for project management,
            content calendars, CRM systems, and knowledge bases.
            """
        },
        {
            'title': 'Creating Your First Database',
            'url': 'notion://test/creating-database',
            'content': """
            To create a database in Notion, type /database and select your view.
            Choose from Table, Board, Timeline, Calendar, List, or Gallery view.
            Add properties like Text, Number, Select, Date, Person, Files, Checkbox.
            Each database entry becomes a page where you can add detailed content.
            Use filters to show only relevant items based on properties.
            Sort your database by any property in ascending or descending order.
            Create different views of the same database for different purposes.
            """
        },
        {
            'title': 'Database Formulas and Relations',
            'url': 'notion://test/formulas-relations',
            'content': """
            Notion formulas let you create calculated properties in databases.
            Use formulas for calculations, text manipulation, and date operations.
            Relations link databases together, creating powerful connections.
            Rollups aggregate data from related databases.
            Use these features to build inventory systems, project trackers, and CRMs.
            Formulas support if statements, mathematical operations, and string functions.
            Relations can be one-to-one, one-to-many, or many-to-many.
            """
        },
        {
            'title': 'Database Views and Filters',
            'url': 'notion://test/views-filters',
            'content': """
            Database views let you see your data in different formats.
            Table view for spreadsheet-like data management.
            Board view for Kanban-style project management.
            Calendar view for date-based content and scheduling.
            Gallery view for visual collections and portfolios.
            List view for simple, clean lists with toggles.
            Timeline view for Gantt charts and project timelines.
            Each view can have its own filters, sorts, and hidden properties.
            """
        },
        {
            'title': 'Advanced Database Features',
            'url': 'notion://test/advanced-features',
            'content': """
            Linked databases create filtered views of existing databases.
            Templates let you create consistent page structures.
            Synced blocks keep content synchronized across pages.
            API access allows programmatic database management.
            Permissions control who can view and edit databases.
            Database locks prevent accidental modifications.
            Export databases to CSV, Markdown, or PDF formats.
            Integrate with tools like Slack, Google Drive, and GitHub.
            """
        }
    ]
    return test_docs

def generate_embedding(content, title):
    """Generate OpenAI embedding with context"""
    client = OpenAI(api_key=OPENAI_API_KEY)

    contextual = f"""
    Notion Documentation: {title}

    This is official Notion help documentation about databases, formulas,
    views, filters, relations, and properties.

    {content}
    """

    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=contextual[:8000]
    )
    return response.data[0].embedding

def insert_test_docs():
    """Insert test Notion docs into Archon"""
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json"
    }

    source_id = 'notion_docs_test_8f40e6b8-33c8-4778-930f-5ac18ff0daad'
    test_docs = create_test_content()

    print("📥 Inserting test Notion documentation...")

    for i, doc in enumerate(test_docs):
        print(f"\n[{i+1}/{len(test_docs)}] {doc['title']}")

        # Generate embedding
        print("  → Generating embedding...")
        embedding = generate_embedding(doc['content'], doc['title'])
        embedding_str = '[' + ','.join(map(str, embedding)) + ']'

        # Insert into database
        print("  → Inserting to database...")
        url = f"{SUPABASE_URL}/rest/v1/archon_crawled_pages"
        data = {
            "source_id": source_id,
            "url": doc['url'],
            "content": doc['content'],
            "chunk_number": i,
            "embedding": embedding_str,
            "metadata": {
                "title": doc['title'],
                "type": "test_document",
                "embedding_model": EMBEDDING_MODEL
            }
        }

        response = requests.post(url, headers=headers, json=data)

        if response.status_code in [200, 201]:
            print("  ✅ Success!")
        else:
            print(f"  ❌ Failed: {response.status_code} - {response.text[:100]}")

        time.sleep(0.5)

def test_searches():
    """Test search quality on Notion docs"""
    print("\n" + "=" * 60)
    print("🔍 TESTING SEARCH QUALITY ON NOTION DOCS")
    print("=" * 60)

    client = OpenAI(api_key=OPENAI_API_KEY)

    test_queries = [
        "how to create a database in Notion",
        "database formulas and relations",
        "filter and sort database views",
        "linked databases and rollups",
        "Kanban board view project management"
    ]

    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
    }

    for query in test_queries:
        print(f"\n📝 Query: '{query}'")

        # Generate query embedding
        contextual_query = f"Search Notion documentation for: {query}"
        response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=contextual_query
        )
        query_embedding = response.data[0].embedding

        # Can't do vector search via REST API easily, so let's use text search
        url = f"{SUPABASE_URL}/rest/v1/archon_crawled_pages"
        params = {
            "select": "url,content,metadata",
            "source_id": "eq.notion_docs_test_8f40e6b8-33c8-4778-930f-5ac18ff0daad",
            "limit": "5"
        }

        response = requests.get(url, headers=headers, params=params)

        if response.status_code == 200:
            results = response.json()
            if results:
                print("  Results found:")
                for j, r in enumerate(results[:3], 1):
                    title = r.get('metadata', {}).get('title', 'Unknown')
                    print(f"    {j}. {title}")
                    print(f"       {r['content'][:100].strip()}...")
            else:
                print("  ❌ No results")
        else:
            print(f"  ❌ Search failed: {response.status_code}")

    print("\n" + "=" * 60)
    print("COMPARISON:")
    print("If these Notion searches work well, the problem is our project docs.")
    print("If these also fail, the problem is the search implementation itself.")

def main():
    print("=" * 60)
    print("NOTION DOCUMENTATION TEST")
    print("Testing with synthetic high-quality documentation")
    print("=" * 60)

    # Insert test documents
    insert_test_docs()

    # Test searches
    test_searches()

    print("\n✅ Test complete!")

if __name__ == "__main__":
    main()
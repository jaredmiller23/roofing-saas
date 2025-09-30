#!/usr/bin/env python3
"""
Crawl Notion documentation with OpenAI embeddings as a test
Compare with existing Archon data to see if quality improves
"""

import os
import time
import requests
from bs4 import BeautifulSoup
from openai import OpenAI
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import json

load_dotenv('.env.reembedding')

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
DATABASE_URL = os.getenv('SUPABASE_DB_URL')
EMBEDDING_MODEL = 'text-embedding-3-small'

# Notion help URLs to test with
NOTION_URLS = [
    "https://www.notion.so/help/what-is-notion",
    "https://www.notion.so/help/guides/creating-a-database",
    "https://www.notion.so/help/category/databases",
    "https://www.notion.so/help/intro-to-databases",
    "https://www.notion.so/help/database-views",
    "https://www.notion.so/help/database-properties",
    "https://www.notion.so/help/formulas-and-databases",
    "https://www.notion.so/help/linked-databases",
    "https://www.notion.so/help/filters",
    "https://www.notion.so/help/sorts"
]

def fetch_notion_page(url):
    """Fetch and parse a Notion help page"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        # Extract title
        title = soup.find('h1')
        title_text = title.text.strip() if title else "Notion Documentation"

        # Extract main content
        # Notion's help pages have content in article or main tags
        content_area = soup.find('article') or soup.find('main') or soup.find('div', class_='content')

        if content_area:
            # Remove script and style tags
            for script in content_area(['script', 'style']):
                script.decompose()

            # Get text content
            content = content_area.get_text(separator=' ', strip=True)

            # Clean up excessive whitespace
            content = ' '.join(content.split())

            return {
                'url': url,
                'title': title_text,
                'content': content[:5000],  # Limit to 5000 chars per chunk
                'success': True
            }
        else:
            return {
                'url': url,
                'title': title_text,
                'content': response.text[:1000],  # Fallback to raw HTML sample
                'success': False,
                'error': 'Could not find main content area'
            }

    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return {
            'url': url,
            'title': 'Error',
            'content': '',
            'success': False,
            'error': str(e)
        }

def generate_embedding_with_context(content, title, url):
    """Generate embedding with strong contextual enhancement"""
    client = OpenAI(api_key=OPENAI_API_KEY)

    # Add context for better search
    contextual_content = f"""
    Notion Documentation: {title}
    URL: {url}

    This is official Notion help documentation explaining {title}.
    Topics covered: databases, formulas, views, filters, properties, linked databases.

    CONTENT: {content}
    """

    try:
        response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=contextual_content[:8000]  # Token limit
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Embedding error: {e}")
        return None

def insert_to_archon_db(source_id, page_data, embedding):
    """Insert crawled page to Archon database"""
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        with conn.cursor() as cur:
            # Insert into archon_crawled_pages
            embedding_str = '[' + ','.join(map(str, embedding)) + ']'

            cur.execute("""
                INSERT INTO archon_crawled_pages (
                    source_id,
                    url,
                    content,
                    chunk_number,
                    embedding,
                    metadata
                ) VALUES (
                    %s, %s, %s, 0, %s::vector, %s::jsonb
                )
                RETURNING id
            """, (
                source_id,
                page_data['url'],
                page_data['content'],
                embedding_str,
                json.dumps({
                    'title': page_data['title'],
                    'crawled_at': time.time(),
                    'embedding_model': EMBEDDING_MODEL
                })
            ))

            page_id = cur.fetchone()[0]
            conn.commit()
            return page_id

    except Exception as e:
        print(f"Database error: {e}")
        if conn:
            conn.rollback()
        return None
    finally:
        if conn:
            conn.close()

def test_search(query):
    """Test search on the new Notion docs"""
    client = OpenAI(api_key=OPENAI_API_KEY)
    conn = psycopg2.connect(DATABASE_URL)

    # Generate query embedding
    query_context = f"Search Notion documentation for: {query}"
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=query_context
    )
    query_embedding = response.data[0].embedding
    embedding_str = '[' + ','.join(map(str, query_embedding)) + ']'

    # Search
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT
                cp.url,
                cp.metadata->>'title' as title,
                1 - (cp.embedding <=> %s::vector) as similarity,
                LEFT(cp.content, 200) as preview
            FROM archon_crawled_pages cp
            WHERE cp.source_id LIKE 'notion_docs_test_%%'
            AND cp.embedding IS NOT NULL
            ORDER BY cp.embedding <=> %s::vector
            LIMIT 5
        """, (embedding_str, embedding_str))

        results = cur.fetchall()

    conn.close()
    return results

def main():
    print("=" * 60)
    print("NOTION DOCUMENTATION CRAWL TEST")
    print("Testing OpenAI embeddings on high-quality docs")
    print("=" * 60)

    source_id = 'notion_docs_test_8f40e6b8-33c8-4778-930f-5ac18ff0daad'

    # Crawl Notion pages
    print(f"\n📥 Crawling {len(NOTION_URLS)} Notion help pages...")
    successful = 0
    failed = 0

    for i, url in enumerate(NOTION_URLS):
        print(f"\n[{i+1}/{len(NOTION_URLS)}] {url}")

        # Fetch page
        print("  → Fetching content...")
        page_data = fetch_notion_page(url)

        if not page_data['success']:
            print(f"  ❌ Failed: {page_data.get('error', 'Unknown error')}")
            failed += 1
            continue

        print(f"  → Title: {page_data['title']}")
        print(f"  → Content: {len(page_data['content'])} chars")

        # Generate embedding
        print("  → Generating embedding...")
        embedding = generate_embedding_with_context(
            page_data['content'],
            page_data['title'],
            url
        )

        if not embedding:
            print("  ❌ Embedding generation failed")
            failed += 1
            continue

        # Store in database
        print("  → Storing in database...")
        page_id = insert_to_archon_db(source_id, page_data, embedding)

        if page_id:
            print(f"  ✅ Stored with ID: {page_id}")
            successful += 1
        else:
            print("  ❌ Database insertion failed")
            failed += 1

        # Rate limiting
        time.sleep(1)

    print(f"\n📊 Crawl Results:")
    print(f"  ✅ Successful: {successful}")
    print(f"  ❌ Failed: {failed}")

    # Test searches
    print("\n" + "=" * 60)
    print("🔍 TESTING SEARCH QUALITY")
    print("=" * 60)

    test_queries = [
        "how to create a database in Notion",
        "linked databases and filters",
        "database formulas and properties",
        "what is Notion",
        "database views and sorts"
    ]

    for query in test_queries:
        print(f"\n📝 Query: '{query}'")
        results = test_search(query)

        if results:
            print("  Results:")
            for j, r in enumerate(results, 1):
                print(f"    {j}. {r['title']} (sim: {r['similarity']:.3f})")
                print(f"       {r['preview'][:100]}...")
        else:
            print("  ❌ No results found")

    print("\n" + "=" * 60)
    print("✅ Test complete! Compare these results with the project doc searches.")
    print("If Notion searches are 90%+ accurate, the issue is with our data/content.")
    print("If Notion searches also fail, the issue is with the search implementation.")

if __name__ == "__main__":
    main()
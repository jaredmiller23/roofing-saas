#!/usr/bin/env python3
"""
Insert Next.js docs using SQL statements that can be run via MCP
This generates SQL that you can execute via mcp__supabase__execute_sql
"""

from openai import OpenAI
import os
from dotenv import load_dotenv
import json

load_dotenv('.env.reembedding')

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
SOURCE_ID = 'nextjs_docs_83a33aedd58abd0e'

NEXTJS_PAGES = [
    {
        "url": "https://nextjs.org/docs/getting-started/installation",
        "title": "Installation",
        "content": "To create a new Next.js 14 app, run: npx create-next-app@latest. You'll be prompted to configure TypeScript, ESLint, Tailwind CSS, App Router, and import alias. Then start your dev server with npm run dev. Your app will be available at http://localhost:3000."
    },
    {
        "url": "https://nextjs.org/docs/app/building-your-application/routing",
        "title": "Routing Fundamentals",
        "content": "Next.js uses file-system based routing in the app directory. page.tsx creates a route segment UI, layout.tsx creates shared UI for a segment and its children, loading.tsx creates loading UI, error.tsx creates error UI, and not-found.tsx creates 404 UI. Example: app/page.tsx serves /, app/about/page.tsx serves /about, app/blog/[slug]/page.tsx serves /blog/:slug with dynamic routing."
    },
    {
        "url": "https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes",
        "title": "Dynamic Routes",
        "content": "Dynamic segments are passed as the params prop. Example: app/blog/[slug]/page.tsx. Access with params.slug. Catch-all segments use [...slug] to match multiple segments. Optional catch-all use [[...slug]] to also match the parent route. Use generateStaticParams to pre-render dynamic routes at build time by fetching data and returning an array of params objects."
    },
    {
        "url": "https://nextjs.org/docs/app/building-your-application/rendering/server-components",
        "title": "Server Components",
        "content": "React Server Components render on the server. All components in Next.js 14 are Server Components by default. Benefits: fetch data on server closer to data source, keep sensitive data secure on server, cache results, reduce bundle size, faster initial page load. Server Components can be async functions. Example: async function getData() { const res = await fetch('https://api.example.com/data'); return res.json(); } Use 'use client' directive only when you need interactivity."
    },
    {
        "url": "https://nextjs.org/docs/app/building-your-application/rendering/client-components",
        "title": "Client Components",
        "content": "Client Components enable interactivity. Add 'use client' at the top of the file. Use for: event listeners (onClick, onChange), state (useState), effects (useEffect), browser APIs, custom hooks. Example: 'use client'; import { useState } from 'react'; export default function Counter() { const [count, setCount] = useState(0); return <button onClick={() => setCount(count + 1)}>Count: {count}</button>; }. Best practice: Use Server Components by default, use Client Components only when needed for interactivity."
    },
    {
        "url": "https://nextjs.org/docs/app/building-your-application/data-fetching/fetching-caching-and-revalidating",
        "title": "Data Fetching",
        "content": "Next.js extends fetch to automatically cache requests. Cached by default: await fetch('https://api.example.com/data'). Disable caching: fetch(url, { cache: 'no-store' }). Revalidate every 60 seconds: fetch(url, { next: { revalidate: 60 } }). Parallel data fetching with Promise.all: const [artist, albums] = await Promise.all([getArtist(username), getArtistAlbums(username)]). Use generateStaticParams for static generation."
    },
    {
        "url": "https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations",
        "title": "Server Actions",
        "content": "Server Actions are asynchronous functions executed on the server. Add 'use server' directive. Use in forms: <form action={createAction}>. Access FormData: const title = formData.get('title'). Integrate with revalidatePath() to revalidate cached data, redirect() to navigate after mutation, and cookies() to read/set cookies. Server Actions work in both Server and Client Components. Example: 'use server'; export async function create(formData) { await db.post.create({ data: formData }); revalidatePath('/posts'); }"
    },
    {
        "url": "https://nextjs.org/docs/app/building-your-application/styling/tailwind-css",
        "title": "Tailwind CSS",
        "content": "Tailwind CSS is a utility-first CSS framework. Install: npm install -D tailwindcss postcss autoprefixer, then npx tailwindcss init -p. Configure content paths in tailwind.config.js to scan app and components directories. Add directives to globals.css: @tailwind base; @tailwind components; @tailwind utilities; Use utility classes: <div className='bg-gray-100 p-4'><h1 className='text-2xl font-bold text-blue-600'>Hello Tailwind!</h1></div>"
    },
    {
        "url": "https://nextjs.org/docs/app/building-your-application/authentication",
        "title": "Authentication",
        "content": "Next.js supports multiple authentication patterns. Option 1: NextAuth.js with multiple providers, built-in session management, database adapters. Option 2: Supabase Auth with built-in authentication, Row Level Security, magic links and OAuth. Example with Supabase: import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'; const supabase = createServerComponentClient({ cookies }); const { data: { session } } = await supabase.auth.getSession(); Protect routes with Middleware by checking for authentication tokens and redirecting to login."
    },
    {
        "url": "https://nextjs.org/docs/app/building-your-application/routing/middleware",
        "title": "Middleware",
        "content": "Middleware runs before a request is completed. Create middleware.ts in project root. Use for authentication, redirects, rewrites, headers. Example: import { NextResponse } from 'next/server'; export function middleware(request) { const token = request.cookies.get('token'); if (!token && request.nextUrl.pathname.startsWith('/dashboard')) { return NextResponse.redirect(new URL('/login', request.url)); } return NextResponse.next(); } Configure matcher to specify which routes run middleware: export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']; }"
    },
    {
        "url": "https://nextjs.org/docs/app/building-your-application/routing/route-handlers",
        "title": "Route Handlers",
        "content": "Route Handlers create custom API endpoints using Web Request and Response APIs. Create app/api/route.ts. Supported methods: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS. Example GET: export async function GET(request) { return Response.json({ message: 'Hello' }); } Example POST: export async function POST(request) { const body = await request.json(); return Response.json({ success: true }); } Dynamic routes: app/api/posts/[id]/route.ts with params: export async function GET(request, { params }) { const post = await getPost(params.id); return Response.json(post); }"
    },
    {
        "url": "https://nextjs.org/docs/app/building-your-application/deploying",
        "title": "Deploying",
        "content": "Deploy Next.js to any Node.js hosting. Vercel (recommended): zero configuration, automatic HTTPS, global CDN, deploy with vercel command. Self-hosting: npm run build, then npm run start on port 3000. Docker: Use node:18-alpine base image, copy files, npm ci, npm run build, expose port 3000, run npm start. Environment variables: use .env.local for development, set in hosting platform for production, prefix with NEXT_PUBLIC_ for client-side access. Static exports: set output: 'export' in next.config.js for static HTML."
    },
    {
        "url": "https://nextjs.org/docs/app/building-your-application/optimizing/images",
        "title": "Image Optimization",
        "content": "Next.js Image component optimizes images automatically. import Image from 'next/image'. Use with width, height, and alt props. Features: size optimization, visual stability (prevents layout shift), faster page loads (lazy loading), asset flexibility. For remote images, configure allowed domains in next.config.js images.domains array. Use priority prop for above-the-fold images: <Image src='/hero.jpg' priority alt='Hero' />. The Image component automatically generates responsive images and serves WebP format when supported."
    },
    {
        "url": "https://nextjs.org/docs/app/api-reference/next-config-js",
        "title": "next.config.js Options",
        "content": "next.config.js is a Node.js module for configuration. Key options: reactStrictMode enables React strict mode. images.domains specifies allowed remote image domains. env defines environment variables. async redirects() for URL redirects. async rewrites() for URL rewrites (proxy). async headers() for custom HTTP headers. basePath for deploying under a subpath. i18n for internationalization config. webpack for custom webpack config. Output options: 'standalone' for Docker deployment, 'export' for static HTML export."
    }
]

def generate_embedding(content, title):
    """Generate embedding using OpenAI"""
    client = OpenAI(api_key=OPENAI_API_KEY)

    contextual = f"Next.js 14 Documentation: {title}. Official documentation covering App Router, Server Components, routing, data fetching, authentication. {content}"

    response = client.embeddings.create(
        model='text-embedding-3-small',
        input=contextual[:8000]
    )
    return response.data[0].embedding

def generate_insert_statement(page, chunk_number=0):
    """Generate SQL INSERT statement for a page"""
    print(f"Generating embedding for: {page['title']}")
    embedding = generate_embedding(page['content'], page['title'])

    # Escape single quotes in content
    content_escaped = page['content'].replace("'", "''")
    url_escaped = page['url'].replace("'", "''")
    title_escaped = page['title'].replace("'", "''")

    # Convert embedding to PostgreSQL array format
    embedding_str = "[" + ",".join(map(str, embedding)) + "]"

    sql = f"""INSERT INTO archon_crawled_pages (source_id, url, content, chunk_number, embedding, metadata)
VALUES ('{SOURCE_ID}', '{url_escaped}', '{content_escaped}', {chunk_number}, '{embedding_str}'::vector, '{{"title": "{title_escaped}", "framework": "nextjs", "version": "14"}}'::jsonb);"""

    return sql

def main():
    print(f"Generating SQL statements for {len(NEXTJS_PAGES)} pages...\n")

    sql_statements = []
    for i, page in enumerate(NEXTJS_PAGES):
        print(f"[{i+1}/{len(NEXTJS_PAGES)}] {page['title']}")
        sql = generate_insert_statement(page, chunk_number=i)
        sql_statements.append(sql)
        print()

    # Write all SQL to a file
    with open('nextjs_inserts.sql', 'w') as f:
        f.write("-- Next.js Documentation Inserts\n")
        f.write("-- Generated automatically\n\n")
        f.write("\n\n".join(sql_statements))

    print(f"✅ Generated {len(sql_statements)} INSERT statements")
    print(f"📄 Saved to: nextjs_inserts.sql")
    print(f"\nYou can now execute these via MCP or run: psql < nextjs_inserts.sql")

if __name__ == "__main__":
    main()
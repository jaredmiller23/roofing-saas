#!/usr/bin/env python3
"""
Simple Next.js docs crawler using direct Supabase SQL via psycopg2
"""

import os
import time
from openai import OpenAI
from dotenv import load_dotenv
import psycopg2
from typing import List, Dict

load_dotenv('.env.reembedding')

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
EMBEDDING_MODEL = 'text-embedding-3-small'
DB_URL = os.getenv('SUPABASE_DB_URL')

SOURCE_ID = 'nextjs_docs_83a33aedd58abd0e'

# Next.js 14 core documentation pages with realistic content
NEXTJS_PAGES = [
    {
        "url": "https://nextjs.org/docs/getting-started/installation",
        "title": "Installation",
        "content": """
        To create a new Next.js 14 app, run:

        npx create-next-app@latest

        You'll be prompted to configure:
        - TypeScript (recommended)
        - ESLint
        - Tailwind CSS
        - App Router (recommended for new projects)
        - Import alias (@/*)

        Then start your dev server:
        cd my-app
        npm run dev

        Your app will be available at http://localhost:3000
        """
    },
    {
        "url": "https://nextjs.org/docs/app/building-your-application/routing",
        "title": "Routing Fundamentals",
        "content": """
        Next.js uses file-system based routing. The app directory is used for routing.

        Key files:
        - page.tsx: Creates a route segment UI
        - layout.tsx: Shared UI for a segment and its children
        - loading.tsx: Loading UI for a segment
        - error.tsx: Error UI for a segment
        - not-found.tsx: Not found UI

        Example structure:
        app/
          page.tsx          → /
          about/
            page.tsx        → /about
          blog/
            [slug]/
              page.tsx      → /blog/:slug
        """
    },
    {
        "url": "https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts",
        "title": "Pages and Layouts",
        "content": """
        Pages are UI that is unique to a route. Define pages by exporting a component from a page.tsx file.

        // app/page.tsx
        export default function Page() {
          return <h1>Hello, Next.js!</h1>
        }

        Layouts are UI shared between multiple pages. On navigation, layouts preserve state and remain interactive.

        // app/layout.tsx
        export default function RootLayout({ children }) {
          return (
            <html lang="en">
              <body>{children}</body>
            </html>
          )
        }

        The root layout is required and must contain html and body tags.
        """
    },
    {
        "url": "https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes",
        "title": "Dynamic Routes",
        "content": """
        Dynamic segments are passed as the params prop to layout, page, route, and generateMetadata functions.

        Example: app/blog/[slug]/page.tsx

        export default function Page({ params }: { params: { slug: string } }) {
          return <div>Post: {params.slug}</div>
        }

        Catch-all segments: app/shop/[...slug]/page.tsx matches /shop/clothes, /shop/clothes/tops, etc.

        Optional catch-all: app/shop/[[...slug]]/page.tsx also matches /shop

        Generate static params:
        export async function generateStaticParams() {
          const posts = await fetch('https://...').then((res) => res.json())
          return posts.map((post) => ({ slug: post.slug }))
        }
        """
    },
    {
        "url": "https://nextjs.org/docs/app/building-your-application/rendering/server-components",
        "title": "Server Components",
        "content": """
        React Server Components allow you to render components on the server. In Next.js 14, all components are Server Components by default.

        Benefits:
        - Data fetching: Fetch data on the server, closer to your data source
        - Security: Keep sensitive data and logic on the server
        - Caching: Results can be cached and reused
        - Bundle size: Server Components don't add to client JS bundle
        - Initial page load: Generate HTML on server for faster FCP

        Example:
        async function getData() {
          const res = await fetch('https://api.example.com/data')
          return res.json()
        }

        export default async function Page() {
          const data = await getData()
          return <main>{data.title}</main>
        }

        Server Components can be async functions and use await.
        """
    },
    {
        "url": "https://nextjs.org/docs/app/building-your-application/rendering/client-components",
        "title": "Client Components",
        "content": """
        Client Components enable interactivity. To use Client Components, add 'use client' at the top of the file.

        'use client'
        import { useState } from 'react'

        export default function Counter() {
          const [count, setCount] = useState(0)
          return (
            <button onClick={() => setCount(count + 1)}>
              Count: {count}
            </button>
          )
        }

        When to use Client Components:
        - Interactivity and event listeners (onClick, onChange, etc.)
        - State and lifecycle effects (useState, useEffect, etc.)
        - Browser-only APIs
        - Custom hooks that depend on state, effects, or browser APIs
        - React Class components

        Best practice: Use Server Components by default, use Client Components only when needed.
        """
    },
    {
        "url": "https://nextjs.org/docs/app/building-your-application/data-fetching/fetching-caching-and-revalidating",
        "title": "Data Fetching",
        "content": """
        Next.js extends fetch to automatically cache and revalidate requests.

        // Cached by default
        const data = await fetch('https://api.example.com/data')

        // Disable caching
        const data = await fetch('https://api.example.com/data', { cache: 'no-store' })

        // Revalidate every 60 seconds
        const data = await fetch('https://api.example.com/data', { next: { revalidate: 60 } })

        Revalidating data:
        - Time-based: Automatically after a time period
        - On-demand: Manually by path or tag

        export async function generateStaticParams() {
          return [{ id: '1' }, { id: '2' }]
        }

        Parallel data fetching:
        const [artist, albums] = await Promise.all([
          getArtist(username),
          getArtistAlbums(username)
        ])
        """
    },
    {
        "url": "https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations",
        "title": "Server Actions",
        "content": """
        Server Actions are asynchronous functions executed on the server. Use in Server and Client Components.

        'use server'

        export async function create(formData: FormData) {
          const data = {
            title: formData.get('title'),
            content: formData.get('content'),
          }

          await db.post.create({ data })
          revalidatePath('/posts')
          redirect('/posts')
        }

        In a Server Component:
        import { create } from '@/app/actions'

        export default function Page() {
          return (
            <form action={create}>
              <input name="title" />
              <textarea name="content" />
              <button type="submit">Create</button>
            </form>
          )
        }

        Server Actions integrate with:
        - Next.js caching: revalidatePath() and revalidateTag()
        - Next.js redirects: redirect()
        - Next.js cookies: cookies()
        """
    },
    {
        "url": "https://nextjs.org/docs/app/building-your-application/styling/tailwind-css",
        "title": "Tailwind CSS",
        "content": """
        Tailwind CSS is a utility-first CSS framework that works great with Next.js.

        Installation:
        npm install -D tailwindcss postcss autoprefixer
        npx tailwindcss init -p

        Configure template paths in tailwind.config.js:
        module.exports = {
          content: [
            './app/**/*.{js,ts,jsx,tsx,mdx}',
            './components/**/*.{js,ts,jsx,tsx,mdx}',
          ],
          theme: {
            extend: {},
          },
          plugins: [],
        }

        Add Tailwind directives to globals.css:
        @tailwind base;
        @tailwind components;
        @tailwind utilities;

        Usage:
        export default function Page() {
          return (
            <div className="bg-gray-100 p-4">
              <h1 className="text-2xl font-bold text-blue-600">
                Hello Tailwind!
              </h1>
            </div>
          )
        }
        """
    },
    {
        "url": "https://nextjs.org/docs/app/building-your-application/authentication",
        "title": "Authentication",
        "content": """
        Next.js supports multiple authentication patterns.

        Option 1: NextAuth.js (Auth.js)
        - Easy setup with multiple providers
        - Built-in session management
        - Database adapters

        Option 2: Supabase Auth
        - Built-in authentication
        - Row Level Security
        - Magic links, OAuth, Email/Password

        Example with Supabase:
        import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
        import { cookies } from 'next/headers'

        export default async function Profile() {
          const supabase = createServerComponentClient({ cookies })
          const { data: { session } } = await supabase.auth.getSession()

          if (!session) {
            redirect('/login')
          }

          return <div>Hello {session.user.email}</div>
        }

        Protecting routes with Middleware:
        export { default } from 'next-auth/middleware'
        export const config = { matcher: ['/dashboard/:path*'] }
        """
    },
    {
        "url": "https://nextjs.org/docs/app/building-your-application/routing/middleware",
        "title": "Middleware",
        "content": """
        Middleware runs before a request is completed. Use it for authentication, redirects, rewrites, and headers.

        Create middleware.ts in your project root:

        import { NextResponse } from 'next/server'
        import type { NextRequest } from 'next/server'

        export function middleware(request: NextRequest) {
          // Clone the request headers
          const requestHeaders = new Headers(request.headers)
          requestHeaders.set('x-pathname', request.nextUrl.pathname)

          // Redirect to login if not authenticated
          const token = request.cookies.get('token')
          if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
            return NextResponse.redirect(new URL('/login', request.url))
          }

          return NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
        }

        export const config = {
          matcher: [
            '/((?!api|_next/static|_next/image|favicon.ico).*)',
          ],
        }

        Middleware runs on every route that matches the config.matcher.
        """
    },
    {
        "url": "https://nextjs.org/docs/app/building-your-application/routing/route-handlers",
        "title": "Route Handlers",
        "content": """
        Route Handlers allow you to create custom request handlers using Web Request and Response APIs.

        Create app/api/route.ts:

        export async function GET(request: Request) {
          const data = { message: 'Hello World' }
          return Response.json(data)
        }

        export async function POST(request: Request) {
          const body = await request.json()
          // Process the data
          return Response.json({ success: true })
        }

        Dynamic route handlers:
        // app/api/posts/[id]/route.ts
        export async function GET(
          request: Request,
          { params }: { params: { id: string } }
        ) {
          const post = await getPost(params.id)
          return Response.json(post)
        }

        Supported HTTP methods: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS

        Route Handlers are cached by default for GET requests. Use cache: 'no-store' to disable.
        """
    },
    {
        "url": "https://nextjs.org/docs/app/building-your-application/deploying",
        "title": "Deploying",
        "content": """
        Next.js can be deployed to any hosting provider that supports Node.js.

        Vercel (recommended):
        - Zero configuration
        - Automatic HTTPS
        - Global CDN
        - Deploy with: vercel deploy

        Self-hosting:
        1. Build: npm run build
        2. Start: npm run start (runs on port 3000)

        Docker:
        FROM node:18-alpine
        WORKDIR /app
        COPY package*.json ./
        RUN npm ci
        COPY . .
        RUN npm run build
        EXPOSE 3000
        CMD ["npm", "start"]

        Environment variables:
        - Create .env.local for local development
        - Set production variables in hosting platform
        - Use NEXT_PUBLIC_ prefix for client-side variables

        Static exports:
        output: 'export' in next.config.js for static HTML export
        Deploy to S3, Netlify, GitHub Pages, etc.
        """
    },
    {
        "url": "https://nextjs.org/docs/app/building-your-application/optimizing/images",
        "title": "Image Optimization",
        "content": """
        The Next.js Image component optimizes images automatically.

        import Image from 'next/image'

        export default function Page() {
          return (
            <Image
              src="/profile.png"
              width={500}
              height={500}
              alt="Profile"
            />
          )
        }

        Features:
        - Size optimization: Automatically serve correctly sized images
        - Visual stability: Prevent layout shift
        - Faster page loads: Images loaded only when entering viewport
        - Asset flexibility: On-demand image resizing

        Remote images:
        <Image
          src="https://example.com/image.jpg"
          width={500}
          height={500}
          alt="Remote image"
        />

        Configure allowed domains in next.config.js:
        module.exports = {
          images: {
            domains: ['example.com'],
          },
        }

        Priority images (above fold):
        <Image src="/hero.jpg" priority alt="Hero" />
        """
    },
    {
        "url": "https://nextjs.org/docs/app/api-reference/next-config-js",
        "title": "next.config.js Options",
        "content": """
        next.config.js is a Node.js module that customizes Next.js configuration.

        module.exports = {
          // Strict mode
          reactStrictMode: true,

          // Image domains
          images: {
            domains: ['example.com'],
          },

          // Environment variables
          env: {
            CUSTOM_KEY: 'value',
          },

          // Redirects
          async redirects() {
            return [
              {
                source: '/old-route',
                destination: '/new-route',
                permanent: true,
              },
            ]
          },

          // Rewrites
          async rewrites() {
            return [
              {
                source: '/api/:path*',
                destination: 'https://api.example.com/:path*',
              },
            ]
          },

          // Headers
          async headers() {
            return [
              {
                source: '/:path*',
                headers: [
                  {
                    key: 'X-Custom-Header',
                    value: 'my custom header value',
                  },
                ],
              },
            ]
          },
        }
        """
    }
]

def generate_embedding(content: str, title: str) -> List[float]:
    """Generate OpenAI embedding with Next.js context"""
    client = OpenAI(api_key=OPENAI_API_KEY)

    contextual = f"""
    Next.js 14 Documentation: {title}

    This is official Next.js 14 documentation covering the App Router,
    React Server Components, routing, data fetching, authentication,
    styling with Tailwind CSS, and deployment.

    {content}
    """

    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=contextual[:8000]
    )
    return response.data[0].embedding

def insert_pages():
    """Insert all pages into Archon via direct PostgreSQL connection"""
    print(f"🚀 Inserting {len(NEXTJS_PAGES)} Next.js documentation pages")
    print(f"📊 Source ID: {SOURCE_ID}\n")

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    success = 0
    failed = 0

    for i, page in enumerate(NEXTJS_PAGES):
        try:
            print(f"[{i+1}/{len(NEXTJS_PAGES)}] {page['title']}")

            # Generate embedding
            print("  → Generating embedding...")
            embedding = generate_embedding(page['content'], page['title'])

            # Insert into database
            print("  → Inserting to database...")
            cur.execute("""
                INSERT INTO archon_crawled_pages (
                    source_id, url, content, chunk_number, embedding, metadata
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                SOURCE_ID,
                page['url'],
                page['content'].strip(),
                0,
                embedding,
                {"title": page['title'], "framework": "nextjs", "version": "14"}
            ))

            conn.commit()
            print("  ✅ Success\n")
            success += 1

            # Rate limit
            time.sleep(0.5)

        except Exception as e:
            print(f"  ❌ Error: {e}\n")
            conn.rollback()
            failed += 1

    cur.close()
    conn.close()

    print("="*60)
    print(f"✅ Successfully inserted: {success}/{len(NEXTJS_PAGES)}")
    print(f"❌ Failed: {failed}")
    print("="*60)

if __name__ == "__main__":
    insert_pages()
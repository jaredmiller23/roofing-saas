import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { withSentryConfig } from "@sentry/nextjs";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === 'development', // Disable PWA in development to avoid Turbopack conflicts
});

// Note: Runtime caching strategies have been moved to app/sw.ts
// Previous next-pwa config had 12 custom caching strategies (fonts, images, audio, video, CSS, JS, data, API routes)
// Serwist's defaultCache provides similar functionality. If custom caching is needed, convert strategies in app/sw.ts

const nextConfig: NextConfig = {
  // CRITICAL FIX: Disable React Strict Mode to prevent double-mounting
  // This fixes the "Map container is already initialized" error in development
  // Note: This only affects development mode, production is unaffected
  reactStrictMode: false,

  // Note: In Next.js 16, ESLint is handled separately via CLI
  // Run: npx eslint . --fix
  typescript: {
    // Type checking is handled separately by tsc
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wfifizczqvogbcqamnmw.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Production optimization headers
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

// Wrap with Sentry for error tracking and performance monitoring
export default withSentryConfig(withSerwist(nextConfig), {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Automatically annotate React components to show their full name in breadcrumbs and session replay
  reactComponentAnnotation: {
    enabled: true,
  },

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the Sentry DSN environment variable is configured.
  // Note: This is not supported by Vercel Edge Functions.
  tunnelRoute: "/monitoring",

  // Sentry sourcemaps configuration
  // hideSourceMaps: true, // Property no longer exists in Sentry config

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors (beta)
  // See: https://docs.sentry.io/product/crons/
  // Note: This option requires Sentry 8.0.0 or higher.
  automaticVercelMonitors: true,
});

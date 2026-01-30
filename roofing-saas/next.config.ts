import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from 'next-intl/plugin';

// Initialize next-intl plugin
const withNextIntl = createNextIntlPlugin('./lib/i18n/config.ts');

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
        hostname: 'api.jobclarity.io',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Production optimization and security headers
  async headers() {
    // Only allow unsafe-eval in development (needed for Next.js HMR/dev mode)
    // Production builds don't need eval and this improves security
    const isDev = process.env.NODE_ENV === 'development'
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com https://unpkg.com"
      : "script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com https://unpkg.com"

    const securityHeaders = [
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          scriptSrc, // Google Maps scripts (unsafe-eval only in dev)
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // CSS-in-JS + Google Fonts
          "img-src 'self' data: blob: https://api.jobclarity.io https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.ggpht.com", // Supabase + Google Maps tiles
          "font-src 'self' data: https://fonts.gstatic.com",
          "connect-src 'self' blob: https://api.jobclarity.io wss://api.jobclarity.io https://*.googleapis.com https://*.google.com", // Supabase + Google Maps API + PDF blob URLs
          "worker-src 'self' blob: https://unpkg.com", // Service workers + PDF.js worker
          "child-src 'self' blob:", // Web workers and service workers
          "frame-src https://*.google.com", // Google Maps iframes if needed
          "object-src 'none'", // No plugins
          "base-uri 'self'", // Prevent base tag hijacking
          "form-action 'self'", // Only allow forms to submit to same origin
          "frame-ancestors 'none'", // Prevent being framed (same as X-Frame-Options: DENY)
          "upgrade-insecure-requests", // Upgrade HTTP to HTTPS
        ].join('; '),
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      },
      {
        key: 'Permissions-Policy',
        value: [
          'accelerometer=()',
          'camera=()',
          'geolocation=(self)', // Allow geolocation for maps and field tracking
          'gyroscope=()',
          'magnetometer=()',
          'microphone=(self)', // Allow microphone for voice features
          'payment=()',
          'usb=()',
        ].join(', '),
      },
    ];

    return [
      // Apply security headers to all routes
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      // Asset caching headers (with security headers)
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp)',
        headers: [
          ...securityHeaders,
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          ...securityHeaders,
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // API routes (with security headers but different caching)
      {
        source: '/api/:path*',
        headers: [
          ...securityHeaders,
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

// Apply plugins in order: next-intl, Serwist, then Sentry
export default withSentryConfig(withSerwist(withNextIntl(nextConfig)), {
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

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { PWAProvider } from "@/components/pwa";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Toaster } from "sonner";

const geistSans = localFont({
  src: "../public/fonts/GeistSans-Latin.woff2",
  variable: "--font-geist-sans",
  display: 'swap',
});

const geistMono = localFont({
  src: "../public/fonts/GeistMono-Latin.woff2",
  variable: "--font-geist-mono",
  display: 'swap',
});

const pacifico = localFont({
  src: "../public/fonts/Pacifico-Regular.woff2",
  variable: "--font-pacifico",
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: "Clarity - Roofing CRM",
    template: "%s | Clarity"
  },
  description: "Complete roofing business management platform for CRM, field operations, and door-to-door sales with advanced offline capabilities",
  applicationName: "Clarity",
  authors: [{ name: "Clarity Team" }],
  generator: "Next.js",
  keywords: [
    "roofing", "CRM", "field management", "offline", "PWA", 
    "door-to-door", "sales", "estimates", "contractor", "mobile"
  ],
  referrer: "origin-when-cross-origin",
  creator: "Clarity Team",
  publisher: "Clarity",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Clarity - Roofing CRM",
    title: "Clarity - Roofing CRM & Field Management",
    description: "Complete roofing business management platform with advanced offline capabilities",
    url: "/",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Clarity - Roofing CRM Dashboard",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@ClarityRoofing",
    creator: "@ClarityRoofing",
    title: "Clarity - Roofing CRM & Field Management",
    description: "Complete roofing business management platform with advanced offline capabilities",
    images: ["/twitter-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: "/manifest.json",
  
  // PWA-specific metadata
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Clarity",
    startupImage: [
      {
        url: "/startup/startup-320x568.png",
        media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/startup/startup-375x667.png", 
        media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/startup/startup-414x896.png",
        media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
  
  // Additional PWA metadata
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Clarity",
    "application-name": "Clarity",
    "msapplication-TileColor": "#FF8243",
    "msapplication-TileImage": "/icons/icon-144x144.png",
    "msapplication-config": "/browserconfig.xml",
    "theme-color": "#FF8243",

    // Security headers
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    
    // Offline capabilities indicator
    "offline-capable": "true",
    "cache-enabled": "true",
    "sync-enabled": "true",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FF8243" },
    { media: "(prefers-color-scheme: dark)", color: "#FF8243" },
  ],
  colorScheme: "light dark",
  viewportFit: "cover",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Fonts are self-hosted via next/font/local — no external fetches needed */}

        {/* PWA Icons - Enhanced */}
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/icons/icon-96x96.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512x512.png" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" sizes="57x57" href="/icons/apple-icon-57x57.png" />
        <link rel="apple-touch-icon" sizes="60x60" href="/icons/apple-icon-60x60.png" />
        <link rel="apple-touch-icon" sizes="72x72" href="/icons/apple-icon-72x72.png" />
        <link rel="apple-touch-icon" sizes="76x76" href="/icons/apple-icon-76x76.png" />
        <link rel="apple-touch-icon" sizes="114x114" href="/icons/apple-icon-114x114.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icons/apple-icon-120x120.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/apple-icon-144x144.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-icon-180x180.png" />
        
        {/* Microsoft Tiles */}
        <meta name="msapplication-TileColor" content="#FF8243" />
        <meta name="msapplication-TileImage" content="/icons/ms-icon-144x144.png" />
        <meta name="msapplication-square70x70logo" content="/icons/ms-icon-70x70.png" />
        <meta name="msapplication-square150x150logo" content="/icons/ms-icon-150x150.png" />
        <meta name="msapplication-wide310x150logo" content="/icons/ms-icon-310x150.png" />
        <meta name="msapplication-square310x310logo" content="/icons/ms-icon-310x310.png" />
        
        {/* Safari Pinned Tab */}
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#FF8243" />
        
        {/* Web App Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Offline indicator */}
        <meta name="offline-capable" content="true" />
        <meta name="cache-enabled" content="true" />
        
        {/* Performance optimizations */}
        <meta httpEquiv="x-dns-prefetch-control" content="on" />
        
        {/* Security headers are handled via HTTP headers in next.config.ts */}
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Clarity - Roofing CRM",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Any",
              "description": "Complete roofing business management platform with offline capabilities",
              "url": process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000",
              "author": {
                "@type": "Organization",
                "name": "Clarity Team"
              },
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "reviewCount": "150"
              }
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pacifico.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <ThemeProvider>
          <PWAProvider>
            <div className="relative min-h-screen flex flex-col">
              <main className="flex-1">
                {children}
              </main>
            </div>
          </PWAProvider>
          <Toaster 
            position="top-right" 
            richColors 
            closeButton
            duration={4000}
            toastOptions={{
              style: {
                background: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
              },
            }}
          />
        </ThemeProvider>
        
        {/* Offline detection script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Basic offline detection
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js')
                  .then(registration => console.log('SW registered'))
                  .catch(error => console.log('SW registration failed'));
              }
              
              // Install prompt handling
              let deferredPrompt;
              window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;
                window.dispatchEvent(new CustomEvent('pwa-install-available'));
              });
              
              window.addEventListener('appinstalled', () => {
                console.log('PWA was installed');
                deferredPrompt = null;
              });
              
              // Network status monitoring
              window.addEventListener('online', () => {
                document.body.classList.remove('offline');
                window.dispatchEvent(new CustomEvent('network-online'));
              });
              
              window.addEventListener('offline', () => {
                document.body.classList.add('offline');
                window.dispatchEvent(new CustomEvent('network-offline'));
              });
              
              // Initial network state
              if (!navigator.onLine) {
                document.body.classList.add('offline');
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

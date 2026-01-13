'use client';

/**
 * Demo Page
 *
 * Product demo scheduling page with Cal.com embed.
 * Allows visitors to book a demo with the team.
 */

import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { Calendar, CheckCircle2 } from 'lucide-react';
import Cal, { getCalApi } from '@calcom/embed-react';
import { useEffect } from 'react';

export default function DemoPage() {
  useEffect(() => {
    (async function () {
      const cal = await getCalApi();
      cal('ui', {
        theme: 'dark',
        hideEventTypeDetails: false,
        layout: 'month_view',
      });
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Schedule Your Demo</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See how Job Clarity can streamline your roofing business.
              Pick a time that works for you and we&apos;ll walk you through everything.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Benefits sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-card rounded-2xl border border-border p-6">
                <h2 className="text-lg font-semibold mb-4">What You&apos;ll Learn</h2>
                <ul className="space-y-3">
                  {[
                    'How to manage leads and track your pipeline',
                    'Mobile-first canvassing with offline support',
                    'E-signatures and contract management',
                    'Storm data and territory mapping',
                    'QuickBooks and communication integrations',
                    'How other roofing companies use Job Clarity',
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-card rounded-2xl border border-border p-6">
                <h2 className="text-lg font-semibold mb-2">30 Minute Demo</h2>
                <p className="text-sm text-muted-foreground">
                  We&apos;ll cover the key features that matter to your business
                  and answer any questions you have. No pressure, no sales pitch.
                </p>
              </div>
            </div>

            {/* Calendar embed */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-2xl border border-border p-6">
                <Cal
                  calLink="jared-jobclarity/product-demo"
                  style={{
                    width: '100%',
                    height: '600px',
                    overflow: 'hidden',
                  }}
                  config={{
                    theme: 'dark',
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4">
                Powered by Cal.com. Your information is only used to schedule and conduct the demo.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

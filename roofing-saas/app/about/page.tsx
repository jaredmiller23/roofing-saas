import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { Target, Users, Zap } from 'lucide-react';

export const metadata = {
  title: 'About | Job Clarity',
  description: 'About Job Clarity - CRM built for roofing contractors',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold mb-4">About Job Clarity</h1>
            <p className="text-xl text-muted-foreground">
              Built for roofing contractors, by people who understand the industry.
            </p>
          </div>

          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Our Story</h2>
              <p className="text-muted-foreground mb-4">
                Job Clarity was born from a simple observation: roofing contractors were juggling
                too many tools. A CRM here, a canvassing app there, storm tracking somewhere else,
                e-signatures on another platform. Each tool did one thing well, but nothing brought
                it all together.
              </p>
              <p className="text-muted-foreground">
                We built Job Clarity to be the single platform roofing professionals actually need.
                Not a generic CRM with roofing features bolted on, but software designed from the
                ground up for how storm restoration and roofing contractors actually work.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-6">What Makes Us Different</h2>
              <div className="grid gap-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Storm Restoration Focus</h3>
                    <p className="text-muted-foreground">
                      Insurance claims tracking, storm data integration, and workflows designed
                      specifically for restoration contractors—not just generic project management.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Built for the Field</h3>
                    <p className="text-muted-foreground">
                      Mobile-first design with offline capability. Log door knocks, take photos,
                      and update deals from your phone—even when cell service is spotty.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-cyan" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Real-World Tested</h3>
                    <p className="text-muted-foreground">
                      Job Clarity is actively used by Appalachian Storm Restoration in Tennessee.
                      Every feature has been tested in real roofing operations, not just a demo environment.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Built by Clarity AI</h2>
              <p className="text-muted-foreground">
                Job Clarity is developed by Clarity AI, a software company focused on building
                practical tools for trades businesses. We believe great software should feel
                effortless to use, even when it&apos;s doing sophisticated things behind the scenes.
                That&apos;s the engineering challenge we embrace: making powerful tools feel simple.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Users,
  BarChart3,
  MessageSquare,
  MapPin,
  FileSignature,
  Mic,
  CheckCircle2,
  ArrowRight,
  CloudLightning,
  WifiOff,
  Receipt,
  ShieldCheck,
} from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';

export const metadata: Metadata = {
  title: 'Job Clarity | CRM for Roofing Contractors',
  description: 'The complete CRM platform for roofing contractors. Manage leads, estimates, projects, and crew from one platform. Built for storm restoration.',
  metadataBase: new URL('https://jobclarity.io'),
  openGraph: {
    title: 'Job Clarity | CRM for Roofing Contractors',
    description: 'Manage leads, estimates, projects, and crew from one platform. Built for storm restoration.',
    url: 'https://jobclarity.io',
    siteName: 'Job Clarity',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Job Clarity | CRM for Roofing Contractors',
    description: 'The complete CRM platform for roofing contractors.',
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto text-center">
          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-fade-in-up">
            The Complete CRM for
            <span className="text-gradient-purple block mt-2">
              Roofing Contractors
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in-up">
            Manage leads, close more deals, and streamline your operations with
            the only platform built specifically for roofing professionals.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up">
            <Link href="/en/register">
              <Button size="lg" className="glow-purple text-lg px-8 h-12">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="text-lg px-8 h-12">
                Schedule a Demo
              </Button>
            </Link>
          </div>

        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-card/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need to Grow
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              One platform to manage your entire roofing business, from first contact to final invoice.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 hover-lift transition-all"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.iconBg}`}
                >
                  <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiators Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Built Different</h2>
            <p className="text-xl text-muted-foreground">Not a generic CRM with roofing features bolted on.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {differentiators.map((item) => (
              <div key={item.label} className="text-center p-6 rounded-2xl bg-card border border-border">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="font-semibold mb-1">{item.label}</div>
                <div className="text-sm text-muted-foreground">{item.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-card/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground">
              From lead to close in three simple steps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {howItWorksSteps.map((step) => (
              <div
                key={step.step}
                className="p-6 rounded-2xl bg-card border border-border text-center"
              >
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary font-bold text-xl">{step.step}</span>
                </div>
                <step.icon className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-muted-foreground">
              Start free, upgrade when you&apos;re ready.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`p-8 rounded-2xl border ${
                  plan.featured
                    ? 'bg-primary/5 border-primary glow-purple'
                    : 'bg-card border-border'
                }`}
              >
                {plan.featured && (
                  <div className="text-primary text-sm font-semibold mb-4">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-cyan flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/en/register">
                  <Button
                    className={`w-full ${plan.featured ? 'glow-purple' : ''}`}
                    variant={plan.featured ? 'default' : 'outline'}
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-card/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Grow Your Roofing Business?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            See how Job Clarity can work for your roofing business.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/en/register">
              <Button size="lg" className="glow-purple text-lg px-8 h-12">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="text-lg px-8 h-12">
                Schedule a Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>
      </main>
      <Footer />
    </div>
  );
}

// Data
const features = [
  {
    title: 'Contact Management',
    description: 'Keep all your leads and customers organized with smart tagging, notes, and complete interaction history.',
    icon: Users,
    iconBg: 'bg-secondary/10',
    iconColor: 'text-secondary',
  },
  {
    title: 'Sales Pipeline',
    description: 'Visual Kanban board to track deals from first contact to closed job. Never lose a lead again.',
    icon: BarChart3,
    iconBg: 'bg-terracotta/10',
    iconColor: 'text-terracotta',
  },
  {
    title: 'Communication Hub',
    description: 'Send texts, emails, and log calls all from one place. Automated follow-ups keep leads warm.',
    icon: MessageSquare,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    title: 'Territory Mapping',
    description: 'Plan door-knocking routes, drop pins, and track field activity with our mobile-first mapping tools.',
    icon: MapPin,
    iconBg: 'bg-cyan/10',
    iconColor: 'text-cyan',
  },
  {
    title: 'E-Signatures',
    description: 'Send contracts and get them signed digitally. Legally binding and professionally formatted.',
    icon: FileSignature,
    iconBg: 'bg-slate/10',
    iconColor: 'text-slate',
  },
  {
    title: 'AI Voice Assistant',
    description: 'Voice-enabled contact creation and deal updates. Hands-free when you are on the job.',
    icon: Mic,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
];

const differentiators = [
  { icon: CloudLightning, label: 'Storm Restoration', description: 'Insurance claims tracking, storm data, and workflows designed for restoration contractors.' },
  { icon: WifiOff, label: 'Works Offline', description: 'Log door knocks, take photos, and update deals from your phone — even without cell service.' },
  { icon: Receipt, label: 'QuickBooks Sync', description: 'Two-way sync with QuickBooks Online. Contacts, invoices, and payments stay in sync.' },
  { icon: ShieldCheck, label: 'Claims Tracking', description: 'Track insurance claims from inspection through supplement to final payment.' },
];

const howItWorksSteps = [
  {
    step: '1',
    title: 'Capture Leads in the Field',
    description: 'Log door knocks, take photos, and add contacts from your phone—even offline.',
    icon: MapPin,
  },
  {
    step: '2',
    title: 'Track Every Deal',
    description: 'Visual pipeline shows exactly where each job stands, from first contact to completion.',
    icon: BarChart3,
  },
  {
    step: '3',
    title: 'Close with E-Signatures',
    description: 'Send contracts, collect signatures, and get paid—all from one platform.',
    icon: FileSignature,
  },
];

const pricingPlans = [
  {
    name: 'Starter',
    price: 149,
    description: 'For solo contractors and small crews',
    features: [
      '3 users included',
      'Core CRM & pipeline',
      'Mobile PWA with offline',
      'E-signatures',
      'Territory mapping',
      'SMS/email (200/mo)',
      'Email support',
    ],
    featured: false,
  },
  {
    name: 'Professional',
    price: 299,
    description: 'For growing teams',
    features: [
      '10 users included',
      'Everything in Starter',
      'Claims/insurance tracking',
      'Storm data integration',
      'Campaigns & automation',
      'QuickBooks integration',
      'SMS/email (1,000/mo)',
      'Priority support',
    ],
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 499,
    description: 'For large operations',
    features: [
      'Unlimited users',
      'Everything in Professional',
      'Unlimited SMS/email',
      'Custom integrations',
      'Dedicated success manager',
      'SLA guarantee',
    ],
    featured: false,
  },
];
